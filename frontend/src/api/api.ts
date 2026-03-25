import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const apiKey = localStorage.getItem('api_key');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});
