import { useEffect, useRef, useState } from 'react';
import { getMaplibregl } from '../../lib/maplibre';

const WIND_COLORS = {
  low: '#3498db',
  medium: '#2ecc71',
  high: '#f1c40f',
  extreme: '#e74c3c',
};

const WIND_SPEEDS = {
  low: 10,
  medium: 30,
  high: 50,
  extreme: 70,
};

const generateStreamlines = (windData, bounds, density = 30) => {
  if (!windData || !windData.data) return { type: 'FeatureCollection', features: [] };

  const { u: uGrid, v: vGrid } = windData.data;
  const { nx, ny, lo1, la1, dx, dy } = windData.header;

  const lons = Array.from({ length: nx }, (_, i) => lo1 + i * dx);
  const lats = Array.from({ length: ny }, (_, j) => la1 + j * dy);

  const features = [];
  const startPoints = [];
  const spacing = Math.max(lons.length, lats.length) / density;
  
  for (let i = 0; i < lons.length; i += spacing) {
    for (let j = 0; j < lats.length; j += spacing) {
      startPoints.push([lons[i], lats[j]]);
    }
  }

  startPoints.forEach((start) => {
    const path = traceStreamline(start, uGrid, vGrid, lons, lats, nx, ny, dx, dy);
    
    if (path.length > 5) {
      const avgSpeed = calculateAverageSpeed(path, uGrid, vGrid, lons, lats, nx, ny);
      
      let color = WIND_COLORS.low;
      if (avgSpeed > WIND_SPEEDS.high) color = WIND_COLORS.high;
      else if (avgSpeed > WIND_SPEEDS.medium) color = WIND_COLORS.medium;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
        properties: {
          speed: avgSpeed,
          color: color,
          density: path.length / 10,
        },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};

const traceStreamline = (startPoint, uGrid, vGrid, lons, lats, nx, ny, dx, dy) => {
  const path = [startPoint];
  let currentPoint = startPoint;
  const maxSteps = 200;
  const stepSize = 0.01;
  
  for (let step = 0; step < maxSteps; step++) {
    const i = Math.round((currentPoint[0] - lons[0]) / dx);
    const j = Math.round((currentPoint[1] - lats[0]) / dy);
    
    if (i < 0 || i >= nx || j < 0 || j >= ny) break;
    
    const u = interpolateGrid(currentPoint[0], currentPoint[1], uGrid, lons, lats, nx, ny);
    const v = interpolateGrid(currentPoint[0], currentPoint[1], vGrid, lons, lats, nx, ny);
    
    const speed = Math.sqrt(u * u + v * v);
    if (speed < 0.01) break;
    
    const newX = currentPoint[0] + (u / speed) * stepSize;
    const newY = currentPoint[1] + (v / speed) * stepSize;
    
    currentPoint = [newX, newY];
    path.push(currentPoint);
  }
  
  return path;
};

const interpolateGrid = (x, y, grid, lons, lats, nx, ny) => {
  const i = Math.floor((x - lons[0]) / (lons[1] - lons[0]));
  const j = Math.floor((y - lats[0]) / (lats[1] - lats[0]));
  
  if (i < 0 || i >= nx - 1 || j < 0 || j >= ny - 1) return 0;
  
  const x1 = lons[i], x2 = lons[i + 1];
  const y1 = lats[j], y2 = lats[j + 1];
  
  const q11 = grid[j]?.[i] || 0;
  const q12 = grid[j]?.[i + 1] || 0;
  const q21 = grid[j + 1]?.[i] || 0;
  const q22 = grid[j + 1]?.[i + 1] || 0;
  
  const wx = (x - x1) / (x2 - x1);
  const wy = (y - y1) / (y2 - y1);
  
  return (1 - wy) * ((1 - wx) * q11 + wx * q12) + wy * ((1 - wx) * q21 + wx * q22);
};

const calculateAverageSpeed = (path, uGrid, vGrid, lons, lats, nx, ny) => {
  let totalSpeed = 0;
  let count = 0;
  
  path.forEach(point => {
    const u = interpolateGrid(point[0], point[1], uGrid, lons, lats, nx, ny);
    const v = interpolateGrid(point[0], point[1], vGrid, lons, lats, nx, ny);
    totalSpeed += Math.sqrt(u * u + v * v);
    count++;
  });
  
  return count > 0 ? totalSpeed / count : 0;
};

const fetchWindData = async (bounds) => {
  try {
    const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
    const centerLon = (bounds.getEast() + bounds.getWest()) / 2;
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${centerLat}&longitude=${centerLon}&` +
      `current_weather=true&` +
      `timezone=Europe/Paris`
    );
    
    const data = await response.json();
    
    const windGrid = {
      header: {
        nx: 10,
        ny: 10,
        lo1: bounds.getWest(),
        la1: bounds.getSouth(),
        dx: (bounds.getEast() - bounds.getWest()) / 10,
        dy: (bounds.getNorth() - bounds.getSouth()) / 10,
      },
      data: {
        u: Array.from({ length: 10 }, (_, j) => 
          Array.from({ length: 10 }, (_, i) => {
            const speed = data.current_weather?.windspeed || 0;
            const direction = data.current_weather?.winddirection || 0;
            const angle = direction * Math.PI / 180;
            return speed * Math.sin(angle) * 0.1;
          })
        ),
        v: Array.from({ length: 10 }, (_, j) => 
          Array.from({ length: 10 }, (_, i) => {
            const speed = data.current_weather?.windspeed || 0;
            const direction = data.current_weather?.winddirection || 0;
            const angle = direction * Math.PI / 180;
            return speed * Math.cos(angle) * 0.1;
          })
        ),
      }
    };
    
    return windGrid;
  } catch (error) {
    console.error('❌ Erreur récupération vent:', error);
    return null;
  }
};

const WindLayer = ({ map, showWind, opacity = 0.8, onWindData, density = 30 }) => {
  const [windData, setWindData] = useState(null);
  const updateInterval = useRef(null);
  const sourceId = 'wind-streamlines';
  const layerId = 'wind-streamlines-layer';

  const isValidMap = (mapInstance) => {
    return mapInstance && typeof mapInstance.getSource === 'function';
  };

  useEffect(() => {
    if (!showWind || !map || !isValidMap(map)) return;

    const fetchAndUpdate = async () => {
      try {
        const bounds = map.getBounds();
        if (!bounds) return;
        
        const data = await fetchWindData(bounds);
        
        if (data) {
          setWindData(data);
          if (onWindData) onWindData(data);
          
          const streamlinesData = generateStreamlines(data, bounds, density);
          
          try {
            if (map.getSource(sourceId)) {
              map.removeLayer(layerId);
              map.removeSource(sourceId);
            }

            map.addSource(sourceId, {
              type: 'geojson',
              data: streamlinesData,
            });

            map.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'speed'],
                  0, '#3498db',
                  10, '#2ecc71',
                  30, '#f1c40f',
                  50, '#e67e22',
                  70, '#e74c3c',
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['get', 'density'],
                  0, 1,
                  10, 3,
                ],
                'line-opacity': opacity,
                'line-blur': 0.5,
              },
            });

            map.addLayer({
              id: 'wind-points',
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['get', 'speed'],
                  0, 2,
                  10, 4,
                  30, 6,
                  50, 8,
                  70, 10,
                ],
                'circle-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'speed'],
                  0, '#3498db',
                  10, '#2ecc71',
                  30, '#f1c40f',
                  50, '#e67e22',
                  70, '#e74c3c',
                ],
                'circle-opacity': opacity * 0.3,
              },
            });
          } catch (error) {
            console.warn('⚠️ Erreur lors de l\'ajout de la couche vent:', error);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la mise à jour du vent:', error);
      }
    };

    fetchAndUpdate();
    updateInterval.current = setInterval(fetchAndUpdate, 300000);

    return () => {
      if (updateInterval.current) clearInterval(updateInterval.current);
      try {
        if (map && map.getSource(sourceId)) {
          map.removeLayer(layerId);
          map.removeSource(sourceId);
        }
      } catch (error) {}
    };
  }, [showWind, map, opacity, density]);

  useEffect(() => {
    try {
      if (map && map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-opacity', opacity);
        map.setPaintProperty('wind-points', 'circle-opacity', opacity * 0.3);
      }
    } catch (error) {}
  }, [opacity, map]);

  return null;
};

export default WindLayer;
