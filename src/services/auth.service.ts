import { api } from './api';
import type { Usuario } from '../types';

interface RegistroClienteInput {
  rol: 'CLIENTE';
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
}

interface RegistroGrueroInput {
  rol: 'GRUERO';
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  tipoGrua: string;
  placa: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

export type RegistroInput = RegistroClienteInput | RegistroGrueroInput;

interface AuthResponse {
  token: string;
  usuario: Usuario;
}

function guardarSesion(data: AuthResponse) {
  localStorage.setItem('pickcrane_token', data.token);
  localStorage.setItem('pickcrane_usuario', JSON.stringify(data.usuario));
}

export async function registrar(datos: RegistroInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', datos);
  guardarSesion(data);
  return data;
}

export async function iniciarSesion(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  guardarSesion(data);
  return data;
}

export function cerrarSesion() {
  localStorage.removeItem('pickcrane_token');
  localStorage.removeItem('pickcrane_usuario');
}

export function obtenerToken(): string | null {
  return localStorage.getItem('pickcrane_token');
}

export function obtenerUsuarioActual(): Usuario | null {
  const raw = localStorage.getItem('pickcrane_usuario');
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

/** Actualiza el usuario guardado localmente (ej. tras subir documentos o cambiar de estado). */
export function actualizarUsuarioGuardado(usuario: Usuario) {
  localStorage.setItem('pickcrane_usuario', JSON.stringify(usuario));
}
