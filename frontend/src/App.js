import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { getFires } from './api';
import Controls from './components/Controls';
import Map from './components/Map';
import FireChart from './components/Charts/FireChart';
import Alerts from './components/Alerts/Alerts';
import { SDIS_DATA } from './data/sdisData';
import { formatErrorForUser } from './utils/errorHandler';
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
  const [infoMessage, setInfoMessage] = useState(null);

  const [showCharts, setShowCharts] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [activeWeatherLayers, setActiveWeatherLayers] = useState(['temperature_2m']);
  const [weatherOpacity, setWeatherOpacity] = useState(0.6);
  const [showSdis, setShowSdis] = useState(true);
  const [showWind, setShowWind] = useState(false);

  const [sdisData] = useState(SDIS_DATA);

  const fetchFires = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
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

      if (data.message) {
        setInfoMessage(data.message);
        toast.info(data.message, { duration: 4000 });
      } else if (data.features && data.features.length === 0) {
        setInfoMessage('Aucun feu détecté pour cette période et cette source.');
        toast.warning('Aucun feu détecté', { duration: 4000 });
      } else {
        toast.success(`✅ ${data.features.length} feux chargés`, { duration: 3000 });
      }
    } catch (err) {
      const userError = formatErrorForUser(err);
      setError(`❌ ${userError.message}`);
      const toastFn = userError.severity === 'high' ? toast.error : toast.warning;
      toastFn(userError.message, { 
        duration: userError.severity === 'high' ? 8000 : 5000 
      });
      console.error('Erreur fetchFires:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkMaplibre = () => {
      if (typeof window !== 'undefined') {
        if (window.maplibregl) console.log('✅ MapLibre GL chargé');
        if (window.OMWeatherMapLayer) console.log('✅ OMWeatherMapLayer chargé');
      }
    };
    checkMaplibre();
    setTimeout(checkMaplibre, 2000);
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          console.warn('⚠️ Backend non disponible');
        } else {
          console.log('✅ Backend accessible');
        }
      } catch (e) {
        console.warn('⚠️ Backend injoignable');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    fetchFires();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, days, startDate, endDate]);

  const handleWeatherToggle = (layers, opacity) => {
    if (layers !== undefined) setActiveWeatherLayers(layers);
    if (opacity !== undefined) setWeatherOpacity(opacity);
  };

  const handleExport = async (format) => {
    if (!fireData || !fireData.features || fireData.features.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      let data, filename, contentType;

      if (format === 'geojson') {
        data = JSON.stringify(fireData, null, 2);
        filename = `fire-data-${new Date().toISOString().slice(0,10)}.geojson`;
        contentType = 'application/json';
        toast.loading('Préparation de l\'export GeoJSON...', { id: 'export' });
      } else {
        const headers = ['latitude', 'longitude', 'frp', 'confidence', 'acq_date', 'acq_time', 'satellite', 'instrument'];
        const rows = fireData.features.map(f => ({
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          frp: f.properties.frp,
          confidence: f.properties.confidence,
          acq_date: f.properties.acq_date,
          acq_time: f.properties.acq_time,
          satellite: f.properties.satellite || '',
          instrument: f.properties.instrument || '',
        }));
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
          csv += headers.map(h => row[h]).join(',') + '\n';
        });
        
        data = csv;
        filename = `fire-data-${new Date().toISOString().slice(0,10)}.csv`;
        contentType = 'text/csv';
        toast.loading('Préparation de l\'export CSV...', { id: 'export' });
      }

      const blob = new Blob([data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ Export ${format.toUpperCase()} réussi ! (${fireData.features.length} feux)`, { 
        id: 'export',
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('❌ Erreur lors de l\'export', { id: 'export' });
    }
  };

  const toggleCharts = () => {
    setShowCharts(!showCharts);
    toast.success(`📊 Graphiques ${!showCharts ? 'affichés' : 'masqués'}`, { duration: 2000 });
  };

  const toggleAlerts = () => {
    setShowAlerts(!showAlerts);
    toast.success(`🚨 Alertes ${!showAlerts ? 'activées' : 'désactivées'}`, { duration: 2000 });
  };

  const toggleWind = () => {
    setShowWind(!showWind);
    toast.success(`🌬️ Vent ${!showWind ? 'activé' : 'désactivé'}`, { duration: 2000 });
  };

  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
          },
          success: { duration: 3000, icon: '✅' },
          error: { duration: 5000, icon: '❌' },
        }}
      />
      
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
        fireData={fireData}
        onExport={handleExport}
        onToggleCharts={toggleCharts}
        showCharts={showCharts}
        onToggleAlerts={toggleAlerts}
        showAlerts={showAlerts}
        onToggleWind={toggleWind}
        showWind={showWind}
      />
      
      {loading && (
        <div className="loading-overlay">
          <div className="loader-text">
            <div className="spinner"></div>
            <span>Chargement des feux...</span>
          </div>
          <div className="loader-progress">
            <div className="bar"></div>
          </div>
        </div>
      )}
      {infoMessage && (
        <div className="info-message fade-in">
          <span className="message-icon">ℹ️</span>
          {infoMessage}
        </div>
      )}
      {error && (
        <div className="error-message fade-in">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}
      
      <Map
        fireData={fireData}
        showHeatmap={true}
        darkMode={false}
        showWeather={showWeather}
        activeWeatherLayers={activeWeatherLayers}
        weatherOpacity={weatherOpacity}
        onWeatherToggle={handleWeatherToggle}
        showSdis={showSdis}
        showWind={showWind}
        sdisData={sdisData}
      />

      {showAlerts && (
        <Alerts 
          fireData={fireData} 
          sdisData={sdisData}
          threshold={5}
        />
      )}

      {showCharts && (
        <FireChart 
          fireData={fireData} 
          source={source}
          period={days}
        />
      )}
    </div>
  );
}

export default App;
