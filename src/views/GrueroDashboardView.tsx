import { useEffect, useRef, useState } from 'react';
import { Truck, LogOut, Route, DollarSign, Clock, MapPin, ShieldCheck, XCircle, Navigation, History } from 'lucide-react';
import { Switch } from '../components/Switch';
import { MapaGruero } from '../components/MapaGruero';
import MisServiciosView from './MisServiciosView';
import { actualizarDisponibilidad } from '../services/gruero.service';
import { listarDisponibles, aceptarServicio, cambiarEstadoServicio } from '../services/servicio.service';
import { cerrarSesion, actualizarUsuarioGuardado } from '../services/auth.service';
import { seguirServicio, dejarDeSeguirServicio, enviarUbicacion, alRecibirServicioActualizado, alRecibirServicioNuevo } from '../services/socket.service';
import { calcularBearing } from '../utils/geo';
import type { Coordenadas, Pago, Servicio, Usuario } from '../types';

interface GrueroDashboardViewProps {
  usuario: Usuario;
  onCerrarSesion: () => void;
}

export default function GrueroDashboardView({ usuario, onCerrarSesion }: GrueroDashboardViewProps) {
  const perfil = usuario.grueroPerfil!;

  const [activo, setActivo] = useState(perfil.activo);
  const [posicion, setPosicion] = useState<Coordenadas | null>([perfil.latitud, perfil.longitud]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [seleccionado, setSeleccionado] = useState<Servicio | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El servicio que este gruero ya tomó y está atendiendo:
  // ASIGNADO -> EN_CAMINO -> LLEGADA -> EN_TRASLADO -> COMPLETADO
  const [servicioEnCurso, setServicioEnCurso] = useState<Servicio | null>(null);
  const [actualizandoEstadoServicio, setActualizandoEstadoServicio] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [resumenPago, setResumenPago] = useState<Pago | null>(null);

  const intervalDisponiblesRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const posicionAnteriorRef = useRef<Coordenadas | null>(null);

  const cargarDisponibles = async () => {
    try {
      setServicios(await listarDisponibles());
    } catch {
      // silencioso: si falla un refresco puntual no interrumpimos al gruero
    }
  };

  // Mientras está activo y sin servicio en curso, refresca la lista cada 8s
  useEffect(() => {
    if (!activo || servicioEnCurso) {
      if (intervalDisponiblesRef.current) clearInterval(intervalDisponiblesRef.current);
      if (!servicioEnCurso) setServicios([]);
      setSeleccionado(null);
      return;
    }
    cargarDisponibles();
    intervalDisponiblesRef.current = window.setInterval(cargarDisponibles, 8000);
    return () => {
      if (intervalDisponiblesRef.current) clearInterval(intervalDisponiblesRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, servicioEnCurso]);

  // Mientras hay un servicio en curso, escucha si el cliente lo cancela
  useEffect(() => {
    if (!servicioEnCurso) return;

    seguirServicio(servicioEnCurso.id);
    const dejarDeEscuchar = alRecibirServicioActualizado((actualizado) => {
      if (actualizado.estado === 'CANCELADO') {
        detenerEnvioUbicacion();
        setServicioEnCurso(null);
        setError('El cliente canceló el servicio.');
      } else {
        setServicioEnCurso((prev) => (prev ? { ...prev, ...actualizado } : prev));
      }
    });

    return () => {
      dejarDeEscuchar();
      dejarDeSeguirServicio(servicioEnCurso.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioEnCurso?.id]);

  const obtenerUbicacionActual = (): Promise<Coordenadas> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocalización no disponible en este navegador'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => reject(new Error('No se pudo obtener tu ubicación')),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const handleToggleActivo = async (nuevoValor: boolean) => {
    setError(null);
    setCambiandoEstado(true);
    try {
      let coords: Coordenadas = posicion || [perfil.latitud, perfil.longitud];

      if (nuevoValor) {
        try {
          coords = await obtenerUbicacionActual();
          setPosicion(coords);
        } catch {
          // sin permiso de ubicación: seguimos con la dirección registrada
        }
      }

      await actualizarDisponibilidad(nuevoValor, coords[0], coords[1]);
      setActivo(nuevoValor);
      actualizarUsuarioGuardado({
        ...usuario,
        grueroPerfil: { ...perfil, activo: nuevoValor, latitud: coords[0], longitud: coords[1] },
      });
    } catch {
      setError('No se pudo actualizar tu disponibilidad. Intenta de nuevo.');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleAceptar = async () => {
    if (!seleccionado) return;
    setAceptando(true);
    setError(null);
    try {
      const servicio = await aceptarServicio(seleccionado.id);
      setServicioEnCurso(servicio);
      setServicios((prev) => prev.filter((s) => s.id !== seleccionado.id));
      setSeleccionado(null);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 409
          ? 'Ese servicio ya fue tomado por otro gruero.'
          : 'No se pudo aceptar el servicio. Intenta de nuevo.'
      );
      cargarDisponibles();
    } finally {
      setAceptando(false);
    }
  };

  /** Empieza a mandar la ubicación real por Socket.IO cada vez que el navegador reporta movimiento. */
  const iniciarEnvioUbicacion = (servicioId: string) => {
    if (!navigator.geolocation) return;
    posicionAnteriorRef.current = posicion;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nueva: Coordenadas = [pos.coords.latitude, pos.coords.longitude];
        const anterior = posicionAnteriorRef.current;
        const bearing = anterior ? calcularBearing(anterior, nueva) : 0;

        posicionAnteriorRef.current = nueva;
        setPosicion(nueva);
        enviarUbicacion(servicioId, nueva[0], nueva[1], bearing);
      },
      () => setError('No se pudo activar el GPS en vivo. El cliente no verá tu ubicación moverse.'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const detenerEnvioUbicacion = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => () => detenerEnvioUbicacion(), []); // limpieza al desmontar

  const handleIniciarViaje = async () => {
    if (!servicioEnCurso) return;
    setActualizandoEstadoServicio(true);
    try {
      const actualizado = await cambiarEstadoServicio(servicioEnCurso.id, 'EN_CAMINO');
      setServicioEnCurso(actualizado);
      iniciarEnvioUbicacion(servicioEnCurso.id);
    } catch {
      setError('No se pudo marcar el viaje como iniciado.');
    } finally {
      setActualizandoEstadoServicio(false);
    }
  };

  /** El gruero notifica que llegó al punto del cliente (todavía no ha enganchado el vehículo). */
  const handleNotificarLlegada = async () => {
    if (!servicioEnCurso) return;
    setActualizandoEstadoServicio(true);
    try {
      const actualizado = await cambiarEstadoServicio(servicioEnCurso.id, 'LLEGADA');
      setServicioEnCurso(actualizado);
    } catch {
      setError('No se pudo notificar la llegada.');
    } finally {
      setActualizandoEstadoServicio(false);
    }
  };

  /** Inicia el traslado real del vehículo: del origen (cliente) al destino (taller). */
  const handleIniciarServicio = async () => {
    if (!servicioEnCurso) return;
    setActualizandoEstadoServicio(true);
    try {
      const actualizado = await cambiarEstadoServicio(servicioEnCurso.id, 'EN_TRASLADO');
      setServicioEnCurso(actualizado);
      // El GPS ya venía enviándose desde "Iniciar viaje"; sigue activo durante el traslado.
    } catch {
      setError('No se pudo iniciar el traslado.');
    } finally {
      setActualizandoEstadoServicio(false);
    }
  };

  // Notificación en vivo: apenas un cliente elige a este gruero (efectivo, o
  // pago móvil ya aprobado por el admin), la solicitud aparece al instante
  // sin esperar el refresco de 8s.
  useEffect(() => {
    const dejarDeEscuchar = alRecibirServicioNuevo((servicio) => {
      setServicios((prev) => (prev.some((s) => s.id === servicio.id) ? prev : [servicio, ...prev]));
    });
    return dejarDeEscuchar;
  }, []);

  const handleFinalizarServicio = async () => {
    if (!servicioEnCurso) return;
    setActualizandoEstadoServicio(true);
    try {
      const actualizado = await cambiarEstadoServicio(servicioEnCurso.id, 'COMPLETADO');
      detenerEnvioUbicacion();
      if (actualizado.pago?.metodo === 'EFECTIVO') {
        setResumenPago(actualizado.pago);
      }
      setServicioEnCurso(null);
    } catch {
      setError('No se pudo marcar el servicio como completado.');
    } finally {
      setActualizandoEstadoServicio(false);
    }
  };

  if (mostrarHistorial) {
    return (
      <MisServiciosView
        titulo="Servicios Atendidos"
        onVolver={() => setMostrarHistorial(false)}
        onVerServicio={(servicio) => {
          setServicioEnCurso(servicio);
          setMostrarHistorial(false);
          if (servicio.estado === 'EN_CAMINO' || servicio.estado === 'LLEGADA' || servicio.estado === 'EN_TRASLADO') {
            iniciarEnvioUbicacion(servicio.id);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-brand-dark font-sans">
      <header className="bg-brand-gray border-b border-gray-800 p-4 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-yellow p-2 rounded-lg text-black font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-brand-yellow">PickCrane</h1>
            <p className="text-xs text-gray-400">{perfil.tipoGrua} · Placa {perfil.placa}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setMostrarHistorial(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-full transition"
          >
            <History className="w-3.5 h-3.5" />
            Historial
          </button>
          <div className="flex items-center gap-2">
            <Switch activo={activo} onChange={handleToggleActivo} disabled={cambiandoEstado || Boolean(servicioEnCurso)} />
            <span className={`text-xs font-semibold ${activo ? 'text-green-400' : 'text-gray-400'}`}>
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <button onClick={() => { cerrarSesion(); onCerrarSesion(); }} className="text-gray-400 hover:text-white" title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-96 bg-brand-gray border-r border-gray-800 p-6 z-10 shadow-2xl flex flex-col overflow-y-auto">
          {resumenPago ? (
            <div className="space-y-4 flex-1 flex flex-col justify-center items-center text-center">
              <ShieldCheck className="w-10 h-10 text-green-400" />
              <div>
                <h3 className="text-base font-bold text-white">Servicio completado y cobro registrado</h3>
                <p className="text-xs text-gray-400 mt-1">Cobraste ${resumenPago.monto} en efectivo</p>
              </div>
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-2 text-sm w-full">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Comisión de la plataforma (1.5%):</span>
                  <span className="text-white font-semibold">${resumenPago.comisionPlataforma?.toFixed(2)}</span>
                </div>
                {resumenPago.vuelto ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Vuelto entregado al cliente:</span>
                    <span className="text-white font-semibold">${resumenPago.vuelto.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => setResumenPago(null)}
                className="py-2.5 px-5 bg-brand-yellow hover:bg-yellow-500 text-black font-bold rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          ) : servicioEnCurso ? (
            /* Servicio tomado: ASIGNADO -> EN_CAMINO -> LLEGADA -> EN_TRASLADO -> COMPLETADO */
            <div className="space-y-4">
              <div className="bg-green-950/40 border border-green-800/50 p-4 rounded-2xl text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <h3 className="text-base font-bold text-green-400">
                  {servicioEnCurso.estado === 'EN_CAMINO'
                    ? 'Vas en camino'
                    : servicioEnCurso.estado === 'LLEGADA'
                    ? 'Llegaste al punto del cliente'
                    : servicioEnCurso.estado === 'EN_TRASLADO'
                    ? 'Traslado en curso'
                    : 'Servicio asignado'}
                </h3>
              </div>
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-2 text-sm">
                <p className="text-gray-300"><span className="text-gray-500">Origen:</span> {servicioEnCurso.origenDireccion}</p>
                <p className="text-gray-300"><span className="text-gray-500">Destino:</span> {servicioEnCurso.destinoDireccion}</p>
                {servicioEnCurso.tarifaEstimada != null && (
                  <p className="text-brand-yellow font-semibold flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> {servicioEnCurso.tarifaEstimada}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {servicioEnCurso.estado === 'ASIGNADO' && (
                <button
                  onClick={handleIniciarViaje}
                  disabled={actualizandoEstadoServicio}
                  className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Iniciar viaje (activa tu GPS en vivo)
                </button>
              )}

              {servicioEnCurso.estado === 'EN_CAMINO' && (
                <button
                  onClick={handleNotificarLlegada}
                  disabled={actualizandoEstadoServicio}
                  className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Notificar llegada al cliente
                </button>
              )}

              {servicioEnCurso.estado === 'LLEGADA' && (
                <button
                  onClick={handleIniciarServicio}
                  disabled={actualizandoEstadoServicio}
                  className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Iniciar Servicio (comenzar traslado)
                </button>
              )}

              {servicioEnCurso.estado === 'EN_TRASLADO' && (
                <button
                  onClick={handleFinalizarServicio}
                  disabled={actualizandoEstadoServicio}
                  className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Marcar como completado
                </button>
              )}
            </div>
          ) : !activo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-gray-400">
              <MapPin className="w-10 h-10 text-gray-600" />
              <p className="text-sm">Actívate con el switch de arriba para ver y aceptar solicitudes de servicio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Solicitudes disponibles</h2>
                <p className="text-xs text-gray-400">
                  {servicios.length === 0 ? 'No hay solicitudes por ahora.' : 'Selecciona una en el mapa o en la lista.'}
                </p>
              </div>

              {error && <p className="text-sm text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {error}</p>}

              <div className="space-y-2">
                {servicios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSeleccionado(s)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      seleccionado?.id === s.id
                        ? 'border-brand-yellow bg-yellow-950/20'
                        : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
                    }`}
                  >
                    <p className="text-sm text-white font-medium flex items-center gap-1.5">
                      <Route className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {s.origenDireccion}
                    </p>
                    <p className="text-xs text-gray-500 truncate">→ {s.destinoDireccion}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      {s.distanciaKm != null && (
                        <span className="flex items-center gap-1"><Route className="w-3 h-3" /> {s.distanciaKm} km</span>
                      )}
                      {s.duracionMin != null && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duracionMin} min</span>
                      )}
                      {s.tarifaEstimada != null && (
                        <span className="flex items-center gap-1 text-brand-yellow font-semibold">
                          <DollarSign className="w-3 h-3" /> {s.tarifaEstimada}
                        </span>
                      )}
                      {s.pago?.metodo && (
                        <span className="text-gray-500">· {s.pago.metodo === 'EFECTIVO' ? 'Efectivo' : 'Pago Móvil ✓'}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {seleccionado && (
                <button
                  onClick={handleAceptar}
                  disabled={aceptando}
                  className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition"
                >
                  {aceptando ? 'Aceptando...' : 'Aceptar Servicio'}
                </button>
              )}
            </div>
          )}
        </aside>

        <div className="flex-1 h-full w-full">
          <MapaGruero
            posicionGruero={posicion}
            servicios={servicioEnCurso ? [] : servicios}
            servicioSeleccionadoId={seleccionado?.id ?? null}
            onSeleccionarServicio={setSeleccionado}
          />
        </div>
      </main>
    </div>
  );
}
