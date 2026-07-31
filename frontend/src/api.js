import axios from 'axios';
import { parseApiError } from './utils/errorHandler';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    console.log(`📡 Requête : ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Erreur de requête:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const parsedError = parseApiError(error);
    console.error('❌ Erreur API:', {
      status: parsedError.status,
      type: parsedError.type,
      message: parsedError.message,
      details: parsedError.details,
    });
    
    const structuredError = new Error(parsedError.message);
    structuredError.type = parsedError.type;
    structuredError.details = parsedError.details;
    structuredError.status = parsedError.status;
    structuredError.originalError = error;
    
    return Promise.reject(structuredError);
  }
);

export const getSources = async () => {
  try {
    const response = await api.get('/fires/sources');
    return response.data.sources;
  } catch (error) {
    const parsed = parseApiError(error);
    throw new Error(parsed.message);
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
    throw error;
  }
};

export default api;
