const express = require('express');
const router = express.Router();
const { getOgData, generateOgSvg, generateOgPng } = require('../lib/og-infograph');

function handleOgImageRequest(req, res, forceFormat = null) {
  const eventId = req.params.id ? req.params.id.replace(/\.(png|svg)$/i, '') : null;
  const bib = req.query.bib || req.query.rider || null;

  if (!eventId || isNaN(Number(eventId))) {
    return res.status(400).send('Invalid event ID');
  }

  const data = getOgData(eventId, bib);
  if (!data || !data.event) {
    return res.status(404).send('Event not found');
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

  // Cache header: cache for 15s in CDN / browser, allow fresh telemetry
  res.set('Cache-Control', 'public, max-age=15, s-maxage=30');

  if (format === 'svg') {
    const svg = generateOgSvg(data);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.send(svg);
  } else {
    const png = generateOgPng(data);
    res.set('Content-Type', 'image/png');
    return res.send(png);
  }
}

// Routes
router.get('/events/:id.png', (req, res) => handleOgImageRequest(req, res, 'png'));
router.get('/events/:id.svg', (req, res) => handleOgImageRequest(req, res, 'svg'));
router.get('/events/:id', (req, res) => handleOgImageRequest(req, res));

// Visual Preview Page for Admin & Users
router.get('/preview/:id', (req, res) => {
  const eventId = req.params.id;
  const bib = req.query.bib || '';
  const bibParam = bib ? `?bib=${encodeURIComponent(bib)}` : '';

  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infografis Share Preview // CycloPon</title>
  <style>
    body {
      background: #0B0F19;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 30px 20px;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 1000px;
      width: 100%;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 16px;
    }
    h1 { margin: 0; font-size: 22px; color: #FFFFFF; font-weight: 800; }
    .subtitle { color: #00E5FF; font-size: 13px; font-family: monospace; font-weight: 700; margin-top: 4px; }
    .card-preview {
      background: #111827;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .card-preview img {
      width: 100%;
      height: auto;
      display: block;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn {
      background: #00E5FF;
      color: #070A10;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-outline {
      background: transparent;
      color: #F8FAFC;
      border: 1px solid #334155;
    }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Preview Infografis Sosial Media</h1>
        <div class="subtitle">// OPEN GRAPH 1200x630 HIGH-RESOLUTION CARD</div>
      </div>
      <div class="actions">
        <a href="/api/og/events/${eventId}.png${bibParam}" download="cyclopon-infograph-${eventId}.png" class="btn">📥 Unduh PNG</a>
        <a href="/api/og/events/${eventId}.svg${bibParam}" target="_blank" class="btn btn-outline">🔍 Buka SVG Vector</a>
        <a href="/watch/${eventId}${bibParam}" class="btn btn-outline">← Kembali ke Peta</a>
      </div>
    </div>

    <div class="card-preview">
      <img src="/api/og/events/${eventId}.png${bibParam}" alt="Infografis Preview">
    </div>
  </div>
</body>
</html>`);
});

module.exports = router;
