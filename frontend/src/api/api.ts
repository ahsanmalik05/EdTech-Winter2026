import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('api_key');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});
