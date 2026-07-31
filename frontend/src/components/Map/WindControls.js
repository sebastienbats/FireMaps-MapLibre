import React, { useState } from 'react';
import './WindControls.css';

const WindControls = ({ 
  showWind, 
  onToggleWind, 
  windOpacity, 
  onWindOpacityChange,
  windSpeed,
  windDirection,
  onDensityChange,
  density = 30,
  darkMode = false,
}) => {
  const [expanded, setExpanded] = useState(true);

  const formatSpeed = (speed) => {
    if (!speed) return '--';
    return `${Math.round(speed)} km/h`;
  };

  const getWindDirection = (degrees) => {
    if (!degrees && degrees !== 0) return '--';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getWindStrength = (speed) => {
    if (!speed) return 'Calme';
    if (speed < 10) return 'Léger';
    if (speed < 30) return 'Modéré';
    if (speed < 50) return 'Fort';
    if (speed < 70) return 'Très fort';
    return 'Extrême';
  };

  const getWindEmoji = (speed) => {
    if (!speed) return '🍃';
    if (speed < 10) return '🍃';
    if (speed < 30) return '🌿';
    if (speed < 50) return '🌬️';
    if (speed < 70) return '💨';
    return '🌪️';
  };

  return (
    <div className={`wind-controls ${expanded ? 'expanded' : ''} ${darkMode ? 'dark' : ''}`}>
      <div className="wind-header" onClick={() => setExpanded(!expanded)}>
        <div className="wind-title-section">
          <span className="wind-title">🌬️ Vent</span>
          <span className={`wind-status ${showWind ? 'active' : ''}`}>
            {showWind ? '✅ Actif' : '❌ Inactif'}
          </span>
        </div>
        <button className="wind-toggle-header" onClick={(e) => {
          e.stopPropagation();
          onToggleWind();
        }}>
          {showWind ? '🔴' : '🟢'}
        </button>
      </div>

      {expanded && (
        <div className="wind-content">
          <div className="wind-toggle-row">
            <label className="wind-switch">
              <input type="checkbox" checked={showWind} onChange={onToggleWind} />
              <span className="slider"></span>
            </label>
            <span className="wind-toggle-label">
              {showWind ? 'Afficher le vent' : 'Masquer le vent'}
            </span>
          </div>

          {showWind && (
            <>
              <div className="wind-info">
                <div className="wind-info-item">
                  <span className="wind-info-label">🌡️ Vitesse</span>
                  <span className="wind-info-value">
                    {getWindEmoji(windSpeed)} {formatSpeed(windSpeed)}
                  </span>
                </div>
                <div className="wind-info-item">
                  <span className="wind-info-label">🧭 Direction</span>
                  <span className="wind-info-value">
                    {getWindDirection(windDirection)} ({windDirection || '--'}°)
                  </span>
                </div>
                <div className="wind-info-item">
                  <span className="wind-info-label">💪 Intensité</span>
                  <span className="wind-info-value">
                    {getWindStrength(windSpeed)}
                  </span>
                </div>
              </div>

              <div className="wind-control-group">
                <label>Opacité</label>
                <div className="wind-slider-group">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={windOpacity}
                    onChange={(e) => onWindOpacityChange(parseFloat(e.target.value))}
                  />
                  <span className="wind-value-display">
                    {Math.round(windOpacity * 100)}%
                  </span>
                </div>
              </div>

              <div className="wind-control-group">
                <label>Densité des lignes</label>
                <div className="wind-slider-group">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={density}
                    onChange={(e) => onDensityChange(parseInt(e.target.value))}
                  />
                  <span className="wind-value-display">{density}%</span>
                </div>
              </div>

              <div className="wind-legend">
                <div className="wind-legend-title">Légende des vitesses</div>
                <div className="wind-legend-items">
                  <div className="wind-legend-item">
                    <span className="wind-legend-color" style={{ background: '#3498db' }}></span>
                    <span>0-10 km/h</span>
                  </div>
                  <div className="wind-legend-item">
                    <span className="wind-legend-color" style={{ background: '#2ecc71' }}></span>
                    <span>10-30 km/h</span>
                  </div>
                  <div className="wind-legend-item">
                    <span className="wind-legend-color" style={{ background: '#f1c40f' }}></span>
                    <span>30-50 km/h</span>
                  </div>
                  <div className="wind-legend-item">
                    <span className="wind-legend-color" style={{ background: '#e67e22' }}></span>
                    <span>50-70 km/h</span>
                  </div>
                  <div className="wind-legend-item">
                    <span className="wind-legend-color" style={{ background: '#e74c3c' }}></span>
                    <span>&gt; 70 km/h</span>
                  </div>
                </div>
              </div>

              <div className="wind-alert">
                {windSpeed > 50 && (
                  <div className="wind-alert-warning">
                    ⚠️ Vent fort ! Risque de propagation rapide des incendies
                  </div>
                )}
                {windSpeed > 70 && (
                  <div className="wind-alert-danger">
                    🚨 Vent extrême ! Danger immédiat pour les incendies en cours
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WindControls;
