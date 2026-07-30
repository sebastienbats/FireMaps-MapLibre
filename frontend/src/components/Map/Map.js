import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { omProtocol } from '@openmeteo/weather-map-layer';
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

// Créer le GeoJSON des feux
const createFireGeoJSON = (fires) => {
  return {
    type: 'FeatureCollection',
    features: fires.map(fire => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [fire.longitude, fire.latitude]
      },
      properties: {
        confidence: fire.confidence || 'N/A',
        frp: fire.frp || 0,
        acq_date: fire.acq_date || 'N/A',
        acq_time: fire.acq_time || 'N/A',
        type: fire.type || ''
      }
    }))
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

  // === INITIALISATION DE LA CARTE ===
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    console.log('🗺️ Initialisation de la carte MapLibre...');

    maplibregl.addProtocol('om', omProtocol);

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
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
      attributionControl: true,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current.addControl(new maplibregl.AttributionControl(), 'bottom-right');

    mapRef.current.on('load', () => {
      console.log('✅ Carte MapLibre chargée');
      setMapLoaded(true);

      // === FEUX ===
      mapRef.current.addSource('fires', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      mapRef.current.addLayer({
        id: 'fires-layer',
        type: 'circle',
        source: 'fires',
        paint: {
          'circle-radius': 8,
          'circle-color': '#e67e22',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8,
        },
      });

      mapRef.current.on('click', 'fires-layer', (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>🔥 Feu</strong><br/>
            <b>Confiance:</b> ${props.confidence}<br/>
            <b>FRP:</b> ${props.frp.toFixed(1)} MW<br/>
            <b>Date:</b> ${props.acq_date}<br/>
            ${props.type ? `<b>Type:</b> ${props.type}` : ''}
          `)
          .addTo(mapRef.current);
      });

      mapRef.current.on('mouseenter', 'fires-layer', () => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      });
      mapRef.current.on('mouseleave', 'fires-layer', () => {
        mapRef.current.getCanvas().style.cursor = '';
      });

      // === ALERTES ===
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

      // === SDIS ===
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

      // === MÉTÉO ===
      WEATHER_LAYERS.forEach(weatherLayer => {
        const sourceId = `weather-${weatherLayer.value}`;
        mapRef.current.addSource(sourceId, {
          type: 'raster',
          tiles: [`https://api.open-meteo.com/v1/map/{z}/{x}/{y}/${weatherLayer.layer}.png`],
          tileSize: 256,
          maxzoom: 8,
          minzoom: 3,
        });
      });

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
    });

    return () => {
      stopWindAnimation();
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
    if (source) source.setData(createFireGeoJSON(fires));
  };

  useEffect(() => {
    updateFireMarkers(fires);
  }, [fires, mapLoaded]);

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
  }, [sdisLayers, mapLoaded, showSdis]);

  // === GESTION DES COUCHES MÉTÉO ===
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const activeLayerValues = activeWeatherLayers.map(l => l.value);

    Object.keys(weatherSourcesRef.current).forEach(key => {
      if (!activeLayerValues.includes(key)) {
        try {
          if (mapRef.current.getLayer(`weather-layer-${key}`)) {
            mapRef.current.removeLayer(`weather-layer-${key}`);
          }
        } catch (e) { /* ignore */ }
        delete weatherSourcesRef.current[key];
      }
    });

    activeWeatherLayers.forEach(layerDef => {
      const fullDef = WEATHER_LAYERS.find(w => w.value === layerDef.value);
      if (!fullDef) return;

      const sourceId = `weather-${fullDef.value}`;
      const layerId = `weather-layer-${fullDef.value}`;
      const opacity = layerDef.opacity || weatherOpacity;

      if (!mapRef.current.getSource(sourceId)) {
        mapRef.current.addSource(sourceId, {
          type: 'raster',
          tiles: [`https://api.open-meteo.com/v1/map/{z}/{x}/{y}/${fullDef.layer}.png`],
          tileSize: 256,
          maxzoom: 8,
          minzoom: 3,
        });
      }

      if (!mapRef.current.getLayer(layerId)) {
        mapRef.current.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: { 'raster-opacity': opacity },
        });
      } else {
        mapRef.current.setPaintProperty(layerId, 'raster-opacity', opacity);
      }

      weatherSourcesRef.current[fullDef.value] = true;
    });
  }, [activeWeatherLayers, weatherOpacity, mapLoaded]);

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
