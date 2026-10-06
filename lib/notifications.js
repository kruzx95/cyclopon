const fetch = require('node-fetch');
const db = require('../db/database');

/**
 * Escape HTML special characters for Telegram HTML mode
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Retrieve active notification configuration (DB settings take precedence, fallback to process.env)
 */
function getConfig() {
  const getVal = (key, envKey) => {
    try {
      const row = db.getSetting.get(key);
      if (row && row.value !== undefined && row.value !== null && row.value !== '') {
        return row.value;
      }
    } catch {}
    return process.env[envKey] || '';
  };

  const notifySosVal = getVal('notify_sos', 'NOTIF_SOS_ENABLED');
  const notifyCotVal = getVal('notify_cot', 'NOTIF_COT_ENABLED');

  return {
    telegramToken:  getVal('telegram_bot_token', 'TELEGRAM_BOT_TOKEN'),
    telegramChatId: getVal('telegram_chat_id', 'TELEGRAM_CHAT_ID'),
    webhookUrl:     getVal('webhook_url', 'WEBHOOK_URL'),
    notifySos:      notifySosVal === '' || notifySosVal === 'true' || notifySosVal === '1',
    notifyCot:      notifyCotVal === '' || notifyCotVal === 'true' || notifyCotVal === '1'
  };
}

/**
 * Save notification configuration to database
 */
function saveConfig(cfg) {
  if (cfg.telegramToken !== undefined) {
    db.setSetting.run('telegram_bot_token', String(cfg.telegramToken).trim());
  }
  if (cfg.telegramChatId !== undefined) {
    db.setSetting.run('telegram_chat_id', String(cfg.telegramChatId).trim());
  }
  if (cfg.webhookUrl !== undefined) {
    db.setSetting.run('webhook_url', String(cfg.webhookUrl).trim());
  }
  if (cfg.notifySos !== undefined) {
    db.setSetting.run('notify_sos', cfg.notifySos ? 'true' : 'false');
  }
  if (cfg.notifyCot !== undefined) {
    db.setSetting.run('notify_cot', cfg.notifyCot ? 'true' : 'false');
  }
}

/**
 * Send an HTML formatted message to Telegram Bot
 */
async function sendTelegramMessage(token, chatId, text) {
  let cleanToken = String(token || '').trim();
  if (cleanToken.toLowerCase().startsWith('bot')) {
    cleanToken = cleanToken.slice(3).trim();
  }

  let cleanChatId = String(chatId || '').trim();
  if (cleanChatId.startsWith('https://t.me/')) {
    const parts = cleanChatId.replace('https://t.me/', '').split('/')[0];
    if (parts && !parts.startsWith('+')) {
      cleanChatId = '@' + parts;
    }
  }

  if (!cleanToken || !cleanChatId) {
    return { success: false, error: 'Telegram Bot Token atau Chat ID belum dikonfigurasi' };
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      }),
      timeout: 8000
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      let desc = data.description || `HTTP error ${res.status}`;
      if (desc.includes('chat not found')) {
        desc = `Chat ID (${cleanChatId}) tidak ditemukan. Pastikan Anda sudah membuka bot di Telegram dan klik 'Start', atau tambahkan bot ke dalam grup.`;
      } else if (desc.includes('Unauthorized') || desc.includes('Not Found')) {
        desc = 'Bot Token tidak valid. Pastikan token disalin lengkap dari @BotFather tanpa spasi atau prefix "bot".';
      } else if (desc.includes('bot was blocked by the user')) {
        desc = 'Bot diblokir oleh penerima. Buka chat bot di Telegram dan lakukan unblock/start.';
      } else if (desc.includes('rights to send a message') || desc.includes('not a member')) {
        desc = 'Bot belum menjadi anggota/admin di grup. Tambahkan bot ke grup panitia.';
      }
      return { success: false, error: desc };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a JSON payload to a generic Webhook (Discord / Slack / Custom)
 */
async function sendWebhook(url, payload) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    return { success: false, error: 'Webhook URL belum dikonfigurasi' };
  }
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return { success: false, error: 'Webhook URL harus diawali http:// atau https://' };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 8000
    });

    if (!res.ok) {
      return { success: false, error: `Webhook returned status ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch SOS alert notification to external channels
 */
async function dispatchSosNotification({ event, rider, alert }) {
  const cfg = getConfig();
  if (!cfg.notifySos) return;

  const eventName = event?.name || 'CycloPon Event';
  const riderName = rider?.name || 'Anonim / Race Control';
  const bib = rider?.bib || '-';
  const typeMap = {
    CRASH: '💥 Kecelakaan / Terjatuh',
    MEDICAL: '🚑 Medis / Cedera Darurat',
    MECHANICAL: '⚙️ Kerusakan Sepeda Berat',
    DNF: '🛑 Evakuasi / Mundur (DNF)',
    OTHER: '🚨 Bantuan Darurat Umum'
  };
  const typeLabel = typeMap[alert?.type] || alert?.type || 'Bantuan Darurat';
  const msg = alert?.message ? alert.message : '-';
  const lat = alert?.latitude != null ? alert.latitude.toFixed(6) : null;
  const lng = alert?.longitude != null ? alert.longitude.toFixed(6) : null;
  const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

  // Format Telegram HTML text
  let tgText = `🚨 <b>PERINGATAN DARURAT (SOS) — CYCLOPON</b>\n`;
  tgText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  tgText += `🏁 <b>Event:</b> ${escapeHtml(eventName)}\n`;
  tgText += `🚴 <b>Rider:</b> ${escapeHtml(riderName)} (BIB: <b>${escapeHtml(bib)}</b>)\n`;
  tgText += `⚠️ <b>Kategori:</b> ${escapeHtml(typeLabel)}\n`;
  tgText += `💬 <b>Pesan:</b> ${escapeHtml(msg)}\n`;
  if (lat && lng) {
    tgText += `📍 <b>Koordinat:</b> <code>${lat}, ${lng}</code>\n`;
    tgText += `🗺️ <a href="https://maps.google.com/?q=${lat},${lng}">Buka Lokasi di Google Maps</a>\n`;
  }
  tgText += `⏱️ <b>Waktu:</b> ${nowStr}`;

  // Format Webhook Payload
  const webhookPayload = {
    event: 'cyclopon.sos_alert',
    timestamp: new Date().toISOString(),
    event_details: { id: event?.id, name: eventName },
    rider_details: { id: rider?.id, bib, name: riderName },
    alert: {
      id: alert?.id,
      type: alert?.type,
      category: typeLabel,
      message: alert?.message || '',
      latitude: alert?.latitude,
      longitude: alert?.longitude,
      google_maps_url: (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : null
    }
  };

  const promises = [];
  if (cfg.telegramToken && cfg.telegramChatId) {
    promises.push(
      sendTelegramMessage(cfg.telegramToken, cfg.telegramChatId, tgText)
        .then(res => {
          if (!res.success) console.warn('[Notif] Gagal kirim Telegram SOS:', res.error);
        })
        .catch(e => console.warn('[Notif] Error Telegram SOS:', e.message))
    );
  }

  if (cfg.webhookUrl) {
    promises.push(
      sendWebhook(cfg.webhookUrl, webhookPayload)
        .then(res => {
          if (!res.success) console.warn('[Notif] Gagal kirim Webhook SOS:', res.error);
        })
        .catch(e => console.warn('[Notif] Error Webhook SOS:', e.message))
    );
  }

  return Promise.all(promises);
}

/**
 * Dispatch Over Cut-Off Time (COT) notification to external channels
 */
async function dispatchCotNotification({ event, rider, checkpoint, split }) {
  const cfg = getConfig();
  if (!cfg.notifyCot) return;

  const eventName = event?.name || 'CycloPon Event';
  const riderName = rider?.name || 'Rider';
  const bib = rider?.bib || '-';
  const cpName = checkpoint?.name || 'Checkpoint';
  const cpKm = checkpoint?.km_distance != null ? checkpoint.km_distance.toFixed(1) : '-';
  const cotTime = checkpoint?.close_time || '-';
  const arrivalTime = split?.arrival_time ? split.arrival_time.replace('T', ' ').slice(0, 19) : '-';

  // Format Telegram HTML text
  let tgText = `⏱️ <b>PERINGATAN OVER CUT-OFF TIME (COT)</b>\n`;
  tgText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  tgText += `🏁 <b>Event:</b> ${escapeHtml(eventName)}\n`;
  tgText += `🚴 <b>Rider:</b> ${escapeHtml(riderName)} (BIB: <b>${escapeHtml(bib)}</b>)\n`;
  tgText += `🚩 <b>Pos Checkpoint:</b> ${escapeHtml(cpName)} (KM ${cpKm})\n`;
  tgText += `⏰ <b>Batas Waktu (COT):</b> <code>${escapeHtml(cotTime)}</code>\n`;
  tgText += `🕒 <b>Waktu Tiba:</b> <code>${escapeHtml(arrivalTime)}</code>\n`;
  tgText += `❌ <b>Status:</b> <b>OVER_COT (Diskualifikasi Waktu)</b>`;

  // Format Webhook Payload
  const webhookPayload = {
    event: 'cyclopon.over_cot',
    timestamp: new Date().toISOString(),
    event_details: { id: event?.id, name: eventName },
    rider_details: { id: rider?.id, bib, name: riderName },
    checkpoint: { id: checkpoint?.id, name: cpName, km: checkpoint?.km_distance, cot: cotTime },
    split: { arrival_time: split?.arrival_time, status: split?.status }
  };

  const promises = [];
  if (cfg.telegramToken && cfg.telegramChatId) {
    promises.push(
      sendTelegramMessage(cfg.telegramToken, cfg.telegramChatId, tgText)
        .then(res => {
          if (!res.success) console.warn('[Notif] Gagal kirim Telegram COT:', res.error);
        })
        .catch(e => console.warn('[Notif] Error Telegram COT:', e.message))
    );
  }

  if (cfg.webhookUrl) {
    promises.push(
      sendWebhook(cfg.webhookUrl, webhookPayload)
        .then(res => {
          if (!res.success) console.warn('[Notif] Gagal kirim Webhook COT:', res.error);
        })
        .catch(e => console.warn('[Notif] Error Webhook COT:', e.message))
    );
  }

  return Promise.all(promises);
}

/**
 * Send test notification to verify integration
 */
async function sendTestNotification(targetConfig = {}) {
  const currentCfg = getConfig();
  const token = targetConfig.telegramToken !== undefined ? targetConfig.telegramToken : currentCfg.telegramToken;
  const chatId = targetConfig.telegramChatId !== undefined ? targetConfig.telegramChatId : currentCfg.telegramChatId;
  const webhookUrl = targetConfig.webhookUrl !== undefined ? targetConfig.webhookUrl : currentCfg.webhookUrl;
  const channel = targetConfig.channel; // 'telegram' | 'webhook' | 'all' | undefined

  const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
  const testMessage = `🔔 <b>UJI COBA NOTIFIKASI CYCLOPON RACE CONTROL</b>\n`
    + `━━━━━━━━━━━━━━━━━━━━━━\n`
    + `Sistem notifikasi eksternal panitia telah berhasil terhubung!\n`
    + `Pesan darurat (SOS) dan peringatan Over Cut-Off Time (COT) akan dikirimkan otomatis ke saluran ini.\n`
    + `⏱️ <i>${nowStr}</i>`;

  const results = {
    telegram: null,
    webhook: null
  };

  const shouldTestTelegram = (channel === 'telegram') || (channel === 'all') || (!channel && Boolean(token || chatId));
  const shouldTestWebhook  = (channel === 'webhook')  || (channel === 'all') || (!channel && Boolean(webhookUrl));

  if (shouldTestTelegram) {
    if (token && chatId) {
      results.telegram = await sendTelegramMessage(token, chatId, testMessage);
    } else {
      results.telegram = { success: false, error: 'Telegram Bot Token atau Chat ID belum diisi' };
    }
  }

  if (shouldTestWebhook) {
    if (webhookUrl) {
      results.webhook = await sendWebhook(webhookUrl, {
        event: 'cyclopon.test_ping',
        timestamp: new Date().toISOString(),
        message: 'Uji coba Webhook CycloPon Race Control berhasil.'
      });
    } else {
      results.webhook = { success: false, error: 'Webhook URL belum diisi' };
    }
  }

  // If neither channel was targeted / both empty
  if (!shouldTestTelegram && !shouldTestWebhook) {
    results.telegram = { success: false, error: 'Telegram Bot Token atau Chat ID belum diisi' };
    results.webhook  = { success: false, error: 'Webhook URL belum diisi' };
  }

  return results;
}

module.exports = {
  escapeHtml,
  getConfig,
  saveConfig,
  sendTelegramMessage,
  sendWebhook,
  dispatchSosNotification,
  dispatchCotNotification,
  sendTestNotification
};
