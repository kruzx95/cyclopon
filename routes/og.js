const express = require('express');
const router = express.Router();
const {
  getOgData,
  generateOgSvg,
  generateOgPng,
  getHomeOgData,
  generateHomeOgSvg,
  generateHomeOgPng
} = require('../lib/og-infograph');

const HOME_OG_CACHE_TTL_MS = 30 * 1000;
const EVENT_OG_CACHE_TTL_MS = 15 * 1000;
const OG_CACHE_MAX_ENTRIES = 100;
const ogOutputCache = new Map();

function getCachedOgOutput(key, ttlMs) {
  const entry = ogOutputCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= ttlMs) {
    ogOutputCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedOgOutput(key, value) {
  if (ogOutputCache.size >= OG_CACHE_MAX_ENTRIES) {
    const oldestKey = ogOutputCache.keys().next().value;
    if (oldestKey !== undefined) ogOutputCache.delete(oldestKey);
  }
  ogOutputCache.set(key, { at: Date.now(), value });
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPreviewPage(opts) {
  const {
    badge, title, subtitle, imageUrl, pngUrl, svgUrl,
    downloadName, backUrl, backLabel, alt
  } = opts;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} // CycloPon</title>
  <style>
    :root {
      --paper: #F6F3EC;
      --card: #FFFFFF;
      --ink: #141A17;
      --body: #424E46;
      --muted: #7C837D;
      --border: #DBD4C5;
      --sage: #2B4E30;
      --sage-soft: #EAEFE7;
      --amber: #966025;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background-color: var(--paper);
      background-image: radial-gradient(rgba(20, 26, 23, 0.06) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: clamp(16px, 4vw, 40px);
    }
    .container { max-width: 1040px; margin: 0 auto; }
    .preview-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .heading { min-width: 0; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      margin-bottom: 10px;
      border: 1px solid rgba(116, 136, 115, 0.7);
      border-radius: 999px;
      background: var(--sage-soft);
      color: var(--sage);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .eyebrow::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sage);
    }
    h1 {
      margin: 0 0 6px;
      font-size: clamp(20px, 3.6vw, 28px);
      line-height: 1.15;
      letter-spacing: -0.03em;
      font-weight: 900;
    }
    .subtitle {
      margin: 0;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 38px;
      padding: 9px 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card);
      color: var(--ink);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-decoration: none;
      white-space: nowrap;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(20, 26, 23, 0.08); }
    .btn-primary { background: var(--sage); border-color: var(--sage); color: #FFFFFF; }
    .btn-primary:hover { background: #1F3B24; }
    .btn-ghost { background: transparent; }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .hint { color: var(--amber); }
    .card-scroll {
      overflow-x: auto;
      overscroll-behavior-x: contain;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }
    .card-preview {
      display: block;
      width: 100%;
      min-width: 680px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--card);
      box-shadow: 0 18px 40px rgba(20, 26, 23, 0.10);
    }
    .card-preview img { display: block; width: 100%; height: auto; }
    .note {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.6;
    }
    @media (min-width: 721px) {
      .hint { display: none; }
    }
    @media (max-width: 720px) {
      body { padding: 16px; }
      .preview-header { align-items: flex-start; flex-direction: column; gap: 14px; }
      .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
      .btn { padding: 9px 10px; text-align: center; white-space: normal; }
      .btn-ghost { grid-column: 1 / -1; }
      .card-preview { min-width: 620px; }
      .hint { display: inline; }
    }
    @media (max-width: 360px) {
      .btn { font-size: 11px; }
      .eyebrow { font-size: 9px; }
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="preview-header">
      <div class="heading">
        <span class="eyebrow">${escapeHtml(badge)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <nav class="actions" aria-label="Aksi preview">
        <a class="btn btn-primary" href="${escapeHtml(pngUrl)}" download="${escapeHtml(downloadName)}">Unduh PNG</a>
        <a class="btn" href="${escapeHtml(svgUrl)}" target="_blank" rel="noopener">Buka SVG</a>
        <a class="btn btn-ghost" href="${escapeHtml(backUrl)}">${escapeHtml(backLabel)}</a>
      </nav>
    </header>

    <div class="toolbar">
      <span>OPEN GRAPH // 1200 x 630 // PNG + SVG</span>
      <span class="hint">Geser kartu untuk lihat detail &rarr;</span>
    </div>

    <div class="card-scroll">
      <a class="card-preview" href="${escapeHtml(pngUrl)}" target="_blank" rel="noopener" title="Buka gambar ukuran penuh">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" width="1200" height="630">
      </a>
    </div>

    <p class="note">PNG dipakai crawler sosial media; SVG adalah versi vektor. Klik kartu untuk membuka gambar ukuran penuh.</p>
  </main>
</body>
</html>`;
}

function handleHomeOgImageRequest(req, res, forceFormat = null) {
  let format = forceFormat;
  if (!format) {
    if (req.path.endsWith('.svg') || req.query.format === 'svg') format = 'svg';
    else format = 'png';
  }

  const cacheKey = `home:${format}`;
  const cached = getCachedOgOutput(cacheKey, HOME_OG_CACHE_TTL_MS);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=60');

  if (cached) {
    res.set('Content-Type', format === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png');
    return res.send(cached);
  }

  const data = getHomeOgData();

  if (format === 'svg') {
    const svg = generateHomeOgSvg(data);
    setCachedOgOutput(cacheKey, svg);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.send(svg);
  } else {
    const png = generateHomeOgPng(data);
    setCachedOgOutput(cacheKey, png);
    res.set('Content-Type', 'image/png');
    return res.send(png);
  }
}

function handleOgImageRequest(req, res, forceFormat = null) {
  const eventId = req.params.id ? req.params.id.replace(/\.(png|svg)$/i, '') : null;
  const bib = req.query.bib || req.query.rider || null;

  if (eventId === 'home' || eventId === 'cyclopon') {
    return handleHomeOgImageRequest(req, res, forceFormat);
  }

  if (!eventId || isNaN(Number(eventId))) {
    return res.status(400).send('Invalid event ID');
  }

  // Determine format: forceFormat param -> URL path extension -> query param -> default to PNG
  let format = forceFormat;
  if (!format) {
    if (req.path.endsWith('.svg') || req.query.format === 'svg') {
      format = 'svg';
    } else {
      format = 'png';
    }
  }

  const normalizedBib = bib ? String(bib).trim().toLowerCase() : '';
  const cacheKey = `event:${Number(eventId)}:${normalizedBib}:${format}`;
  const cached = getCachedOgOutput(cacheKey, EVENT_OG_CACHE_TTL_MS);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=15, s-maxage=30');
    res.set('Content-Type', format === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png');
    return res.send(cached);
  }

  const data = getOgData(eventId, bib);
  if (!data || !data.event) {
    return res.status(404).send('Event not found');
  }

  // Cache header: cache for 15s in CDN / browser, allow fresh telemetry
  res.set('Cache-Control', 'public, max-age=15, s-maxage=30');

  if (format === 'svg') {
    const svg = generateOgSvg(data);
    setCachedOgOutput(cacheKey, svg);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.send(svg);
  } else {
    const png = generateOgPng(data);
    setCachedOgOutput(cacheKey, png);
    res.set('Content-Type', 'image/png');
    return res.send(png);
  }
}

// Home / Root Domain Open Graph Images
router.get('/home.png', (req, res) => handleHomeOgImageRequest(req, res, 'png'));
router.get('/home.svg', (req, res) => handleHomeOgImageRequest(req, res, 'svg'));
router.get('/home', (req, res) => handleHomeOgImageRequest(req, res));
router.get('/cyclopon.png', (req, res) => handleHomeOgImageRequest(req, res, 'png'));
router.get('/cyclopon.svg', (req, res) => handleHomeOgImageRequest(req, res, 'svg'));

// Event / Rider Open Graph Images
router.get('/events/:id.png', (req, res) => handleOgImageRequest(req, res, 'png'));
router.get('/events/:id.svg', (req, res) => handleOgImageRequest(req, res, 'svg'));
router.get('/events/:id', (req, res) => handleOgImageRequest(req, res));

// Visual Preview Page for Home Domain
router.get('/preview/home', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.send(renderPreviewPage({
    badge: 'Open Graph Preview',
    title: 'Infografis Domain Utama',
    subtitle: '// Share card cyclopon.my.id',
    imageUrl: '/api/og/home.png',
    pngUrl: '/api/og/home.png',
    svgUrl: '/api/og/home.svg',
    downloadName: 'cyclopon-home.png',
    backUrl: '/',
    backLabel: '← Kembali ke Beranda',
    alt: 'Infografis domain CycloPon'
  }));
});

// Visual Preview Page for Event & Rider Cards
router.get('/preview/:id', (req, res) => {
  const eventId = String(req.params.id || '');
  const bib = req.query.bib || req.query.rider || '';
  const encodedId = encodeURIComponent(eventId);
  const bibParam = bib ? `?bib=${encodeURIComponent(bib)}` : '';

  let data = null;
  try {
    data = getOgData(eventId, bib || null);
  } catch (e) {}
  if (!data || !data.event) return res.status(404).send('Event not found');

  const eventName = data.event.name;
  const riderLabel = data.rider ? ` · #${data.rider.bib} ${data.rider.name}` : '';
  const safeName = eventId.replace(/[^a-z0-9_-]/gi, '') || 'event';

  res.set('Cache-Control', 'no-cache');
  res.send(renderPreviewPage({
    badge: data.rider ? 'Rider Dossier' : 'Event Dossier',
    title: `Infografis ${eventName}`,
    subtitle: data.rider
      ? `// Open Graph card${riderLabel}`
      : '// Open Graph card · 1200 x 630',
    imageUrl: `/api/og/events/${encodedId}.png${bibParam}`,
    pngUrl: `/api/og/events/${encodedId}.png${bibParam}`,
    svgUrl: `/api/og/events/${encodedId}.svg${bibParam}`,
    downloadName: `cyclopon-infograph-${safeName}.png`,
    backUrl: `/watch/${encodedId}${bibParam}`,
    backLabel: '← Kembali ke Peta',
    alt: `Infografis ${eventName}`
  }));
});

module.exports = router;
