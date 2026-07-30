import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';

// --- Constantes ---
const WEATHER_LAYERS = [
  { value: 'temperature_2m', label: '🌡️ Température', layer: 'temperature_2m' },
  { value: 'precipitation', label: '🌧️ Précipitations', layer: 'precipitation' },
  { value: 'cloud_cover', label: '☁️ Couverture nuageuse', layer: 'cloud_cover' },
  { value: 'wind_speed_10m', label: '💨 Vitesse du vent', layer: 'wind_speed_10m' },
  { value: 'pressure_msl', label: '📊 Pression', layer: 'pressure_msl' },
];

const SDIS_COLORS = {
  doubs: '#e74c3c',
  gard: '#3498db',
  gironde: '#2ecc71',
  herault: '#f39c12',
  default: '#e67e22',
};

// --- Fonctions utilitaires ---
const createFireGeoJSON = (fires) => {
  if (!fires || fires.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: fires.map(fire => {
      const frp = fire.frp || 0;
      const isHighIntensity = frp > 50;
      const confidence = fire.confidence || 'low';
      let color = '#f39c12'; // low
      let size = 10;
      if (confidence === 'high' || isHighIntensity) {
        color = '#e74c3c';
        size = 14;
      } else if (confidence === 'medium') {
        color = '#ff8800';
        size = 12;
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fire.longitude, fire.latitude]
        },
        properties: {
          confidence: confidence,
          frp: frp,
          acq_date: fire.acq_date || 'N/A',
          acq_time: fire.acq_time || 'N/A',
          type: fire.type || '',
          bright_ti4: fire.bright_ti4 || 0,
          bright_ti5: fire.bright_ti5 || 0,
          scan: fire.scan || 0,
          track: fire.track || 0,
          satellite: fire.satellite || '',
          isHighIntensity: isHighIntensity,
          intensity: frp > 100 ? 'Extrême' : frp > 50 ? 'Élevée' : 'Moyenne',
          size: size,
          color: color
        }
      };
    })
  };
};

const generateWindArrows = (windData) => {
  if (!windData || !windData.data) return { type: 'FeatureCollection', features: [] };
  const { u: uGrid, v: vGrid } = windData.data;
  const { nx, ny, lo1, la1, dx, dy } = windData.header;
  const features = [];
  const step = 2; // pas de grille pour éviter trop de flèches
  for (let j = 0; j < ny; j += step) {
    for (let i = 0; i < nx; i += step) {
      const u = uGrid[j]?.[i] || 0;
      const v = vGrid[j]?.[i] || 0;
      const speed = Math.sqrt(u * u + v * v);
      if (speed < 0.1) continue;
      const lon = lo1 + i * dx;
      const lat = la1 + j * dy;
      const angle = Math.atan2(u, v) * (180 / Math.PI);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          speed: speed,
          direction: angle,
          u: u,
          v: v
        }
      });
    }
  }
  return { type: 'FeatureCollection', features };
};

// --- Composant principal ---
const Map = ({ 
  fireData, 
  windData, 
  sdisData, 
  onMapLoad,
  showWind = false,
  showWeather = false,
  weatherLayer = 'temperature_2m'
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedWeatherLayer, setSelectedWeatherLayer] = useState(weatherLayer);

  // Initialisation de la carte
  useEffect(() => {
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [2.0, 46.0],
        zoom: 5,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.on('load', () => {
        setMapLoaded(true);
        if (onMapLoad) onMapLoad(map.current);
      });
    }
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [onMapLoad]);

  // --- Affichage des feux ---
  useEffect(() => {
    if (!map.current || !mapLoaded || !fireData) return;

    const sourceId = 'fires-source';
    const layerId = 'fires-layer';

    // Supprimer l'ancienne couche et source si elles existent
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    const geoJson = createFireGeoJSON(fireData);

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geoJson,
    });

    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': ['get', 'size'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Ajuster la vue si des points existent
    if (geoJson.features.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      geoJson.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        bounds.extend([coords[0], coords[1]]);
      });
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
      }
    }
  }, [fireData, mapLoaded]);

  // --- Affichage du vent ---
  useEffect(() => {
    if (!map.current || !mapLoaded || !showWind || !windData) return;

    const sourceId = 'wind-source';
    const layerId = 'wind-layer';

    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    const windGeoJson = generateWindArrows(windData);

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: windGeoJson,
    });

    // Utiliser des symboles pour les flèches
    map.current.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'icon-image': 'arrow-15', // nécessite une image sprite ; on peut utiliser un cercle avec rotation
        'icon-rotate': ['get', 'direction'],
        'icon-size': 0.8,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 0.7,
      },
    });

    // Si l'image 'arrow' n'existe pas, on utilise un cercle avec rotation
    // Pour simplifier, on ajoute une couche de cercle avec une ligne orientée
    // mais on va plutôt utiliser un marqueur personnalisé avec des flèches SVG.
    // Ici, on ajoute un cercle avec une ligne pointant dans la direction.
    // Pour éviter la complexité, on va utiliser des cercles colorés par vitesse.
    // Mais pour un vrai rendu, il faudrait ajouter une image sprite.
    // Solution rapide : utiliser des cercles avec couleur selon vitesse.
    if (map.current.getLayer('wind-circles')) {
      map.current.removeLayer('wind-circles');
    }
    map.current.addLayer({
      id: 'wind-circles',
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'speed'],
          0, '#3498db',
          5, '#2ecc71',
          10, '#f1c40f',
          15, '#e67e22',
          20, '#e74c3c',
        ],
        'circle-opacity': 0.6,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#ffffff',
      },
    });

  }, [windData, showWind, mapLoaded]);

  // --- Affichage des couches météo (à partir d'un service tiers) ---
  // Cette partie dépend de l'API météo utilisée (par ex. OpenMeteo).
  // Pour l'exemple, on ajoute une couche raster si l'URL est disponible.
  useEffect(() => {
    if (!map.current || !mapLoaded || !showWeather) return;

    const layerId = 'weather-layer';
    // Supprimer l'ancienne couche
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource('weather-source')) {
      map.current.removeSource('weather-source');
    }

    // Simuler une couche météo via une source raster (par exemple, une tuile WMS)
    // Dans la vraie vie, on utiliserait l'API OpenMeteo pour obtenir une tuile.
    // Pour cet exemple, on ne fait rien si l'URL n'est pas fournie.
    // On pourrait ajouter une source raster avec une URL de tuiles météo.
    // Exemple : const weatherUrl = `https://api.open-meteo.com/v1/map/${selectedWeatherLayer}/...`;
    // Je laisse en commentaire pour que vous puissiez adapter.

    // Comme démo, on ajoute juste une couche de remplissage vide
    // Vous pouvez remplacer par une vraie source raster.
    console.log('Couche météo sélectionnée:', selectedWeatherLayer);

  }, [showWeather, selectedWeatherLayer, mapLoaded]);

  // --- Affichage des données SDIS (exemple) ---
  useEffect(() => {
    if (!map.current || !mapLoaded || !sdisData) return;

    const sourceId = 'sdis-source';
    const layerId = 'sdis-layer';

    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Supposons que sdisData soit un tableau d'objets avec lat, lon, nom, departement
    const features = sdisData.map(item => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.lon, item.lat]
      },
      properties: {
        name: item.nom,
        departement: item.departement,
        color: SDIS_COLORS[item.departement] || SDIS_COLORS.default
      }
    }));

    const geoJson = { type: 'FeatureCollection', features };

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geoJson,
    });

    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000',
      },
    });

    // Ajouter un popup au clic
    map.current.on('click', layerId, (e) => {
      const props = e.features[0].properties;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${props.name}</strong><br/>Département: ${props.departement}`)
        .addTo(map.current);
    });

    // Changer le curseur
    map.current.on('mouseenter', layerId, () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', layerId, () => {
      map.current.getCanvas().style.cursor = '';
    });

  }, [sdisData, mapLoaded]);

  // --- Gestion du changement de couche météo ---
  const handleWeatherChange = useCallback((layer) => {
    setSelectedWeatherLayer(layer);
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      {showWeather && (
        <div className="weather-controls">
          <label>Couche météo :</label>
          <select 
            value={selectedWeatherLayer} 
            onChange={(e) => handleWeatherChange(e.target.value)}
          >
            {WEATHER_LAYERS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Map;
