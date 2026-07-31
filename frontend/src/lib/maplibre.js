let maplibreglInstance = null;

export const getMaplibregl = () => {
  if (maplibreglInstance) {
    return maplibreglInstance;
  }

  if (typeof window !== 'undefined') {
    if (window.maplibregl) {
      maplibreglInstance = window.maplibregl;
      return maplibreglInstance;
    }
    if (window.maplibre) {
      maplibreglInstance = window.maplibre;
      return maplibreglInstance;
    }
  }

  try {
    const module = require('maplibre-gl');
    maplibreglInstance = module.default || module;
    return maplibreglInstance;
  } catch (e) {
    console.error('❌ MapLibre GL non trouvé:', e);
    return null;
  }
};

export default getMaplibregl;

export const isMaplibreLoaded = () => {
  return getMaplibregl() !== null;
};

export const waitForMaplibre = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      const instance = getMaplibregl();
      if (instance) {
        resolve(instance);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout: MapLibre GL non chargé'));
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
};
