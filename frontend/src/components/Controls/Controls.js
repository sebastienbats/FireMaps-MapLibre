import React, { useState, useEffect, useCallback } from 'react';
import { getSources } from '../../api';
import './Controls.css';

const Controls = ({
  selectedSource,
  onSourceChange,
  days,
  setDays,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  apiKey,
  setApiKey,
  onFetch,
  fireData,
  onExport,
  onToggleCharts,
  showCharts,
  onToggleAlerts,
  showAlerts,
  onToggleWind,
  showWind,
}) => {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const srcList = await getSources();
      setSources(srcList);
      if (srcList.length > 0 && !selectedSource) {
        onSourceChange(srcList[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sources:', error);
    } finally {
      setLoadingSources(false);
    }
  }, [selectedSource, onSourceChange]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onFetch();
  };

  const hasData = fireData && fireData.features && fireData.features.length > 0;

  return (
    <form onSubmit={handleSubmit} className="controls">
      <div className="controls-header">
        <div className="controls-title">
          <span className="fire-icon">🔥</span>
          FireMaps
        </div>
        <div className="controls-status">
          <span className="dot"></span>
          En ligne
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="source-select">
          <span className="label-icon">📡</span>
          Source de données
        </label>
        <select
          id="source-select"
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          disabled={loadingSources || sources.length === 0}
        >
          {sources.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>📅 Période</label>
        <div className="date-group">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Date début"
          />
          <span>à</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="Date fin"
          />
        </div>
        <div className="days-group">
          <label>ou derniers jours :</label>
          <input
            type="number"
            min="1"
            max="5"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="api-key">
          <span className="label-icon">🔑</span>
          Clé API (optionnelle)
        </label>
        <input
          id="api-key"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Votre clé FIRMS"
        />
      </div>

      <button type="submit" disabled={loadingSources}>
        🔥 Charger les feux
      </button>

      <div className="export-controls">
        <button 
          type="button" 
          onClick={() => onExport('geojson')}
          className="export-btn geojson"
          disabled={!hasData}
        >
          📥 GeoJSON
        </button>
        <button 
          type="button" 
          onClick={() => onExport('csv')}
          className="export-btn csv"
          disabled={!hasData}
        >
          📥 CSV
        </button>
      </div>

      <div className="feature-toggles">
        <button 
          type="button"
          onClick={onToggleCharts}
          className={`toggle-btn ${showCharts ? 'active' : ''}`}
        >
          📊 Graphiques
        </button>
        <button 
          type="button"
          onClick={onToggleAlerts}
          className={`toggle-btn ${showAlerts ? 'active' : ''}`}
        >
          🚨 Alertes
        </button>
        <button 
          type="button"
          onClick={onToggleWind}
          className={`toggle-btn ${showWind ? 'active' : ''}`}
        >
          🌬️ Vent
        </button>
      </div>
    </form>
  );
};

export default Controls;
