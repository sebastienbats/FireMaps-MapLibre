const fs = require('fs');
const path = require('path');

const EXPORTS_DIR = path.join(__dirname, '../exports');

// Assure que le dossier d'export existe
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Sauvegarde des données (GeoJSON ou CSV) dans un fichier
exports.saveExport = (req, res) => {
  try {
    const { filename, data, format = 'geojson' } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'Nom de fichier et données requis' });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = format === 'csv' ? '.csv' : '.geojson';
    const fullPath = path.join(EXPORTS_DIR, safeName + ext);

    let content;
    if (format === 'geojson') {
      content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } else {
      // Pour CSV, on attend une chaîne CSV
      content = data;
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ success: true, file: fullPath });
  } catch (error) {
    console.error('Erreur export:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
};

// --- Correction 5 : Liste des fichiers exportés ---
exports.listExports = (req, res) => {
  try {
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter(f => f.endsWith('.csv') || f.endsWith('.geojson'))
      .map(f => ({ name: f, path: path.join(EXPORTS_DIR, f) }));
    res.json({ files });
  } catch (error) {
    console.error('Erreur listExports:', error);
    res.status(500).json({ error: 'Erreur lors de la liste des exports' });
  }
};

// --- Correction 5 : Suppression d'un fichier exporté ---
exports.deleteExport = (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier requis' });
    }
    // Sécurité : éviter les traversées de répertoires
    const safeName = path.basename(filename);
    const filePath = path.join(EXPORTS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Fichier supprimé' });
  } catch (error) {
    console.error('Erreur deleteExport:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};
