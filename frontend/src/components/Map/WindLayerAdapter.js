import React, { useState, useEffect } from 'react';
import WindLayer from './WindLayer';
import WindControls from './WindControls';

const WindLayerAdapter = ({ map, darkMode, showWind: externalShowWind }) => {
  const [showWind, setShowWind] = useState(externalShowWind || false);
  const [windOpacity, setWindOpacity] = useState(0.8);
  const [windData, setWindData] = useState(null);
  const [windSpeed, setWindSpeed] = useState(0);
  const [windDirection, setWindDirection] = useState(0);
  const [density, setDensity] = useState(30);

  const handleWindData = (data) => {
    setWindData(data);
    if (data?.current_weather) {
      setWindSpeed(data.current_weather.windspeed || 0);
      setWindDirection(data.current_weather.winddirection || 0);
    }
  };

  const handleOpacityChange = (opacity) => {
    setWindOpacity(opacity);
  };

  const handleDensityChange = (newDensity) => {
    setDensity(newDensity);
  };

  const toggleWind = () => {
    setShowWind(!showWind);
  };

  useEffect(() => {
    if (externalShowWind !== undefined) {
      setShowWind(externalShowWind);
    }
  }, [externalShowWind]);

  return (
    <>
      <WindLayer
        map={map}
        showWind={showWind}
        opacity={windOpacity}
        onWindData={handleWindData}
        density={density}
      />
      <WindControls
        showWind={showWind}
        onToggleWind={toggleWind}
        windOpacity={windOpacity}
        onWindOpacityChange={handleOpacityChange}
        windSpeed={windSpeed}
        windDirection={windDirection}
        density={density}
        onDensityChange={handleDensityChange}
        darkMode={darkMode}
      />
    </>
  );
};

export default WindLayerAdapter;
