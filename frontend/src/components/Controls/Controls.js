import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { PacmanLoader } from 'react-spinners';
import './Controls.css';

const WEATHER_LAYERS = [
  { value: 'temperature_2m', label: '🌡️ Température', layer: 'temperature_2m' },
  { value: 'precipitation', label: '🌧️ Précipitations', layer: 'precipitation' },
  { value: 'cloud_cover', label: '☁️ Couverture nuageuse', layer: 'cloud_cover' },
  { value: 'wind_speed_10m', label: '💨 Vitesse du vent', layer: 'wind_speed_10m' },
  { value: 'pressure_msl', label: '📊 Pression', layer: 'pressure_msl' },
];

const SDIS_PRESETS = [
  { value: 'doubs', label: 'Doubs (25)', url: 'https://opendata.doubs.fr/explore/dataset/sdis25-centres-de-secours-du-doubs/download/?format=geojson&timezone=Europe/Berlin' },
  { value: 'gard', label: 'Gard (30)', url: 'https://data.gard.fr/explore/dataset/centres-dinterventions-et-de-secours-du-gard/download/?format=geojson&timezone=Europe/Berlin' },
  { value: 'gironde', label: 'Gironde (33)', url: 'https://opendata.gironde.fr/explore/dataset/centres-de-secours-sdis-33/download/?format=geojson&timezone=Europe/Berlin' },
  { value: 'herault', label: 'Hérault (34)', url: 'https://data.herault.fr/explore/dataset/centres-de-secours-du-sdis-de-lherault/download/?format=geojson&timezone=Europe/Berlin' },
];

const Controls = ({
  sources,
  selectedSource,
  setSelectedSource,
  dayRange,
  setDayRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onFetch,
  onFilterChange,
  onExport,
  loading,
  showHeatmap,
  setShowHeatmap,
  showSdis,
  setShowSdis,
  showWind,
  setShowWind,
  windLoading,
  darkMode,
  activeWeatherLayers,
  setActiveWeatherLayers,
  weatherOpacity,
  setWeatherOpacity,
  sdisLayers,
  setSdisLayers,
  sdisLoading,
  loadSdisPreset,
  loadSdisCustom,
  clearSdisLayers,
  customSdisUrl,
  setCustomSdisUrl,
}) => {
  const [highConfidence, setHighConfidence] = useState(true);
  const [frp, setFrp] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('firms_map_key') || '');
  const [apiKeyStatus, setApiKeyStatus] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);

  const handleFilterChange = () => {
    onFilterChange({ highConfidence, frp });
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      if (trimmed.length < 32) {
        setApiKeyStatus('⚠️ Clé trop courte (32 caractères min.)');
        setIsKeyValid(false);
        setTimeout(() => setApiKeyStatus(''), 4000);
        return;
      }
      localStorage.setItem('firms_map_key', trimmed);
      setIsKeyValid(true);
      setApiKeyStatus('✅ Clé sauvegardée');
      setTimeout(() => setApiKeyStatus(''), 3000);
    } else {
      localStorage.removeItem('firms_map_key');
      setIsKeyValid(false);
      setApiKeyStatus('❌ Clé supprimée');
      setTimeout(() => setApiKeyStatus(''), 3000);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('firms_map_key');
    if (saved && saved.length >= 32) setIsKeyValid(true);
  }, []);

  const handleWeatherLayerToggle = (layer) => {
    setActiveWeatherLayers(prev => {
      const exists = prev.find(l => l.value === layer.value);
      if (exists) {
        return prev.filter(l => l.value !== layer.value);
      } else {
        return [...prev, { ...layer, opacity: weatherOpacity }];
      }
    });
  };

  const handleWeatherLayerOpacityChange = (layerValue, opacity) => {
    setActiveWeatherLayers(prev =>
      prev.map(l =>
        l.value === layerValue ? { ...l, opacity } : l
      )
    );
  };

  const isWeatherLayerActive = (layerValue) => {
    return activeWeatherLayers.some(l => l.value === layerValue);
  };

  const getWeatherLayerOpacity = (layerValue) => {
    const layer = activeWeatherLayers.find(l => l.value === layerValue);
    return layer ? layer.opacity : weatherOpacity;
  };

  return (
    <div className="controls">
      {/* Clé API */}
      <div className="control-group">
        <label className="control-label"><span className="icon">🔑</span> Clé API FIRMS</label>
        <div className="control-input-group">
          <input type="password" placeholder="MAP_KEY (32 caractères)" className="api-input" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setIsKeyValid(false); }} onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()} />
          <button className="btn-secondary" onClick={handleSaveApiKey}>💾</button>
        </div>
        {apiKeyStatus && <div className={`api-status ${apiKeyStatus.includes('✅') ? 'success' : apiKeyStatus.includes('⚠️') ? 'warning' : 'error'}`}>{apiKeyStatus}</div>}
        <small className="control-help">Obtenez une clé sur <a href="https://firms.modaps.eosdis.nasa.gov/mapkey/" target="_blank" rel="noopener noreferrer">firms.modaps.eosdis.nasa.gov</a></small>
        {apiKey && <small className="control-help" style={{ color: isKeyValid ? '#27ae60' : '#f39c12' }}>{isKeyValid ? `✅ Valide (${apiKey.length} caractères)` : '⚠️ Non sauvegardée'}</small>}
      </div>

      {/* Source satellite */}
      <div className="control-group">
        <label className="control-label"><span className="icon">🛰️</span> Source satellite</label>
        <Select options={sources} value={sources.find(s => s.value === selectedSource)} onChange={(opt) => setSelectedSource(opt.value)} className="react-select" classNamePrefix="react-select" isDisabled={loading} theme={(theme) => ({ ...theme, colors: { ...theme.colors, primary: '#e67e22', primary75: '#f39c12', primary50: '#f5b041', primary25: '#fdebd0' } } )} />
      </div>

      {/* Période */}
      <div className="control-group">
        <label className="control-label"><span className="icon">📅</span> Période</label>
        <div className="control-row">
          <input type="number" value={dayRange} onChange={(e) => setDayRange(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 5))} min="1" max="5" className="input-small" disabled={loading} />
          <span className="input-suffix">jours</span>
        </div>
        <div className="control-row">
          <label className="control-label-small">Du</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-date" disabled={loading} />
          <label className="control-label-small">Au</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-date" disabled={loading} />
        </div>
        <small className="control-help">Laissez vide pour la période glissante</small>
      </div>

      {/* Filtres */}
      <div className="control-group">
        <label className="control-label"><span className="icon">🔍</span> Filtres</label>
        <div className="filter-group">
          <label className="filter-label"><input type="checkbox" checked={highConfidence} onChange={(e) => { setHighConfidence(e.target.checked); setTimeout(handleFilterChange, 0); }} disabled={loading} /> Confiance élevée</label>
          <label className="filter-label"><input type="checkbox" checked={frp} onChange={(e) => { setFrp(e.target.checked); setTimeout(handleFilterChange, 0); }} disabled={loading} /> FRP &gt; 50</label>
          <label className="filter-label"><input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} disabled={loading} /> Heatmap</label>
          <label className="filter-label"><input type="checkbox" checked={showWind} onChange={(e) => setShowWind(e.target.checked)} disabled={loading || windLoading} /> Vent {windLoading && <span className="spinner-small">🌀</span>}</label>
        </div>
      </div>

      {/* SDIS */}
      <div className="control-group">
        <label className="control-label"><span className="icon">🚒</span> Casernes SDIS</label>
        <div className="filter-group">
          <label className="filter-label"><input type="checkbox" checked={showSdis} onChange={(e) => setShowSdis(e.target.checked)} disabled={loading || sdisLoading} /> Afficher les casernes</label>
          {sdisLoading && <span className="spinner-small">🌀</span>}
        </div>
        <div className="sdis-presets">
          <div className="control-row" style={{ flexWrap: 'wrap', gap: '4px' }}>
            {SDIS_PRESETS.map((preset) => (
              <button key={preset.value} className="btn-sdis-preset" onClick={() => loadSdisPreset(preset)} disabled={loading || sdisLoading}>{preset.label}</button>
            ))}
          </div>
          <div className="control-row" style={{ marginTop: '4px' }}>
            <input type="text" placeholder="URL GeoJSON personnalisée" className="input-sdis-url" value={customSdisUrl} onChange={(e) => setCustomSdisUrl(e.target.value)} disabled={loading || sdisLoading} />
            <button className="btn-secondary" onClick={loadSdisCustom} disabled={loading || sdisLoading || !customSdisUrl.trim()}>➕</button>
          </div>
          {sdisLayers.length > 0 && (
            <div className="sdis-info">
              <span className="sdis-count">{sdisLayers.length} couche(s) chargée(s)</span>
              <button className="btn-sdis-clear" onClick={clearSdisLayers} disabled={loading}>🗑️</button>
            </div>
          )}
        </div>
        <small className="control-help">Données SDIS provenant de data.gouv.fr</small>
      </div>

      {/* Couches météo */}
      <div className="control-group">
        <label className="control-label"><span className="icon">🌦️</span> Couches météo (MapLibre)</label>
        <div className="wms-layer-list">
          {WEATHER_LAYERS.map((layer) => (
            <div key={layer.value} className="wms-layer-item">
              <label className="filter-label wms-layer-label">
                <input type="checkbox" checked={isWeatherLayerActive(layer.value)} onChange={() => handleWeatherLayerToggle(layer)} disabled={loading} />
                <span className="wms-layer-name">{layer.label}</span>
                <span className="wms-layer-type">🗺️</span>
              </label>
              {isWeatherLayerActive(layer.value) && (
                <div className="wms-layer-opacity">
                  <input type="range" min="0" max="1" step="0.05" value={getWeatherLayerOpacity(layer.value)} onChange={(e) => handleWeatherLayerOpacityChange(layer.value, parseFloat(e.target.value))} />
                  <span className="opacity-value">{Math.round(getWeatherLayerOpacity(layer.value) * 100)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <small className="control-help">{activeWeatherLayers.length > 0 ? `✅ ${activeWeatherLayers.length} couche(s) active(s)` : 'Aucune couche active'}</small>
        <small className="control-help" style={{ color: '#6c757d', marginTop: '2px' }}>💡 Données Open-Meteo • Tuiles MapLibre</small>
      </div>

      {/* Rafraîchir */}
      <div className="control-group">
        <button className="btn-primary" onClick={onFetch} disabled={loading || !isKeyValid}>
          {loading ? <PacmanLoader size={20} color="white" /> : <><span className="icon">🔄</span> Rafraîchir</>}
        </button>
        {!isKeyValid && <small className="control-help" style={{ color: '#e74c3c' }}>⚠️ Entrez et sauvegardez votre clé API (💾)</small>}
        {isKeyValid && !loading && <small className="control-help" style={{ color: '#27ae60' }}>✅ Prêt</small>}
      </div>

      {/* Export */}
      <div className="control-group">
        <label className="control-label"><span className="icon">📥</span> Exporter</label>
        <div className="export-group">
          <button className="btn-secondary" onClick={() => onExport('csv')} disabled={!isKeyValid || loading}>📊 CSV</button>
          <button className="btn-secondary" onClick={() => onExport('geojson')} disabled={!isKeyValid || loading}>🗺️ GeoJSON</button>
        </div>
        <small className="control-help">Exporte les données filtrées affichées</small>
      </div>
    </div>
  );
};

export default Controls;
