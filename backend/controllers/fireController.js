const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const { validationResult } = require('express-validator');

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

exports.getSources = (req, res) => {
  res.json({ sources: Object.keys(SOURCES) });
};

exports.getFires = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { source = 'VIIRS_SNPP_NRT', days = '1', startDate, endDate, apiKey } = req.query;

    if (!SOURCES[source]) {
      return res.status(400).json({ error: 'Source invalide' });
    }

    let url;
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00+02:00');
      const end = new Date(endDate + 'T23:59:59+02:00');
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Dates invalides' });
      }
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      url = `${SOURCES[source].url}${startStr}_${endStr}.${SOURCES[source].format}`;
    } else {
      const daysInt = parseInt(days, 10);
      if (isNaN(daysInt) || daysInt < 1 || daysInt > 5) {
        return res.status(400).json({ error: 'Le paramètre days doit être entre 1 et 5' });
      }
      const today = new Date();
      const endDateStr = today.toISOString().slice(0, 10);
      const startDateObj = new Date(today);
      startDateObj.setDate(today.getDate() - daysInt);
      const startDateStr = startDateObj.toISOString().slice(0, 10);
      url = `${SOURCES[source].url}${startDateStr}_${endDateStr}.${SOURCES[source].format}`;
    }

    url += `?apiKey=${apiKey || process.env.FIRMS_API_KEY || ''}`;
    console.log(`🌐 Requête FIRMS : ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      let errorMsg = `Erreur FIRMS (${response.status})`;
      if (response.status === 401) errorMsg = 'Clé API invalide ou manquante';
      else if (response.status === 404) errorMsg = 'Aucune donnée pour cette période';
      else if (response.status === 429) errorMsg = 'Trop de requêtes, veuillez patienter';
      return res.status(response.status).json({ error: errorMsg });
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      return res.status(404).json({ error: 'Données vides' });
    }

    let records;
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
      });
    } catch (parseError) {
      console.error('Erreur de parsing CSV:', parseError);
      return res.status(500).json({ error: 'Erreur lors du parsing des données' });
    }

    if (records.length === 0) {
      return res.status(404).json({ error: 'Aucun feu trouvé' });
    }

    const features = records.map(row => {
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
    console.error('❌ Erreur dans getFires:', error);
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Délai d’attente dépassé' });
    } else {
      res.status(500).json({ error: 'Erreur serveur : ' + error.message });
    }
  }
};
