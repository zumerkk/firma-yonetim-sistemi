// 🚀 Simple Express Server for React SPA on Render.com
// Bu server static files serve eder ve SPA routing için fallback sağlar

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Gzip compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.set({
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade'
  });
  next();
});

// Static files serve
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1y', // Static assets cache for 1 year
  etag: true,
  lastModified: true
}));

// Special cache control for index.html
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 🎯 SPA ROUTING FALLBACK - Ana çözüm burada!
// React Router için tüm rotaları index.html'e yönlendir
app.get('*', (req, res) => {
  // Static files hariç tüm istekleri index.html'e yönlendir
  if (req.originalUrl.startsWith('/static/')) {
    return res.status(404).send('Not found');
  }
  
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'build')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down gracefully...');
  process.exit(0);
}); 