import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT Bearer Token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('arbaa_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor to handle authorization errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect/logout if unauthorized
      localStorage.removeItem('arbaa_token');
      localStorage.removeItem('arbaa_user');
      localStorage.removeItem('arbaa_permissions');
      // We can trigger window reload or let Zustand handle it when App re-renders
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
