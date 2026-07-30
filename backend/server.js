require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les exports statiques
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// ⚠️ IMPORTANT : Vérifie que les fichiers routes existent
console.log('📂 Chargement des routes...');

// Routes API
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

// Endpoint de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      firms: '/api/fires',
      exports: '/api/exports'
    }
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  console.log(`⚠️ Route non trouvée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route non trouvée : ${req.originalUrl}` });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`\n🔥 Backend démarré sur http://localhost:${PORT}`);
  console.log(`📡 API FIRMS: /api/fires`);
  console.log(`💾 Exports: /api/exports`);
  console.log(`📦 Limite des requêtes: 50MB\n`);
});

module.exports = app;
