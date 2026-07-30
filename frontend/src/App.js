import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibregl';
import 'maplibregl/dist/maplibregl.css';
import { getFires, getSources } from './api';
import Controls from './components/Controls';
import './App.css';

function App() {
  // État pour les paramètres de recherche
  const [source, setSource] = useState('VIIRS_SNPP_NRT'); // valeur par défaut en chaîne
  const [days, setDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [apiKey, setApiKey] = useState(''); // on laisse vide, l'utilisateur la saisit

  // État des données et chargement
  const [fireData, setFireData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Référence à la carte
  const mapContainer = useRef(null);
  const map = useRef(null);

  // Fonction de récupération des feux (corrigée)
  const fetchFires = async () => {
    setLoading(true);
    setError(null);
    try {
      // Construction des paramètres
      const params = { source }; // source est une chaîne, pas un index
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

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json', // tu peux changer le style
        center: [2.0, 46.0], // France
        zoom: 5,
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    // Nettoyage
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Ajout des données sur la carte quand elles changent
  useEffect(() => {
    if (!map.current || !fireData) return;

    // Supprimer les couches et sources existantes (si présentes)
    if (map.current.getSource('fires')) {
      map.current.removeLayer('fires-layer');
      map.current.removeSource('fires');
    }

    // Ajouter la source et la couche
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

    // Ajuster la vue pour inclure tous les points
    const bounds = new maplibregl.LngLatBounds();
    fireData.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      bounds.extend([coords[0], coords[1]]);
    });
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [fireData]);

  // Appel initial et lors des changements de paramètres
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
