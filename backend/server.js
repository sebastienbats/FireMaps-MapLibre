require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqué pour l'origine: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'X-API-Key'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/exports', express.static(path.join(__dirname, 'exports')));

console.log('📂 Chargement des routes...');

try {
  app.use('/api/fires', require('./routes/fires'));
  console.log('✅ Route /api/fires chargée');
} catch (err) {
  console.error('❌ Erreur chargement /api/fires:', err.message);
}

try {
  app.use('/api/exports', require('./routes/exports'));
  console.log('✅ Route /api/exports chargée');
} catch (err) {
  console.error('❌ Erreur chargement /api/exports:', err.message);
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      firms: '/api/fires',
      exports: '/api/exports'
    },
    cors: {
      allowedOrigins: allowedOrigins,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

app.use((req, res) => {
  console.log(`⚠️ Route non trouvée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: `Route non trouvée : ${req.originalUrl}`,
    status: 404,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: err.errors,
      status: 400,
      timestamp: new Date().toISOString()
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Accès non autorisé',
      status: 403,
      timestamp: new Date().toISOString()
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Les données sont trop volumineuses pour l\'export',
      details: 'Essayez de réduire le nombre de feux avec les filtres',
      status: 413,
      timestamp: new Date().toISOString()
    });
  }

  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    status: 500,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n🔥 Backend démarré sur http://localhost:${PORT}`);
  console.log(`📡 API FIRMS: /api/fires`);
  console.log(`💾 Exports: /api/exports`);
  console.log(`📦 Limite des requêtes: 50MB`);
  console.log(`🌐 CORS autorisés: ${allowedOrigins.length} origines`);
  console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
