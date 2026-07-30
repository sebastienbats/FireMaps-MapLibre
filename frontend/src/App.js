import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getFires } from './api';
import Controls from './components/Controls';
import './App.css';

function App() {
  const [source, setSource] = useState('VIIRS_SNPP_NRT');
  const [days, setDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [fireData, setFireData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapContainer = useRef(null);
  const map = useRef(null);

  const fetchFires = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { source };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.days = days;
      }
      if (apiKey) params.apiKey = apiKey;

      const data = await getFires(params);
      setFireData(data);
    } catch (err) {
      setError(err.message || 'Erreur lors de la récupération des feux');
      console.error('Erreur fetchFires:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [2.0, 46.0],
        zoom: 5,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !fireData) return;

    if (map.current.getSource('fires')) {
      map.current.removeLayer('fires-layer');
      map.current.removeSource('fires');
    }

    map.current.addSource('fires', {
      type: 'geojson',
      data: fireData,
    });

    map.current.addLayer({
      id: 'fires-layer',
      type: 'circle',
      source: 'fires',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'case',
          ['==', ['get', 'confidence'], 'high'],
          '#ff0000',
          ['==', ['get', 'confidence'], 'medium'],
          '#ff8800',
          '#ffcc00',
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    });

    const bounds = new maplibregl.LngLatBounds();
    fireData.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      bounds.extend([coords[0], coords[1]]);
    });
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [fireData]);

  useEffect(() => {
    fetchFires();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, days, startDate, endDate]);

  return (
    <div className="App">
      <Controls
        selectedSource={source}
        onSourceChange={setSource}
        days={days}
        setDays={setDays}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        apiKey={apiKey}
        setApiKey={setApiKey}
        onFetch={fetchFires}
      />
      {loading && <div className="loading-overlay">Chargement des feux...</div>}
      {error && <div className="error-message">Erreur : {error}</div>}
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default App;
