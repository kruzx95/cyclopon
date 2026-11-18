require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const compression = require('compression');
const db = require('./db/database');
const { enqueuePageView } = require('./lib/traffic-queue');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Caddy / Nginx) for accurate IPs and HTTPS detection
app.set('trust proxy', 1);

// Production Security Hardening
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  next();
});

// Middleware
app.use(compression({
  threshold: 1024
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Lightweight Page Views & Traffic Tracker Middleware (Buffered In-Memory)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    try {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);
      const userAgent = (req.headers['user-agent'] || '').substring(0, 150);

      let eventId = null;
      const watchMatch = req.path.match(/^\/watch\/(\d+)/);
      const eventMatch = req.path.match(/^\/events\/(\d+)/);
      if (watchMatch) eventId = Number(watchMatch[1]);
      else if (eventMatch) eventId = Number(eventMatch[1]);

      enqueuePageView({
        path: req.path,
        event_id: eventId,
        ip_hash: ipHash,
        user_agent: userAgent
      });
    } catch (err) {
      // Silent error handling to avoid disrupting traffic
    }
  }
  next();
});

// Ensure directories exist
['data', 'public/gpx'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const riderRoutes = require('./routes/riders');
const alertRoutes = require('./routes/alerts');
const checkpointRoutes = require('./routes/checkpoints');
const historyRoutes = require('./routes/history');
const resultsRoutes = require('./routes/results');
const adminMetricsRoutes = require('./routes/admin-metrics');
const adminReportsRoutes = require('./routes/admin-reports');
const osmandRoutes = require('./routes/osmand');
const ogRoutes = require('./routes/og');
const {
  getOgData,
  getOgMetadata,
  getHomeOgData,
  getHomeOgMetadata,
  injectOgMeta
} = require('./lib/og-infograph');

// Mount public GPS telemetry endpoints before any generic /api middlewares
app.use('/api/osmand', osmandRoutes);
app.use('/osmand', osmandRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/riders', riderRoutes);
app.use('/api', alertRoutes);
app.use('/api', checkpointRoutes);
app.use('/api', historyRoutes);
app.use('/api', resultsRoutes);
app.use('/api/admin/metrics', adminMetricsRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/og', ogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

let indexHtmlCache = null;
function getCachedIndexHtml() {
  if (!indexHtmlCache || process.env.NODE_ENV !== 'production') {
    indexHtmlCache = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  }
  return indexHtmlCache;
}

// SPA fallback: serve index.html with dynamic Open Graph tags for home, watch & event links
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    const host = req.get('x-forwarded-host') || req.get('host') || 'cyclopon.my.id';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';

    // 1. Root Domain Share (e.g. cyclopon.my.id or /)
    if (req.path === '/' || req.path === '') {
      try {
        const homeData = getHomeOgData();
        const meta = getHomeOgMetadata(homeData, host, protocol);
        const html = injectOgMeta(getCachedIndexHtml(), meta);
        return res.status(200).type('html').send(html);
      } catch (err) {
        // Fallback to static index.html on error
      }
    }

    // 2. Watch or Event Link Share (e.g. /watch/798 or /events/798?bib=...)
    const watchMatch = req.path.match(/^\/(?:watch|events)\/(\d+)/);
    if (watchMatch) {
      const eventId = Number(watchMatch[1]);
      const bib = req.query.bib || req.query.rider || null;
      try {
        const ogData = getOgData(eventId, bib);
        if (ogData && ogData.event) {
          const meta = getOgMetadata(ogData, host, protocol);
          const html = injectOgMeta(getCachedIndexHtml(), meta);
          return res.status(200).type('html').send(html);
        }
      } catch (err) {
        // Fallback to static index.html on error
      }
    }

    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

// 404 handler for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
});

// Centralized Express error handler
app.use((err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === 'MulterError') {
    status = 400;
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Server Error] ${req.method} ${req.path}:`, err.message || err);
  }
  res.status(status).json({
    error: err.message || 'Terjadi kesalahan internal pada server'
  });
});

// Create HTTP server (needed for WebSocket proxy)
const httpServer = http.createServer(app);

// Setup Traccar WebSocket proxy
const { setupTraccarWsProxy } = require('./lib/traccar-ws-proxy');
setupTraccarWsProxy(httpServer);

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`CycloPon server running on http://localhost:${PORT}`);
  });

  const handleShutdown = (signal) => {
    console.log(`[Server] Menerima sinyal ${signal}, menjalankan graceful shutdown...`);

    // 1. Flush and stop traffic queue
    try {
      const { stopQueue } = require('./lib/traffic-queue');
      if (typeof stopQueue === 'function') stopQueue();
    } catch (e) {}

    // 2. Close WS proxy upstream & clients
    try {
      const { closeUpstream } = require('./lib/traccar-ws-proxy');
      if (typeof closeUpstream === 'function') closeUpstream();
    } catch (e) {}

    // 3. Close HTTP server
    httpServer.close(() => {
      console.log('[Server] HTTP server tertutup.');
      try {
        db.db.close();
        console.log('[Server] Database SQLite tertutup dengan aman.');
      } catch (e) {}
      process.exit(0);
    });

    // Force exit if shutdown hangs over 5s
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timeout, mematikan paksa.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

module.exports = app;
module.exports.httpServer = httpServer;

