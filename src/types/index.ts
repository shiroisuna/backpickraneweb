export type Coordenadas = [number, number]; // [lat, lng]

export interface RutaCalculada {
  routeCoords: Coordenadas[];
  distanciaKm: number;
  duracionMin: number;
}

export interface SugerenciaLugar {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export type Rol = 'CLIENTE' | 'GRUERO' | 'ADMIN';
export type EstadoCertificacion = 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
export type TipoDocumento = 'FOTO_GRUA' | 'LICENCIA' | 'CERTIFICADO_MEDICO' | 'RCV';

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  archivoUrl: string;
  createdAt: string;
}

export interface GrueroPerfil {
  id: string;
  estadoCertificacion: EstadoCertificacion;
  tipoGrua: string;
  placa: string;
  direccion: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  documentos?: Documento[];
  usuario?: { nombre: string; email: string; telefono?: string | null };
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  saldoAFavor: number;
  grueroPerfil: GrueroPerfil | null;
}

export type MetodoPago = 'EFECTIVO' | 'PAGO_MOVIL';
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';

export interface Pago {
  id: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  monto: number;
  referencia?: string | null;
  montoEntregado?: number | null;
  vuelto?: number | null;
  comisionPlataforma?: number | null;
}

export type EstadoServicio =
  | 'PENDIENTE_PAGO'
  | 'SOLICITADO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'LLEGADA'
  | 'EN_TRASLADO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface Servicio {
  id: string;
  clienteId: string;
  origenLat: number;
  origenLng: number;
  origenDireccion: string;
  destinoLat: number;
  destinoLng: number;
  destinoDireccion: string;
  distanciaKm?: number | null;
  duracionMin?: number | null;
  tarifaEstimada?: number | null;
  estado: EstadoServicio;
  createdAt: string;
  pago?: Pago | null;
  gruero?: {
    id: string;
    tipoGrua: string;
    placa: string;
    usuario: { nombre: string; telefono?: string | null };
  } | null;
}

/** Gruero activo y aprobado que el cliente puede elegir directamente (con su foto de grúa si la subió). */
export interface GrueroActivo {
  id: string;
  tipoGrua: string;
  placa: string;
  latitud: number;
  longitud: number;
  ultimaLat?: number | null;
  ultimaLng?: number | null;
  usuario: { nombre: string; telefono?: string | null };
  documentos: Documento[];
}

export interface DatosPagoMovil {
  banco: string;
  telefono: string;
  cedulaORif: string;
}

/** Lo que ve el admin al listar pagos móviles pendientes: el Pago con su Servicio anidado. */
export interface PagoConServicio extends Pago {
  servicioId: string;
  createdAt: string;
  servicio: Servicio & {
    cliente: { nombre: string; email: string; telefono?: string | null };
  };
}
