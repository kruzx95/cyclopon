require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/riders', riderRoutes);
app.use('/api', alertRoutes);
app.use('/api', checkpointRoutes);
app.use('/api', historyRoutes);
app.use('/api', resultsRoutes);

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

