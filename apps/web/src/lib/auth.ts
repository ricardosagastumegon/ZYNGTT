import { api } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: { id: string; name: string } | null;
}

export async function loginRequest(email: string, password: string) {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data.data as { user: User; token: string; refreshToken: string };
}

export async function registerRequest(data: {
  email: string; password: string; firstName: string;
  lastName: string; companyName?: string;
}) {
  const res = await api.post('/api/auth/register', data);
  return res.data.data as { user: User; token: string; refreshToken: string };
}

export async function getMeRequest(): Promise<User> {
  const res = await api.get('/api/users/me');
  return res.data.data;
}

export async function logoutRequest(refreshToken: string) {
  await api.post('/api/auth/logout', { refreshToken });
}
