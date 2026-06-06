import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://nurselink-frontend-8r6i.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(cfg => {
  const token = localStorage.getItem('vyasa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vyasa_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
