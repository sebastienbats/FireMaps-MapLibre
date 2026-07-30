import React, { useState, useEffect } from 'react';
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
}) => {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  useEffect(() => {
    const loadSources = async () => {
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
        <label htmlFor="source-select">Source de données</label>
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
        <label>Période</label>
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
        <label htmlFor="api-key">Clé API (optionnelle)</label>
        <input
          id="api-key"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Votre clé FIRMS"
        />
      </div>

      <button type="submit" disabled={loadingSources}>
        Charger les feux
      </button>
    </form>
  );
};

export default Controls;
