import { api } from './client'

export interface RegisterData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
}

export interface LoginData {
  identifier: string
  password: string
}

export const authApi = {
  register: (data: RegisterData) =>
    api.post<{ access_token: string }>('/auth/register', data),

  login: (data: LoginData) =>
    api.post<{ access_token: string }>('/auth/login', data),

  me: () => api.get('/me'),
}
