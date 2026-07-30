import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Erreur API:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Pas de réponse du serveur:', error.request);
    } else {
      console.error('Erreur de configuration:', error.message);
    }
    return Promise.reject(error);
  }
);

export const getSources = async () => {
  try {
    const response = await api.get('/fires/sources');
    return response.data.sources;
  } catch (error) {
    console.error('Erreur getSources:', error);
    throw new Error('Impossible de récupérer les sources');
  }
};

export const getFires = async ({ source, days, startDate, endDate, apiKey }) => {
  try {
    const params = { source };
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (days) {
      params.days = days;
    }
    if (apiKey) params.apiKey = apiKey;

    const response = await api.get('/fires', { params });
    return response.data;
  } catch (error) {
    console.error('Erreur getFires:', error);
    throw new Error('Erreur lors de la récupération des feux');
  }
};

export default api;
