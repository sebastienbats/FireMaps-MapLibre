const express = require('express');
const router = express.Router();
const { saveExport, listExports, deleteExport } = require('../controllers/exportController');

console.log('📂 Chargement du routeur exports.js');

router.post('/', saveExport);
router.get('/', listExports);
router.delete('/:filename', deleteExport);

console.log('✅ Routeur exports.js chargé avec succès');

module.exports = router;
