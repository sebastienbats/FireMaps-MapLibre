const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// --- Configuration des sources FIRMS ---
const SOURCES = {
  VIIRS_SNPP_NRT: {
    url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/shapes/zips/SVNP_',
    format: 'csv'
  },
  VIIRS_NOAA20_NRT: {
    url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/shapes/zips/VNP_',
    format: 'csv'
  },
  MODIS_NRT: {
    url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/shapes/zips/MCD14DL_',
    format: 'csv'
  }
};

// --- Correction 1 : Fonction de parsing CSV robuste (version simple) ---
// Pour une version production, utilisez la bibliothèque 'csv-parse'
function parseCSVToJSON(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue; // ligne mal formée
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    result.push(obj);
  }
  return result;
}

// --- Correction 2 : Fonction getSources (manquante) ---
exports.getSources = (req, res) => {
  res.json({ sources: Object.keys(SOURCES) });
};

// --- Endpoint principal : récupération des feux ---
exports.getFires = async (req, res) => {
  try {
    const { source = 'VIIRS_SNPP_NRT', days = '1', startDate, endDate, apiKey } = req.query;

    // Validation simple de la source
    if (!SOURCES[source]) {
      return res.status(400).json({ error: 'Source invalide' });
    }

    // Construction de l'URL FIRMS
    let url;
    if (startDate && endDate) {
      // Format attendu : YYYY-MM-DD
      // Correction 3 : gestion des dates avec fuseau horaire explicite (UTC+2 pour Paris)
      const start = new Date(startDate + 'T00:00:00+02:00');
      const end = new Date(endDate + 'T23:59:59+02:00');
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Dates invalides' });
      }
      // Conversion en format FIRMS : YYYY-MM-DD
      const startStr = start.toISOString().slice(0,10);
      const endStr = end.toISOString().slice(0,10);
      url = `${SOURCES[source].url}${startStr}_${endStr}.${SOURCES[source].format}`;
    } else {
      // Par défaut : dernier N jours
      const daysInt = parseInt(days, 10);
      if (isNaN(daysInt) || daysInt < 1 || daysInt > 5) {
        return res.status(400).json({ error: 'Le paramètre days doit être entre 1 et 5' });
      }
      const today = new Date();
      const endDateStr = today.toISOString().slice(0,10);
      const startDateObj = new Date(today);
      startDateObj.setDate(today.getDate() - daysInt);
      const startDateStr = startDateObj.toISOString().slice(0,10);
      url = `${SOURCES[source].url}${startDateStr}_${endDateStr}.${SOURCES[source].format}`;
    }

    // Ajout de la clé API en paramètre GET (à améliorer en production)
    url += `?apiKey=${apiKey || process.env.FIRMS_API_KEY || ''}`;

    console.log(`🌐 Requête FIRMS : ${url}`);

    // Correction 4 : gestion d'erreur complète avec try/catch et timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      let errorMsg = `Erreur FIRMS (${response.status})`;
      if (response.status === 401) errorMsg = 'Clé API invalide ou manquante';
      else if (response.status === 404) errorMsg = 'Aucune donnée pour cette période';
      else if (response.status === 429) errorMsg = 'Trop de requêtes, veuillez patienter';
      return res.status(response.status).json({ error: errorMsg });
    }

    // Le contenu est au format CSV
    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      return res.status(404).json({ error: 'Données vides' });
    }

    // Parsing du CSV
    const fireData = parseCSVToJSON(csvText);
    if (fireData.length === 0) {
      return res.status(404).json({ error: 'Aucun feu trouvé' });
    }

    // Transformation en GeoJSON (format attendu par le frontend)
    const features = fireData.map(row => {
      const lat = parseFloat(row.latitude);
      const lon = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lon)) return null;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          frp: parseFloat(row.frp) || 0,
          confidence: row.confidence || 'low',
          bright_ti4: parseFloat(row.bright_ti4) || 0,
          scan: parseFloat(row.scan) || 0,
          track: parseFloat(row.track) || 0,
          satellite: row.satellite || '',
          instrument: row.instrument || '',
          acq_date: row.acq_date || '',
          acq_time: row.acq_time || '',
        }
      };
    }).filter(f => f !== null);

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    res.json(geojson);
  } catch (error) {
    // Correction 4 : catch global pour toutes les erreurs (réseau, timeout, etc.)
    console.error('❌ Erreur dans getFires:', error);
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Délai d’attente dépassé' });
    } else {
      res.status(500).json({ error: 'Erreur serveur : ' + error.message });
    }
  }
};
