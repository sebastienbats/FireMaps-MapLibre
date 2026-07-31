import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './FireChart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const FireChart = ({ fireData, source, period }) => {
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    if (!fireData?.features?.length) { setChartData(null); return; }

    const dateMap = {};
    fireData.features.forEach(f => {
      const date = f.properties.acq_date || 'N/A';
      if (date !== 'N/A') {
        if (!dateMap[date]) dateMap[date] = { count: 0, totalFrp: 0, maxFrp: 0 };
        dateMap[date].count++;
        dateMap[date].totalFrp += f.properties.frp || 0;
        dateMap[date].maxFrp = Math.max(dateMap[date].maxFrp, f.properties.frp || 0);
      }
    });

    let dates = Object.keys(dateMap).sort();
    if (timeRange === 'week') dates = dates.slice(-7);
    else if (timeRange === 'month') dates = dates.slice(-30);

    setChartData({
      labels: dates,
      datasets: [
        {
          label: '🔥 Nombre de feux',
          data: dates.map(d => dateMap[d].count),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231,76,60,0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#e74c3c',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: '⚡ FRP Total (MW)',
          data: dates.map(d => parseFloat(dateMap[d].totalFrp.toFixed(1))),
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243,156,18,0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1',
          pointBackgroundColor: '#f39c12',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        }
      ],
      summary: {
        totalFires: fireData.features.length,
        totalFrp: Object.values(dateMap).reduce((s, d) => s + d.totalFrp, 0).toFixed(1),
        avgFrp: (Object.values(dateMap).reduce((s, d) => s + d.totalFrp, 0) / fireData.features.length).toFixed(1),
        maxFrp: Math.max(...Object.values(dateMap).map(d => d.maxFrp)),
        days: Object.keys(dateMap).length,
      }
    });
  }, [fireData, timeRange]);

  if (!chartData) return <div className="chart-empty"><div className="chart-empty-icon">📊</div><p>Aucune donnée à afficher</p></div>;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: 'bold' } } },
      title: { display: true, text: `Évolution des feux - ${source}`, font: { size: 16, weight: 'bold' }, padding: { bottom: 20 } },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${ctx.dataset.label.includes('FRP') ? ' MW' : ''}`
        }
      }
    },
    scales: {
      y: { type: 'linear', position: 'left', title: { display: true, text: 'Nombre de feux' }, beginAtZero: true },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'FRP (MW)' }, beginAtZero: true, grid: { drawOnChartArea: false } },
      x: { title: { display: true, text: 'Date' } }
    }
  };

  return (
    <div className="fire-chart-container">
      <div className="chart-header">
        <div className="chart-summary">
          <div className="summary-item"><span className="summary-label">🔥 Total</span><span className="summary-value">{chartData.summary.totalFires}</span></div>
          <div className="summary-item"><span className="summary-label">⚡ FRP total</span><span className="summary-value">{chartData.summary.totalFrp} MW</span></div>
          <div className="summary-item"><span className="summary-label">📊 FRP moyen</span><span className="summary-value">{chartData.summary.avgFrp} MW</span></div>
          <div className="summary-item"><span className="summary-label">🔥 FRP max</span><span className="summary-value">{chartData.summary.maxFrp} MW</span></div>
        </div>
        <div className="chart-controls">
          <div className="chart-type-selector">
            <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')}>📈 Ligne</button>
            <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>📊 Barres</button>
          </div>
          <div className="time-range-selector">
            <button className={timeRange === 'all' ? 'active' : ''} onClick={() => setTimeRange('all')}>Tout</button>
            <button className={timeRange === 'week' ? 'active' : ''} onClick={() => setTimeRange('week')}>7j</button>
            <button className={timeRange === 'month' ? 'active' : ''} onClick={() => setTimeRange('month')}>30j</button>
          </div>
        </div>
      </div>
      <div className="chart-main">{chartType === 'line' ? <Line data={chartData} options={options} /> : <Bar data={chartData} options={options} />}</div>
    </div>
  );
};

export default FireChart;
