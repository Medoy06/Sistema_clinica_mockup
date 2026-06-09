import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'doctor' | 'recepcionista' | 'enfermera';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },

  getMe: async (token: string): Promise<User> => {
    const res = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  },
};