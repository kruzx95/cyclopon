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

// Middleware
app.use(compression({
  threshold: 1024
}));
app.use(express.json());
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
const notificationRoutes = require('./routes/notifications');
const adminMetricsRoutes = require('./routes/admin-metrics');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/riders', riderRoutes);
app.use('/api', alertRoutes);
app.use('/api', checkpointRoutes);
app.use('/api', historyRoutes);
app.use('/api', resultsRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin/metrics', adminMetricsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback: serve index.html for all non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
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
}

module.exports = app;
module.exports.httpServer = httpServer;

