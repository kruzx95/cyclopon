const express = require('express');
const router = express.Router();
const notifications = require('../lib/notifications');

/**
 * Mask token string for safe display
 */
function maskToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  return token.slice(0, 4) + '••••••••' + token.slice(-4);
}

// GET /api/admin/notifications/settings — retrieve notification settings
router.get('/admin/notifications/settings', (req, res) => {
  const cfg = notifications.getConfig();
  res.json({
    telegramTokenMasked: maskToken(cfg.telegramToken),
    hasTelegramToken:    Boolean(cfg.telegramToken),
    telegramChatId:      cfg.telegramChatId || '',
    webhookUrl:          cfg.webhookUrl || '',
    notifySos:           cfg.notifySos,
    notifyCot:           cfg.notifyCot
  });
});

// POST /api/admin/notifications/settings — update notification settings
router.post('/admin/notifications/settings', (req, res) => {
  const { telegramToken, telegramChatId, webhookUrl, notifySos, notifyCot } = req.body;

  const toUpdate = {};
  // Only update token if it doesn't contain mask dots
  if (telegramToken !== undefined && !telegramToken.includes('••••')) {
    toUpdate.telegramToken = telegramToken;
  }
  if (telegramChatId !== undefined) toUpdate.telegramChatId = telegramChatId;
  if (webhookUrl !== undefined)     toUpdate.webhookUrl = webhookUrl;
  if (notifySos !== undefined)      toUpdate.notifySos = Boolean(notifySos);
  if (notifyCot !== undefined)      toUpdate.notifyCot = Boolean(notifyCot);

  notifications.saveConfig(toUpdate);
  const cfg = notifications.getConfig();

  res.json({
    success: true,
    message: 'Pengaturan notifikasi berhasil disimpan',
    settings: {
      telegramTokenMasked: maskToken(cfg.telegramToken),
      hasTelegramToken:    Boolean(cfg.telegramToken),
      telegramChatId:      cfg.telegramChatId || '',
      webhookUrl:          cfg.webhookUrl || '',
      notifySos:           cfg.notifySos,
      notifyCot:           cfg.notifyCot
    }
  });
});

// POST /api/admin/notifications/test — test sending notification
router.post('/admin/notifications/test', async (req, res) => {
  const { channel, telegramToken, telegramChatId, webhookUrl } = req.body || {};

  const currentCfg = notifications.getConfig();
  const tokenToUse = (telegramToken && !telegramToken.includes('••••'))
    ? telegramToken
    : currentCfg.telegramToken;

  const results = await notifications.sendTestNotification({
    channel,
    telegramToken:  tokenToUse,
    telegramChatId: telegramChatId !== undefined ? telegramChatId : currentCfg.telegramChatId,
    webhookUrl:     webhookUrl !== undefined ? webhookUrl : currentCfg.webhookUrl
  });

  const success = Boolean(
    (results.telegram && results.telegram.success) ||
    (results.webhook && results.webhook.success)
  );

  res.json({
    success,
    results
  });
});

module.exports = router;
