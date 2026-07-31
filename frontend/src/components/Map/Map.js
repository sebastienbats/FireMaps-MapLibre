import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Map.css';
import WindLayerAdapter from './WindLayerAdapter';
import { SDIS_DATA, getSdisColor } from '../../data/sdisData';
import { getMaplibregl, waitForMaplibre } from '../../lib/maplibre';

const WEATHER_LAYERS = [
  { value: 'temperature_2m', label: '🌡️ Température', unit: '°C' },
  { value: 'precipitation', label: '🌧️ Précipitations', unit: 'mm' },
  { value: 'cloud_cover', label: '☁️ Couverture nuageuse', unit: '%' },
  { value: 'wind_speed_10m', label: '💨 Vitesse du vent', unit: 'km/h' },
  { value: 'pressure_msl', label: '📊 Pression', unit: 'hPa' },
  { value: 'relative_humidity_2m', label: '💧 Humidité', unit: '%' },
  { value: 'visibility', label: '👁️ Visibilité', unit: 'km' },
];

const FRP_POINT_COLORS = { low: '#f39c12', medium: '#e67e22', high: '#e74c3c' };
const FRP_POINT_SIZES = { low: 4, medium: 6, high: 10, extreme: 14 };

const createFireGeoJSON = (fireData) => {
  if (fireData?.type === 'FeatureCollection') return fireData;
  if (!Array.isArray(fireData)) return { type: 'FeatureCollection', features: [] };
  
  return {
    type: 'FeatureCollection',
    features: fireData.map(fire => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [fire.longitude, fire.latitude] },
      properties: {
        frp: fire.frp || 0,
        confidence: fire.confidence || 'N/A',
        acq_date: fire.acq_date || 'N/A',
        acq_time: fire.acq_time || 'N/A',
        satellite: fire.satellite || '',
        intensity: fire.frp > 100 ? 'Extrême' : fire.frp > 50 ? 'Élevée' : fire.frp > 10 ? 'Moyenne' : 'Faible',
        size: fire.frp > 100 ? 14 : fire.frp > 50 ? 10 : fire.frp > 10 ? 6 : 4,
        color: fire.frp > 100 ? '#e74c3c' : fire.frp > 50 ? '#e67e22' : '#f39c12'
      }
    }))
  };
};

const createSdisGeoJSON = (sdisData) => {
  if (!sdisData || sdisData.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const features = sdisData.map(item => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
    properties: {
      ...item,
      color: getSdisColor(item.departement)
    }
  }));

  return { type: 'FeatureCollection', features };
};

const createFireIcon = (size = 32) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.font = `${size * 0.7}px Arial, "Segoe UI Emoji"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur = size * 0.3;
  ctx.fillText('🔥', size / 2, size / 2 + size * 0.05);
  return canvas;
};

const createSdisIcon = (size = 40) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = size * 0.4;
  
  const gradient = ctx.createRadialGradient(center - 4, center - 4, 2, center, center, radius);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.7, '#e74c3c');
  gradient.addColorStop(1, '#c0392b');
  
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.font = `${size * 0.45}px Arial, "Segoe UI Emoji"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText('🚒', center, center + 1);
  return canvas;
};

const generateWeatherUrl = (layer, opacity = 0.6) => `om://${layer}/0/0/0?opacity=${opacity}`;

const Map = ({
  fireData,
  showHeatmap = true,
  darkMode = false,
  showWeather = false,
  activeWeatherLayers = [],
  weatherOpacity = 0.6,
  onWeatherToggle,
  showSdis = true,
  sdisData = SDIS_DATA,
  showWind = false,
}) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [omProtocolReady, setOmProtocolReady] = useState(false);
  const animationRef = useRef(null);
  const weatherSourcesRef = useRef({});
  const weatherLayersRef = useRef({});
  const sdisSourceId = 'sdis-source';

  const getMaplibreglInstance = useCallback(() => {
    return getMaplibregl();
  }, []);

  useEffect(() => {
    const initOmProtocol = () => {
      try {
        const maplibregl = getMaplibreglInstance();
        if (maplibregl && window.OMWeatherMapLayer) {
          maplibregl.addProtocol('om', window.OMWeatherMapLayer.omProtocol);
          setOmProtocolReady(true);
          console.log('✅ Protocole OM enregistré');
          return true;
        }
        return false;
      } catch (e) { 
        console.warn('⚠️ Erreur protocole OM:', e);
        return false; 
      }
    };
    
    waitForMaplibre(5000)
      .then(() => {
        initOmProtocol();
      })
      .catch((err) => {
        console.warn('⚠️ MapLibre non chargé:', err);
      });
    
    const interval = setInterval(() => { 
      if (!omProtocolReady) initOmProtocol(); 
    }, 3000);
    
    return () => clearInterval(interval);
  }, [getMaplibreglInstance, omProtocolReady]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const maplibregl = await waitForMaplibre(10000);
        if (!maplibregl) {
          console.error('❌ MapLibre GL non disponible');
          return;
        }

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
                attribution: '© OpenStreetMap'
              }
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
          },
          center: [2.2, 46.6],
          zoom: 6,
          attributionControl: false,
        });

        mapRef.current.addControl(new maplibregl.AttributionControl({
          compact: true,
          customAttribution: [
            '© OpenStreetMap',
            'Données météo © Open‑Meteo',
            'Données feux © NASA FIRMS',
            'Données SDIS © Ministère de l\'Intérieur'
          ]
        }), 'bottom-right');

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        mapRef.current.on('load', () => {
          console.log('✅ Carte MapLibre chargée');
          setMapLoaded(true);
          initializeLayers();
        });

        mapRef.current.on('error', (e) => {
          console.warn('⚠️ Erreur MapLibre:', e);
        });

      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la carte:', error);
      }
    };

    initMap();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (mapRef.current) { 
        try {
          mapRef.current.remove(); 
        } catch (e) {
          console.warn('⚠️ Erreur lors de la suppression de la carte:', e);
        }
        mapRef.current = null; 
      }
    };
  }, []);

  const initializeLayers = () => {
    if (!mapRef.current) return;
    const maplibregl = getMaplibreglInstance();
    if (!maplibregl) return;

    mapRef.current.addSource('fires', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    mapRef.current.addLayer({
      id: 'fires-heatmap',
      type: 'heatmap',
      source: 'fires',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 0, 0, 10, 0.5, 50, 1, 100, 2],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3, 12, 5],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgba(103,169,207,0.5)',
          0.4, 'rgba(209,229,240,0.7)',
          0.6, 'rgba(253,219,199,0.8)',
          0.8, 'rgba(239,138,98,0.9)',
          0.9, 'rgba(255,201,75,0.95)',
          1, 'rgba(255,0,0,1)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20, 12, 40],
        'heatmap-opacity': showHeatmap ? 0.8 : 0
      }
    });

    const fireIcon = createFireIcon(32);
    mapRef.current.loadImage(fireIcon.toDataURL('image/png'), (err, image) => {
      if (err) return;
      mapRef.current.addImage('fire-icon', image);
      mapRef.current.addLayer({
        id: 'fires-high',
        type: 'symbol',
        source: 'fires',
        filter: ['>', ['get', 'frp'], 50],
        layout: { 'icon-image': 'fire-icon', 'icon-size': 0.7, 'icon-allow-overlap': true },
        paint: { 'icon-opacity': 0.9 }
      });
    });

    mapRef.current.addLayer({
      id: 'fires-medium',
      type: 'circle',
      source: 'fires',
      filter: ['all', ['>', ['get', 'frp'], 10], ['<=', ['get', 'frp'], 50]],
      paint: { 'circle-radius': 6, 'circle-color': '#f39c12', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-opacity': 0.8 }
    });

    mapRef.current.addLayer({
      id: 'fires-low',
      type: 'circle',
      source: 'fires',
      filter: ['<', ['get', 'frp'], 10],
      paint: { 'circle-radius': 4, 'circle-color': '#3498db', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-opacity': 0.6 }
    });

    ['fires-high', 'fires-medium', 'fires-low'].forEach(layerId => {
      mapRef.current.on('click', layerId, (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>🔥 ${props.frp > 100 ? 'Feu extrême' : props.frp > 50 ? 'Feu intense' : props.frp > 10 ? 'Feu moyen' : 'Feu faible'}</strong><br/>
            <b>FRP:</b> ${props.frp.toFixed(1)} MW<br/>
            <b>Confiance:</b> ${props.confidence}<br/>
            <b>Date:</b> ${props.acq_date}<br/>
            <b>Satellite:</b> ${props.satellite || 'N/A'}
          `)
          .addTo(mapRef.current);
      });
      mapRef.current.on('mouseenter', layerId, () => { mapRef.current.getCanvas().style.cursor = 'pointer'; });
      mapRef.current.on('mouseleave', layerId, () => { mapRef.current.getCanvas().style.cursor = ''; });
    });

    const sdisIcon = createSdisIcon(40);
    mapRef.current.loadImage(sdisIcon.toDataURL('image/png'), (err, image) => {
      if (err) return;
      mapRef.current.addImage('sdis-icon', image);
      mapRef.current.addSource(sdisSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapRef.current.addLayer({
        id: 'sdis-layer',
        type: 'symbol',
        source: sdisSourceId,
        layout: { 'icon-image': 'sdis-icon', 'icon-size': 0.8, 'icon-allow-overlap': true },
        paint: { 'icon-opacity': showSdis ? 0.9 : 0 }
      });
      
      mapRef.current.on('click', 'sdis-layer', (e) => {
        const p = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>🚒 ${p.nom}</strong><br/>
            ${p.type ? `<b>Type:</b> ${p.type}<br/>` : ''}
            ${p.adresse ? `<b>Adresse:</b> ${p.adresse}<br/>` : ''}
            ${p.ville ? `<b>Ville:</b> ${p.ville} ${p.codePostal || ''}<br/>` : ''}
            <b>Département:</b> ${p.departement}<br/>
            ${p.telephone ? `<b>Tél:</b> <a href="tel:${p.telephone}">${p.telephone}</a><br/>` : ''}
            ${p.capacite ? `<b>Capacité:</b> ${p.capacite} pompiers` : ''}
          `)
          .addTo(mapRef.current);
      });
      mapRef.current.on('mouseenter', 'sdis-layer', () => { mapRef.current.getCanvas().style.cursor = 'pointer'; });
      mapRef.current.on('mouseleave', 'sdis-layer', () => { mapRef.current.getCanvas().style.cursor = ''; });
    });

    if (omProtocolReady) {
      WEATHER_LAYERS.forEach(layer => {
        const sid = `weather-${layer.value}`;
        const lid = `${sid}-layer`;
        mapRef.current.addSource(sid, { type: 'raster', tiles: [generateWeatherUrl(layer.value, weatherOpacity)], tileSize: 256 });
        mapRef.current.addLayer({ id: lid, type: 'raster', source: sid, paint: { 'raster-opacity': activeWeatherLayers.includes(layer.value) ? weatherOpacity : 0 } }, 'osm');
        weatherSourcesRef.current[layer.value] = sid;
        weatherLayersRef.current[layer.value] = lid;
      });
    }

    if (fireData?.features?.length > 0) updateFireMarkers(fireData);
    if (sdisData?.length > 0) updateSdisMarkers(sdisData);
    startFireAnimation();
  };

  const updateFireMarkers = (data) => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('fires');
    if (source) source.setData(createFireGeoJSON(data));
  };

  const updateSdisMarkers = (data) => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource(sdisSourceId);
    if (source) source.setData(createSdisGeoJSON(data));
  };

  const startFireAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    let tick = 0;
    let lastTime = 0;
    
    const animate = (timestamp) => {
      if (!mapRef.current) {
        animationRef.current = null;
        return;
      }
      
      if (timestamp - lastTime >= 16) {
        const pulse = 0.7 + 0.3 * Math.sin(tick * 0.05);
        
        ['fires-high', 'fires-medium', 'fires-low'].forEach(id => {
          if (mapRef.current.getLayer(id)) {
            try {
              const property = id === 'fires-high' ? 'icon-opacity' : 'circle-opacity';
              mapRef.current.setPaintProperty(id, property, pulse);
              
              if (id === 'fires-medium') {
                mapRef.current.setPaintProperty(id, 'circle-radius', 5 + 2 * Math.sin(tick * 0.05 + 0.5));
              }
            } catch (e) {
              // Ignorer les erreurs de mise à jour
            }
          }
        });
        
        tick++;
        lastTime = timestamp;
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

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      {!mapLoaded && <div className="map-loading"><div className="spinner"></div><p>Chargement de la carte...</p></div>}
      
      {mapLoaded && (
        <WindLayerAdapter 
          map={mapRef.current} 
          darkMode={darkMode}
          showWind={showWind}
        />
      )}
    </div>
  );
};

export default Map;
