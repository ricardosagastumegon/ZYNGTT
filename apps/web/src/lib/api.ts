import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('zyn_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && typeof window !== 'undefined') {
      original._retry = true;
      const refreshToken = localStorage.getItem('zyn_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/api/auth/refresh`,
            { refreshToken },
          );
          const newToken = data.data.token;
          localStorage.setItem('zyn_token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('zyn_token');
          localStorage.removeItem('zyn_refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
