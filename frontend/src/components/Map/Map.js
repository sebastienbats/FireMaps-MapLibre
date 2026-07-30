import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import './Map.css';

// Configuration des couches météo Open-Meteo
const WEATHER_LAYERS = [
  { value: 'temperature_2m', label: '🌡️ Température', layer: 'temperature_2m' },
  { value: 'precipitation', label: '🌧️ Précipitations', layer: 'precipitation' },
  { value: 'cloud_cover', label: '☁️ Couverture nuageuse', layer: 'cloud_cover' },
  { value: 'wind_speed_10m', label: '💨 Vitesse du vent', layer: 'wind_speed_10m' },
  { value: 'pressure_msl', label: '📊 Pression', layer: 'pressure_msl' },
];

// Couleurs pour les marqueurs SDIS
const SDIS_COLORS = {
  doubs: '#e74c3c',
  gard: '#3498db',
  gironde: '#2ecc71',
  herault: '#f39c12',
  default: '#e67e22',
};

// Couleurs pour les points selon FRP
const FRP_POINT_COLORS = {
  low: '#f39c12',    // FRP 50-100
  high: '#e74c3c',   // FRP > 100
};

// Tailles des points selon FRP
const FRP_POINT_SIZES = {
  low: 10,   // FRP 50-100
  high: 14,  // FRP > 100
};

// Créer le GeoJSON des feux
const createFireGeoJSON = (fires) => {
  return {
    type: 'FeatureCollection',
    features: fires.map(fire => {
      const frp = fire.frp || 0;
      
      // Ne garder que les feux avec FRP > 50 pour les points
      // (les autres seront affichés dans la heatmap)
      const isHighIntensity = frp > 50;
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fire.longitude, fire.latitude]
        },
        properties: {
          confidence: fire.confidence || 'N/A',
          frp: frp,
          acq_date: fire.acq_date || 'N/A',
          acq_time: fire.acq_time || 'N/A',
          type: fire.type || '',
          bright_ti4: fire.bright_ti4 || 0,
          bright_ti5: fire.bright_ti5 || 0,
          scan: fire.scan || 0,
          track: fire.track || 0,
          satellite: fire.satellite || '',
          // Propriétés pour l'affichage
          isHighIntensity: isHighIntensity,
          intensity: frp > 100 ? 'Extrême' : frp > 50 ? 'Élevée' : 'Moyenne',
          // Taille et couleur selon FRP
          size: frp > 100 ? FRP_POINT_SIZES.high : frp > 50 ? FRP_POINT_SIZES.low : 0,
          color: frp > 100 ? FRP_POINT_COLORS.high : frp > 50 ? FRP_POINT_COLORS.low : 'transparent'
        }
      };
    })
  };
};

// Générer les flèches de vent
const generateWindArrows = (windData) => {
  if (!windData || !windData.data) return { type: 'FeatureCollection', features: [] };

  const { u: uGrid, v: vGrid } = windData.data;
  const { nx, ny, lo1, la1, dx, dy } = windData.header;

  const features = [];
  const step = 2;

  for (let j = 0; j < ny; j += step) {
    for (let i = 0; i < nx; i += step) {
      const u = uGrid[j]?.[i] || 0;
      const v = vGrid[j]?.[i] || 0;
      
      const speed = Math.sqrt(u * u + v * v);
      if (speed < 0.5) continue;

      const lon = lo1 + i * dx;
      const lat = la1 + j * dy;
      const angle = Math.atan2(v, u);
      const length = Math.min(speed * 0.2, 0.5);

      const startLon = lon;
      const startLat = lat;
      const endLon = lon + length * Math.cos(angle);
      const endLat = lat + length * Math.sin(angle);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [startLon, startLat],
            [endLon, endLat]
          ]
        },
        properties: {
          speed: speed,
          direction: (angle * 180 / Math.PI + 360) % 360,
          u: u,
          v: v
        }
      });

      const arrowSize = 0.05;
      const angle2 = angle + 2.5;
      const angle3 = angle - 2.5;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [endLon, endLat],
            [endLon - arrowSize * Math.cos(angle2), endLat - arrowSize * Math.sin(angle2)]
          ]
        },
        properties: { type: 'arrow-head' }
      });
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [endLon, endLat],
            [endLon - arrowSize * Math.cos(angle3), endLat - arrowSize * Math.sin(angle3)]
          ]
        },
        properties: { type: 'arrow-head' }
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: features
  };
};

// Générer les marqueurs SDIS
const createSdisGeoJSON = (sdisData) => {
  if (!sdisData || sdisData.length === 0) return { type: 'FeatureCollection', features: [] };

  const features = sdisData.map(item => {
    const properties = item.properties || {};
    const geometry = item.geometry || {};
    const coords = geometry.coordinates || [];
    
    const nom = properties.nom || properties.name || properties.libelle || 'Caserne SDIS';
    const adresse = properties.adresse || properties.address || '';
    const ville = properties.ville || properties.city || '';
    const codePostal = properties.code_postal || properties.postal_code || '';
    const departement = properties.departement || properties.dept || '';

    let color = SDIS_COLORS.default;
    if (departement === 'Doubs' || departement === '25') color = SDIS_COLORS.doubs;
    else if (departement === 'Gard' || departement === '30') color = SDIS_COLORS.gard;
    else if (departement === 'Gironde' || departement === '33') color = SDIS_COLORS.gironde;
    else if (departement === 'Hérault' || departement === '34') color = SDIS_COLORS.herault;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coords.length === 2 ? coords : [0, 0]
      },
      properties: {
        nom: nom,
        adresse: adresse,
        ville: ville,
        codePostal: codePostal,
        departement: departement,
        color: color,
        source: item.source || 'SDIS'
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features: features
  };
};

// === FONCTION POUR CRÉER L'ICÔNE FEU AVEC CANVAS (pour les points high intensity) ===
const createFireIcon = (size = 32, color = '#e74c3c') => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Effacer le canvas
  ctx.clearRect(0, 0, size, size);
  
  // Dessiner l'icône 🔥 avec un effet de lueur
  const fontSize = size * 0.7;
  ctx.font = `${fontSize}px Arial, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Effet de lueur selon la couleur
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.3;
  
  // Dessiner le texte
  ctx.fillText('🔥', size / 2, size / 2 + size * 0.05);
  
  return canvas;
};

const Map = ({
  fires,
  showHeatmap,
  showSdis,
  darkMode,
  alerts,
  showWind = false,
  windData = null,
  onWindToggle,
  activeWeatherLayers = [],
  weatherOpacity = 0.6,
  sdisLayers = [],
}) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const weatherSourcesRef = useRef({});
  const windIntervalRef = useRef(null);
  const sdisSourceId = 'sdis-source';
  const sdisLayerId = 'sdis-layer';
  const [omProtocolReady, setOmProtocolReady] = useState(false);
  const animationRef = useRef(null);
  const highIntensityLayerId = 'fires-high-intensity';

  // === VÉRIFICATION ET INITIALISATION DU PROTOCOLE OM ===
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OMWeatherMapLayer) {
      console.log('🌦️ OMWeatherMapLayer chargé via UNPKG');
      
      if (maplibregl && typeof maplibregl.addProtocol === 'function') {
        maplibregl.addProtocol('om', window.OMWeatherMapLayer.omProtocol);
        setOmProtocolReady(true);
        console.log('✅ Protocole OM enregistré');
      }
    } else {
      console.warn('⚠️ OMWeatherMapLayer non chargé');
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@openmeteo/weather-map-layer@0.0.20/dist/index.js';
      script.onload = () => {
        console.log('✅ OMWeatherMapLayer chargé dynamiquement');
        if (window.OMWeatherMapLayer && maplibregl) {
          maplibregl.addProtocol('om', window.OMWeatherMapLayer.omProtocol);
          setOmProtocolReady(true);
          console.log('✅ Protocole OM enregistré (chargement dynamique)');
        }
      };
      script.onerror = () => {
        console.error('❌ Échec du chargement dynamique de OMWeatherMapLayer');
      };
      document.head.appendChild(script);
    }
  }, []);

  // === INITIALISATION DE LA CARTE ===
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    console.log('🗺️ Initialisation de la carte MapLibre...');

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          }
        ]
      },
      center: [2.2, 46.6],
      zoom: 6,
      attributionControl: false,
    });

    // === CONTRÔLE D'ATTRIBUTION PERSONNALISÉ ===
    mapRef.current.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: [
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        'Données météo © <a href="https://open-meteo.com/" target="_blank">Open‑Meteo</a>',
      ],
    }), 'bottom-right');

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      console.log('✅ Carte MapLibre chargée');
      setMapLoaded(true);

      // === SOURCE POUR LES FEUX ===
      mapRef.current.addSource('fires', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // === 1. HEATMAP - Vue d'ensemble de la densité ===
      mapRef.current.addLayer({
        id: 'fires-heatmap',
        type: 'heatmap',
        source: 'fires',
        maxzoom: 15,
        paint: {
          // Poids de la heatmap basé sur FRP
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'frp'],
            0, 0,
            10, 0.5,
            50, 1,
            100, 2
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3,
            12, 5
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgba(103,169,207,0.5)',
            0.4, 'rgba(209,229,240,0.7)',
            0.6, 'rgba(253,219,199,0.8)',
            0.8, 'rgba(239,138,98,0.9)',
            0.9, 'rgba(255,201,75,0.95)',
            1, 'rgba(255,0,0,1)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            9, 20,
            12, 40
          ],
          'heatmap-opacity': showHeatmap ? 0.8 : 0,
        }
      });

      // === 2. POINTS POUR LES FEUX INTENSES (FRP > 50) ===
      // Ajouter l'icône 🔥 pour les feux intenses
      const highIntensityIcon = createFireIcon(32, '#e74c3c');
      const highIntensityData = highIntensityIcon.toDataURL('image/png');
      
      mapRef.current.loadImage(highIntensityData, (error, image) => {
        if (error) {
          console.error('❌ Erreur chargement icône:', error);
          // Fallback: utiliser des cercles
          mapRef.current.addLayer({
            id: highIntensityLayerId,
            type: 'circle',
            source: 'fires',
            filter: ['>', ['get', 'frp'], 50],
            paint: {
              'circle-radius': 10,
              'circle-color': '#e74c3c',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            },
          });
          return;
        }
        
        mapRef.current.addImage('fire-icon-high', image);
        
        mapRef.current.addLayer({
          id: highIntensityLayerId,
          type: 'symbol',
          source: 'fires',
          filter: ['>', ['get', 'frp'], 50],
          layout: {
            'icon-image': 'fire-icon-high',
            'icon-size': 0.7,
            'icon-allow-overlap': true,
          },
          paint: {
            'icon-opacity': 0.9,
          },
        });
      });

      // === 3. CERCLES POUR LES FEUX MOYENS (FRP 10-50) ===
      mapRef.current.addLayer({
        id: 'fires-medium',
        type: 'circle',
        source: 'fires',
        filter: ['all', ['>', ['get', 'frp'], 10], ['<=', ['get', 'frp'], 50]],
        paint: {
          'circle-radius': 6,
          'circle-color': '#f39c12',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8,
        },
      });

      // === 4. PETITS CERCLES POUR LES FEUX FAIBLES (FRP < 10) ===
      mapRef.current.addLayer({
        id: 'fires-low',
        type: 'circle',
        source: 'fires',
        filter: ['<', ['get', 'frp'], 10],
        paint: {
          'circle-radius': 4,
          'circle-color': '#3498db',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.6,
        },
      });

      // === POPUPS POUR LES FEUX INTENSES ===
      mapRef.current.on('click', highIntensityLayerId, (e) => {
        const props = e.features[0].properties;
        const popupContent = `
          <strong>🔥 Feu intense</strong><br/>
          <b>FRP:</b> ${props.frp.toFixed(1)} MW<br/>
          <b>Confiance:</b> ${props.confidence}<br/>
          <b>Date:</b> ${props.acq_date}<br/>
          <b>Heure:</b> ${props.acq_time}<br/>
          ${props.type ? `<b>Type:</b> ${props.type}` : ''}<br/>
          <b>Satellite:</b> ${props.satellite || 'N/A'}<br/>
          <hr style="margin:4px 0;border:none;border-top:1px solid #eee;"/>
          <b>Coordonnées:</b><br/>
          Lat: ${e.lngLat.lat.toFixed(4)}, Lon: ${e.lngLat.lng.toFixed(4)}
        `;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(mapRef.current);
      });

      // === POPUPS POUR LES FEUX MOYENS ===
      mapRef.current.on('click', 'fires-medium', (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>🔥 Feu</strong><br/>
            <b>FRP:</b> ${props.frp.toFixed(1)} MW<br/>
            <b>Confiance:</b> ${props.confidence}<br/>
            <b>Date:</b> ${props.acq_date}<br/>
            <b>Heure:</b> ${props.acq_time}<br/>
          `)
          .addTo(mapRef.current);
      });

      // === INTERACTIONS SOURIS ===
      [highIntensityLayerId, 'fires-medium', 'fires-low'].forEach(layerId => {
        mapRef.current.on('mouseenter', layerId, () => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        });
        mapRef.current.on('mouseleave', layerId, () => {
          mapRef.current.getCanvas().style.cursor = '';
        });
      });

      // === SOURCE ET COUCHE SDIS ===
      mapRef.current.addSource(sdisSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      mapRef.current.addLayer({
        id: sdisLayerId,
        type: 'circle',
        source: sdisSourceId,
        paint: {
          'circle-radius': 10,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      mapRef.current.on('click', sdisLayerId, (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>🚒 ${props.nom}</strong><br/>
            ${props.adresse ? `<b>Adresse:</b> ${props.adresse}<br/>` : ''}
            ${props.ville ? `<b>Ville:</b> ${props.ville}<br/>` : ''}
            ${props.codePostal ? `<b>Code postal:</b> ${props.codePostal}<br/>` : ''}
            ${props.departement ? `<b>Département:</b> ${props.departement}<br/>` : ''}
          `)
          .addTo(mapRef.current);
      });

      mapRef.current.on('mouseenter', sdisLayerId, () => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      });
      mapRef.current.on('mouseleave', sdisLayerId, () => {
        mapRef.current.getCanvas().style.cursor = '';
      });

      // === SOURCE ET COUCHE ALERTES ===
      mapRef.current.addSource('alerts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      mapRef.current.addLayer({
        id: 'alerts-layer',
        type: 'circle',
        source: 'alerts',
        paint: {
          'circle-radius': 20,
          'circle-color': '#e74c3c',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#e74c3c',
        },
      });

      mapRef.current.on('click', 'alerts-layer', (e) => {
        const count = e.features[0].properties.count;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`🔥 Hotspot : ${count} feux dans un rayon de 5 km`)
          .addTo(mapRef.current);
      });

      // === MÉTÉO AVEC OM PROTOCOL ===
      if (omProtocolReady) {
        addWeatherSources();
      } else {
        console.log('⏳ Attente du protocole OM pour les couches météo...');
        setTimeout(() => {
          if (omProtocolReady) {
            addWeatherSources();
          }
        }, 1000);
      }

      // === VENT ===
      mapRef.current.addSource('wind-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      mapRef.current.addLayer({
        id: 'wind-arrows',
        type: 'line',
        source: 'wind-source',
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'speed'],
            0, '#3498db',
            5, '#2ecc71',
            10, '#f1c40f',
            15, '#e67e22',
            20, '#e74c3c'
          ],
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });

      mapRef.current.addLayer({
        id: 'wind-arrow-heads',
        type: 'line',
        source: 'wind-source',
        filter: ['==', ['get', 'type'], 'arrow-head'],
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'speed'],
            0, '#3498db',
            5, '#2ecc71',
            10, '#f1c40f',
            15, '#e67e22',
            20, '#e74c3c'
          ],
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });

      // Charger les données initiales
      if (fires && fires.length > 0) updateFireMarkers(fires);
      if (sdisLayers && sdisLayers.length > 0) updateSdisMarkers(sdisLayers);
      if (windData && showWind) updateWindLayer(windData);

      startWindAnimation();
      startFireAnimation();
    });

    return () => {
      stopWindAnimation();
      stopFireAnimation();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  // === MISE À JOUR DES FEUX ===
  const updateFireMarkers = (fires) => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('fires');
    if (source) {
      const geoJSON = createFireGeoJSON(fires);
      source.setData(geoJSON);
    }
  };

  useEffect(() => {
    updateFireMarkers(fires);
  }, [fires, mapLoaded]);

  // === MISE À JOUR DE LA HEATMAP (toggle) ===
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    try {
      mapRef.current.setPaintProperty('fires-heatmap', 'heatmap-opacity', showHeatmap ? 0.8 : 0);
    } catch (e) {
      // Ignorer si la couche n'existe pas encore
    }
  }, [showHeatmap, mapLoaded]);

  // === MISE À JOUR DES ALERTES ===
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('alerts');
    if (!source) return;

    if (!alerts || alerts.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: alerts.map(alert => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [alert.lng, alert.lat]
        },
        properties: { count: alert.count }
      }))
    });
  }, [alerts, mapLoaded]);

  // === MISE À JOUR DES SDIS ===
  const updateSdisMarkers = (sdisData) => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource(sdisSourceId);
    if (source) {
      const allFeatures = [];
      sdisData.forEach(layer => {
        if (layer.data && layer.data.features) {
          allFeatures.push(...layer.data.features);
        }
      });
      
      source.setData({
        type: 'FeatureCollection',
        features: allFeatures
      });
    }
  };

  useEffect(() => {
    if (sdisLayers && sdisLayers.length > 0 && mapLoaded) {
      updateSdisMarkers(sdisLayers);
    } else if (mapLoaded) {
      const source = mapRef.current.getSource(sdisSourceId);
      if (source) source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [sdisLayers, mapLoaded]);

  // === AJOUT DES SOURCES MÉTÉO OM ===
  const addWeatherSources = () => {
    if (!mapRef.current || !omProtocolReady) return;

    console.log('🌦️ Ajout des sources météo OM...');

    WEATHER_LAYERS.forEach(weatherLayer => {
      const sourceId = `weather-om-${weatherLayer.value}`;
      const layerId = `weather-layer-om-${weatherLayer.value}`;
      
      try {
        const omUrl = `https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=${weatherLayer.layer}`;
        
        mapRef.current.addSource(sourceId, {
          url: `om://${omUrl}`,
          type: 'raster',
          maxzoom: 12,
        });

        mapRef.current.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.6,
          },
        });

        console.log(`✅ Source OM ajoutée: ${weatherLayer.layer}`);
      } catch (error) {
        console.warn(`⚠️ Erreur lors de l'ajout de la source OM ${weatherLayer.layer}:`, error);
      }
    });
  };

  // === GESTION DES COUCHES MÉTÉO OM ===
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !omProtocolReady) return;

    const activeLayerValues = activeWeatherLayers.map(l => l.value);

    Object.keys(weatherSourcesRef.current).forEach(key => {
      if (!activeLayerValues.includes(key)) {
        try {
          if (mapRef.current.getLayer(`weather-layer-om-${key}`)) {
            mapRef.current.removeLayer(`weather-layer-om-${key}`);
          }
          if (mapRef.current.getSource(`weather-om-${key}`)) {
            mapRef.current.removeSource(`weather-om-${key}`);
          }
        } catch (e) { /* ignore */ }
        delete weatherSourcesRef.current[key];
      }
    });

    activeWeatherLayers.forEach(layerDef => {
      const fullDef = WEATHER_LAYERS.find(w => w.value === layerDef.value);
      if (!fullDef) return;

      const sourceId = `weather-om-${fullDef.value}`;
      const layerId = `weather-layer-om-${fullDef.value}`;
      const opacity = layerDef.opacity || weatherOpacity;

      try {
        if (!mapRef.current.getSource(sourceId)) {
          const omUrl = `https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=${fullDef.layer}`;
          mapRef.current.addSource(sourceId, {
            url: `om://${omUrl}`,
            type: 'raster',
            maxzoom: 12,
          });
        }

        if (!mapRef.current.getLayer(layerId)) {
          mapRef.current.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': opacity,
            },
          });
        } else {
          mapRef.current.setPaintProperty(layerId, 'raster-opacity', opacity);
        }

        weatherSourcesRef.current[fullDef.value] = true;
      } catch (error) {
        console.warn(`⚠️ Erreur avec la couche OM ${fullDef.value}:`, error);
      }
    });
  }, [activeWeatherLayers, weatherOpacity, mapLoaded, omProtocolReady]);

  // === VENT ===
  const updateWindLayer = (windData) => {
    if (!mapRef.current || !mapLoaded || !windData) return;
    const source = mapRef.current.getSource('wind-source');
    if (source) source.setData(generateWindArrows(windData));
  };

  const startWindAnimation = () => {
    stopWindAnimation();
    windIntervalRef.current = setInterval(() => {
      if (showWind && windData) updateWindLayer(windData);
    }, 5000);
  };

  const stopWindAnimation = () => {
    if (windIntervalRef.current) {
      clearInterval(windIntervalRef.current);
      windIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (showWind && windData && mapLoaded) {
      updateWindLayer(windData);
    } else if (!showWind && mapLoaded) {
      const source = mapRef.current.getSource('wind-source');
      if (source) source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [showWind, windData, mapLoaded]);

  // === ANIMATION DES POINTS INTENSES ===
  const startFireAnimation = () => {
    stopFireAnimation();
    
    let opacity = 0.9;
    let opacityDirection = 0.01;
    let scale = 0.7;
    let scaleDirection = 0.01;
    
    const animate = () => {
      if (!mapRef.current) {
        stopFireAnimation();
        return;
      }
      
      // Mettre à jour l'opacité (effet de respiration)
      opacity += opacityDirection;
      if (opacity > 0.95) {
        opacityDirection = -0.01;
      } else if (opacity < 0.7) {
        opacityDirection = 0.01;
      }
      
      // Mettre à jour l'échelle (pulsation)
      scale += scaleDirection;
      if (scale > 0.85) {
        scaleDirection = -0.01;
      } else if (scale < 0.55) {
        scaleDirection = 0.01;
      }
      
      // Appliquer à la couche des feux intenses
      try {
        if (mapRef.current.getLayer(highIntensityLayerId)) {
          mapRef.current.setPaintProperty(highIntensityLayerId, 'icon-opacity', opacity);
          mapRef.current.setLayoutProperty(highIntensityLayerId, 'icon-size', scale);
        }
      } catch (e) {
        // Ignorer si la couche n'existe pas
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const stopFireAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // === MODE SOMBRE ===
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const tileLayers = mapRef.current.getStyle().layers;
    tileLayers.forEach(layer => {
      if (layer.type === 'raster' && layer.id === 'osm') {
        if (darkMode) {
          mapRef.current.setPaintProperty(layer.id, 'raster-opacity', 0.7);
          mapRef.current.setPaintProperty(layer.id, 'raster-brightness-min', 0.2);
          mapRef.current.setPaintProperty(layer.id, 'raster-brightness-max', 0.8);
        } else {
          mapRef.current.setPaintProperty(layer.id, 'raster-opacity', 1);
          mapRef.current.setPaintProperty(layer.id, 'raster-brightness-min', 0);
          mapRef.current.setPaintProperty(layer.id, 'raster-brightness-max', 1);
        }
      }
    });

    if (mapRef.current.getLayer('wind-arrows')) {
      const colorExpression = [
        'interpolate',
        ['linear'],
        ['get', 'speed'],
        0, darkMode ? '#5dade2' : '#3498db',
        5, darkMode ? '#58d68d' : '#2ecc71',
        10, darkMode ? '#f4d03f' : '#f1c40f',
        15, darkMode ? '#eb984e' : '#e67e22',
        20, darkMode ? '#ec7063' : '#e74c3c'
      ];
      mapRef.current.setPaintProperty('wind-arrows', 'line-color', colorExpression);
      mapRef.current.setPaintProperty('wind-arrow-heads', 'line-color', colorExpression);
    }
  }, [darkMode, mapLoaded]);

  // === REDIMENSIONNEMENT ===
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={mapContainer} className="map-container" id="map" />;
};

export default Map;
