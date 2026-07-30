const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const { getFires, getSources } = require('../controllers/fireController');

// Route pour lister les sources disponibles
router.get('/sources', getSources);

// Route principale avec validation des paramètres
router.get('/',
  [
    query('source')
      .optional()
      .isIn(['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'])
      .withMessage('Source invalide'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('days doit être un entier entre 1 et 5'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDate doit être au format YYYY-MM-DD'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate doit être au format YYYY-MM-DD'),
    query('apiKey')
      .optional()
      .isString()
      .withMessage('apiKey doit être une chaîne')
  ],
  getFires
);

module.exports = router;  // ← crucial : exporter le router
