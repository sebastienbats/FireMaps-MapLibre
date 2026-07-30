import React, { useState, useEffect } from 'react';
import { getSources } from '../api';

const Controls = ({ onFetch, onSourceChange, selectedSource, days, setDays, startDate, setStartDate, endDate, setEndDate, apiKey, setApiKey }) => {
  const [sources, setSources] = useState([]);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const srcList = await getSources();
        setSources(srcList);
        if (srcList.length > 0 && !selectedSource) {
          onSourceChange(srcList[0]);
        }
      } catch (error) {
        console.error('Erreur chargement sources:', error);
      }
    };
    loadSources();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onFetch();
  };

  return (
    <form onSubmit={handleSubmit} className="controls">
      <div className="control-group">
        <label>Source</label>
        <select value={selectedSource} onChange={(e) => onSourceChange(e.target.value)}>
          {sources.map((src) => (
            <option key={src} value={src}>
              {src.replace('_NRT', '').replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>Période</label>
        <div className="date-group">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>à</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="days-group">
          <label>ou derniers jours</label>
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
        <label>Clé API (optionnelle)</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Votre clé FIRMS"
        />
      </div>

      <button type="submit">Charger les feux</button>
    </form>
  );
};

export default Controls;
