import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Adjunta el token guardado (si existe) a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pickcrane_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
