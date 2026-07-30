require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware CORS (pour autoriser le frontend React)
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

// Routes API
app.use('/api/fires', require('./routes/fires'));
app.use('/api/exports', require('./routes/exports'));

// Endpoint de santé pour vérifier que le backend tourne
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

// Gestion des erreurs 404 pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: `Route non trouvée : ${req.originalUrl}` });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Les données sont trop volumineuses pour l\'export',
      details: 'Essayez de réduire le nombre de feux avec les filtres'
    });
  }
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`\n🔥 Backend démarré sur http://localhost:${PORT}`);
  console.log(`📡 API FIRMS: /api/fires`);
  console.log(`💾 Exports: /api/exports`);
  console.log(`📦 Limite des requêtes: 50MB\n`);
});

module.exports = app;
