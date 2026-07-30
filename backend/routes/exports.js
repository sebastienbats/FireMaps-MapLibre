const express = require('express');
const router = express.Router();
const { saveExport, listExports, deleteExport } = require('../controllers/exportController');

// Route pour sauvegarder un fichier exporté (GeoJSON ou CSV)
router.post('/', saveExport);

// Route pour obtenir la liste des exports disponibles
router.get('/', listExports);

// Route pour supprimer un fichier exporté par son nom
router.delete('/:filename', deleteExport);

module.exports = router;
