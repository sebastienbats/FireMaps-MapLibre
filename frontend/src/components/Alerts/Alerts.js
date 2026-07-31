import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { SDIS_DATA, findNearestSdis } from '../../data/sdisData';
import './Alerts.css';

const Alerts = ({ 
  fireData, 
  sdisData = SDIS_DATA, 
  threshold = 10 
}) => {
  const [alerts, setAlerts] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const prevAlertsRef = useRef([]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const detectClusters = (features, minCount) => {
    const clusters = [];
    const processed = new Set();
    for (let i = 0; i < features.length; i++) {
      if (processed.has(i)) continue;
      const cluster = [];
      const coords1 = features[i].geometry.coordinates;
      for (let j = i + 1; j < features.length; j++) {
        if (processed.has(j)) continue;
        const coords2 = features[j].geometry.coordinates;
        if (calculateDistance(coords1[1], coords1[0], coords2[1], coords2[0]) < 5) {
          cluster.push(j);
          processed.add(j);
        }
      }
      if (cluster.length >= minCount) {
        cluster.push(i);
        processed.add(i);
        const cCoords = cluster.map(idx => features[idx].geometry.coordinates);
        clusters.push({
          count: cluster.length,
          center: [cCoords.reduce((s,c) => s + c[0], 0) / cCoords.length, cCoords.reduce((s,c) => s + c[1], 0) / cCoords.length]
        });
      }
    }
    return clusters;
  };

  useEffect(() => {
    if (!fireData?.features?.length) { setAlerts([]); return; }

    const newAlerts = [];
    const features = fireData.features;

    const clusters = detectClusters(features, threshold);
    clusters.forEach(c => {
      const severity = c.count > 20 ? 'high' : c.count > 10 ? 'medium' : 'low';
      newAlerts.push({
        id: `cluster-${Date.now()}-${Math.random()}`,
        type: 'cluster',
        message: `🔥 ${c.count} feux dans un rayon de 5 km`,
        severity,
        timestamp: new Date().toISOString(),
        count: c.count,
        details: 'Densité anormale de feux dans cette zone'
      });
    });

    features.filter(f => f.properties.frp > 100).slice(0, 5).forEach(f => {
      const frp = f.properties.frp;
      newAlerts.push({
        id: `extreme-${Date.now()}-${Math.random()}`,
        type: 'extreme',
        message: `🔥 Feu extrême (FRP: ${frp.toFixed(1)} MW)`,
        severity: frp > 200 ? 'critical' : 'high',
        timestamp: new Date().toISOString(),
        frp: frp,
        details: 'Puissance radiative très élevée, risque important'
      });
    });

    if (sdisData?.length) {
      features.forEach(f => {
        const coords = f.geometry.coordinates;
        const nearest = findNearestSdis(sdisData, coords[1], coords[0]);
        
        if (nearest) {
          const distance = calculateDistance(coords[1], coords[0], nearest.latitude, nearest.longitude);
          if (distance < 10 && f.properties.frp > 50) {
            newAlerts.push({
              id: `sdis-${Date.now()}-${Math.random()}`,
              type: 'sdis',
              message: `🚒 Feu à ${distance.toFixed(1)} km de ${nearest.nom}`,
              severity: 'medium',
              timestamp: new Date().toISOString(),
              distance: distance,
              sdis: nearest.nom,
              details: `Caserne la plus proche à ${distance.toFixed(1)} km`
            });
          }
        }
      });
    }

    const today = new Date().toISOString().slice(0,10);
    const todayCount = features.filter(f => f.properties.acq_date === today).length;
    if (todayCount > 50) {
      newAlerts.push({
        id: `trend-${Date.now()}-${Math.random()}`,
        type: 'trend',
        message: `📈 ${todayCount} feux aujourd'hui - Activité anormalement élevée`,
        severity: 'high',
        timestamp: new Date().toISOString(),
        count: todayCount,
        details: 'Plus de 50 feux détectés aujourd\'hui, vigilance renforcée'
      });
    }

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    newAlerts.sort((a,b) => severityOrder[a.severity] - severityOrder[b.severity] || new Date(b.timestamp) - new Date(a.timestamp));

    const prevIds = prevAlertsRef.current.map(a => a.id);
    newAlerts.filter(a => !prevIds.includes(a.id)).forEach(alert => {
      const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🔵';
      if (alert.severity === 'critical' || alert.severity === 'high') {
        toast.error(alert.message, { duration: 8000, icon, style: { background: alert.severity === 'critical' ? '#c0392b' : '#e74c3c', color: '#fff' } });
      } else {
        toast.warning(alert.message, { duration: 5000, icon });
      }
    });

    prevAlertsRef.current = newAlerts;
    setAlerts(newAlerts);
  }, [fireData, sdisData, threshold]);

  if (!alerts.length) {
    return <div className="alerts-panel alerts-empty"><div className="alerts-header"><span className="alerts-title">✅ Alertes</span><span className="alerts-status">Aucune alerte</span></div></div>;
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <div className={`alerts-panel ${expanded ? 'expanded' : ''}`}>
      <div className="alerts-header" onClick={() => setExpanded(!expanded)}>
        <div className="alerts-title-section">
          <span className="alerts-title">🚨 Alertes</span>
          {criticalCount > 0 && <span className="alert-badge critical">{criticalCount}</span>}
          {highCount > 0 && <span className="alert-badge high">{highCount}</span>}
        </div>
        <div className="alerts-controls">
          <span className="alerts-count">{alerts.length}</span>
          <span className="alerts-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="alerts-list">
          {alerts.map((alert, i) => (
            <div key={alert.id} className={`alert-item alert-${alert.severity}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="alert-icon">
                {alert.severity === 'critical' && '🚨'}
                {alert.severity === 'high' && '🔴'}
                {alert.severity === 'medium' && '🟡'}
                {alert.severity === 'low' && '🔵'}
              </div>
              <div className="alert-content">
                <div className="alert-message">{alert.message}</div>
                <div className="alert-details">{alert.details}</div>
                <div className="alert-time">{new Date(alert.timestamp).toLocaleString('fr-FR')}</div>
              </div>
              {alert.count && <div className="alert-badge-count">{alert.count}</div>}
              {alert.frp && <div className="alert-frp">{alert.frp.toFixed(0)} MW</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
