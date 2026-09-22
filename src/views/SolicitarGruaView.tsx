import { useState, useEffect } from 'react';
import { Map } from '../components/Maps';
import type { GrueroMarcador } from '../components/Maps';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { GrueroCercanoCard } from '../components/GrueroCercanoCard';
import MisServiciosView from './MisServiciosView';
import {
  Truck,
  Navigation,
  Route,
  Clock,
  DollarSign,
  ShieldCheck,
  PhoneCall,
  XCircle,
  LogOut,
  Loader2,
  History,
  Wallet,
  Landmark,
  Banknote,
  ArrowLeft,
  Copy,
} from 'lucide-react';
import type { Coordenadas, Servicio, EstadoServicio, GrueroActivo, DatosPagoMovil, Usuario } from '../types';
import { direccionDesdeCoordenadas } from '../services/geocoding.service';
import { calcularRuta } from '../services/routing.service';
import { crearServicio, cambiarEstadoServicio, obtenerMisServicios } from '../services/servicio.service';
import { listarGruerosActivos } from '../services/gruero.service';
import { obtenerDatosPagoMovil } from '../services/pago.service';
import { calcularTarifaEstimada } from '../utils/pricing';
import { distanciaKmEntre } from '../utils/geo';
import { urlArchivo } from '../utils/archivos';
import {
  seguirServicio,
  dejarDeSeguirServicio,
  alRecibirUbicacion,
  alRecibirServicioActualizado,
} from '../services/socket.service';
import { cerrarSesion } from '../services/auth.service';

interface SolicitarGruaViewProps {
  usuario: Usuario;
  onCerrarSesion: () => void;
}

type Paso = 'configurando' | 'pago';

const ESTADOS_EN_PROCESO: EstadoServicio[] = [
  'PENDIENTE_PAGO',
  'SOLICITADO',
  'ASIGNADO',
  'EN_CAMINO',
  'LLEGADA',
  'EN_TRASLADO',
];

export default function SolicitarGruaView({ usuario, onCerrarSesion }: SolicitarGruaViewProps) {
  const [origin, setOrigin] = useState<Coordenadas>([10.2541, -67.9831]);
  const [originName, setOriginName] = useState<string>('San Diego, Carabobo');

  const [destination, setDestination] = useState<Coordenadas | null>([10.2281, -67.8778]);
  const [destinationName, setDestinationName] = useState<string>('Guacara, Carabobo');

  const [routeCoords, setRouteCoords] = useState<Coordenadas[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);

  // Elegir gruero cercano (obligatorio: el backend ya no tiene pool abierto)
  const [gruerosCercanos, setGruerosCercanos] = useState<GrueroActivo[]>([]);
  const [cargandoGrueros, setCargandoGrueros] = useState(false);
  const [grueroElegido, setGrueroElegido] = useState<GrueroActivo | null>(null);

  // Paso de pago
  const [paso, setPaso] = useState<Paso>('configurando');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'PAGO_MOVIL' | null>(null);
  const [montoEntregado, setMontoEntregado] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [datosPagoMovil, setDatosPagoMovil] = useState<DatosPagoMovil | null>(null);

  // El servicio real ya creado
  const [servicioActual, setServicioActual] = useState<Servicio | null>(null);
  const [creandoServicio, setCreandoServicio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Posición real de la grúa, recibida por Socket.IO
  const [grueroPos, setGrueroPos] = useState<Coordenadas | null>(null);
  const [grueroBearing, setGrueroBearing] = useState<number>(0);

  // Vista de historial y detección de una solicitud ya en curso (recarga de página)
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [hayServicioPrevioEnProceso, setHayServicioPrevioEnProceso] = useState(false);

  useEffect(() => {
    if (servicioActual) return;
    obtenerMisServicios()
      .then((lista) => setHayServicioPrevioEnProceso(lista.some((s) => ESTADOS_EN_PROCESO.includes(s.estado))))
      .catch(() => {});
  }, [servicioActual]);

  const handleOriginDrag = async (newCoords: Coordenadas) => {
    setOrigin(newCoords);
    const address = await direccionDesdeCoordenadas(newCoords);
    setOriginName(address);
  };

  const handleDestinationDrag = async (newCoords: Coordenadas) => {
    setDestination(newCoords);
    const address = await direccionDesdeCoordenadas(newCoords);
    setDestinationName(address);
  };

  // Traza la ruta mientras el usuario todavía está configurando la solicitud
  useEffect(() => {
    if (servicioActual || !origin || !destination) return;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const ruta = await calcularRuta(origin, destination);
        if (ruta) {
          setRouteCoords(ruta.routeCoords);
          setDistanceKm(ruta.distanciaKm);
          setDurationMin(ruta.duracionMin);
        }
      } catch (err) {
        console.error('Error calculando ruta:', err);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [origin, destination, servicioActual]);

  // Carga los grueros activos para elegir, una vez que se conoce el origen
  useEffect(() => {
    if (servicioActual) return;
    setCargandoGrueros(true);
    listarGruerosActivos()
      .then(setGruerosCercanos)
      .catch(() => setGruerosCercanos([]))
      .finally(() => setCargandoGrueros(false));
  }, [servicioActual]);

  // Trae los datos de pago móvil cuando el cliente elige ese método
  useEffect(() => {
    if (metodoPago !== 'PAGO_MOVIL' || datosPagoMovil) return;
    obtenerDatosPagoMovil().then(setDatosPagoMovil).catch(() => {});
  }, [metodoPago, datosPagoMovil]);

  // Mientras haya un servicio activo, escucha su ubicación y sus cambios de estado en vivo
  useEffect(() => {
    if (!servicioActual) return;

    seguirServicio(servicioActual.id);

    const dejarUbicacion = alRecibirUbicacion((data) => {
      setGrueroPos([data.lat, data.lng]);
      setGrueroBearing(data.bearing);
    });

    const dejarServicio = alRecibirServicioActualizado((actualizado) => {
      setServicioActual((prev) => (prev ? { ...prev, ...actualizado } : prev));
    });

    return () => {
      dejarUbicacion();
      dejarServicio();
      dejarDeSeguirServicio(servicioActual.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioActual?.id]);

  const tarifaEstimada = calcularTarifaEstimada(distanceKm);
  const vueltoPreview = Math.max(0, Number(montoEntregado || 0) - tarifaEstimada);

  const gruerosOrdenados = gruerosCercanos
    .map((g) => ({ gruero: g, distancia: distanciaKmEntre(origin, [g.ultimaLat ?? g.latitud, g.ultimaLng ?? g.longitud]) }))
    .sort((a, b) => a.distancia - b.distancia);

  const marcadoresGruero: GrueroMarcador[] =
    !servicioActual && paso === 'configurando'
      ? gruerosOrdenados.map(({ gruero: g }) => ({
          id: g.id,
          lat: g.ultimaLat ?? g.latitud,
          lng: g.ultimaLng ?? g.longitud,
          nombre: g.usuario.nombre,
          tipoGrua: g.tipoGrua,
          placa: g.placa,
          fotoUrl: g.documentos?.[0] ? urlArchivo(g.documentos[0].archivoUrl) : null,
        }))
      : [];

  const handleCrearServicio = async () => {
    if (!destination || !grueroElegido || !metodoPago) return;
    setError(null);
    setCreandoServicio(true);
    try {
      const servicio = await crearServicio({
        grueroPerfilId: grueroElegido.id,
        origenLat: origin[0],
        origenLng: origin[1],
        origenDireccion: originName,
        destinoLat: destination[0],
        destinoLng: destination[1],
        destinoDireccion: destinationName,
        distanciaKm: distanceKm,
        duracionMin: durationMin,
        metodoPago,
        ...(metodoPago === 'EFECTIVO' ? { montoEntregado: Number(montoEntregado || tarifaEstimada) } : {}),
        ...(metodoPago === 'PAGO_MOVIL' ? { referenciaPago } : {}),
      });
      setServicioActual(servicio);
    } catch (err) {
      const mensaje = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof mensaje === 'string' ? mensaje : 'No se pudo crear la solicitud. Intenta de nuevo.');
    } finally {
      setCreandoServicio(false);
    }
  };

  const handleCancelar = async () => {
    if (!servicioActual) return;
    try {
      await cambiarEstadoServicio(servicioActual.id, 'CANCELADO');
    } catch {
      // aunque falle en el backend, igual liberamos la pantalla localmente
    } finally {
      setServicioActual(null);
      setGrueroPos(null);
    }
  };

  const nuevaSolicitud = () => {
    setServicioActual(null);
    setGrueroPos(null);
    setError(null);
    setPaso('configurando');
    setMetodoPago(null);
    setMontoEntregado('');
    setReferenciaPago('');
    setGrueroElegido(null);
  };

  const estado = servicioActual?.estado;
  const bloqueadoParaEditar = Boolean(servicioActual);
  const hayServicioEnProceso =
    (Boolean(estado) && ESTADOS_EN_PROCESO.includes(estado as EstadoServicio)) || hayServicioPrevioEnProceso;

  if (mostrarHistorial) {
    return (
      <MisServiciosView
        onVolver={() => setMostrarHistorial(false)}
        onVerServicio={(servicio) => {
          setServicioActual(servicio);
          setMostrarHistorial(false);
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
          <h1 className="text-xl font-bold tracking-wider text-brand-yellow">PickCrane</h1>
        </div>
        <div className="flex items-center gap-3">
          {usuario.saldoAFavor > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 px-3 py-1.5 rounded-full text-green-400 text-xs font-semibold">
              <Wallet className="w-3.5 h-3.5" /> ${usuario.saldoAFavor.toFixed(2)} a favor
            </div>
          )}
          {(estado === 'ASIGNADO' || estado === 'EN_CAMINO' || estado === 'LLEGADA' || estado === 'EN_TRASLADO') && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 px-3 py-1.5 rounded-full text-green-400 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {estado === 'EN_TRASLADO' ? 'Traslado en curso' : 'En Ruta Activa'}
            </div>
          )}
          {hayServicioEnProceso && (
            <button
              onClick={() => setMostrarHistorial(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-black bg-brand-yellow hover:bg-yellow-500 px-3 py-1.5 rounded-full transition"
            >
              <History className="w-3.5 h-3.5" />
              Servicios Solicitados
            </button>
          )}
          <button
            onClick={() => { cerrarSesion(); onCerrarSesion(); }}
            className="text-gray-400 hover:text-white"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-96 bg-brand-gray border-r border-gray-800 p-6 z-10 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {!servicioActual && paso === 'configurando' ? (
            /* Paso 1: configurar origen/destino + elegir gruero */
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-brand-yellow" />
                  Solicitar Grúa
                </h2>
                <p className="text-xs text-gray-400">Selecciona o arrastra los puntos de la avería</p>
              </div>

              <div className="space-y-4">
                <LocationSearchInput
                  key={`orig-${origin[0]}-${origin[1]}`}
                  label="Punto de Origen (Avería)"
                  placeholder="Buscar o arrastrar..."
                  iconColor="text-green-400"
                  initialValue={originName}
                  onSelectLocation={(c, n) => { setOrigin(c); setOriginName(n); }}
                />

                <LocationSearchInput
                  key={`dest-${destination?.[0]}-${destination?.[1]}`}
                  label="Punto de Destino (Taller)"
                  placeholder="Buscar o arrastrar..."
                  iconColor="text-red-400"
                  initialValue={destinationName}
                  onSelectLocation={(c, n) => { setDestination(c); setDestinationName(n); }}
                />
              </div>

              {loadingRoute ? (
                <div className="text-center py-6 text-brand-yellow text-sm animate-pulse">
                  Trazando ruta...
                </div>
              ) : (
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Route className="w-4 h-4 text-blue-400" /> Distancia:
                    </span>
                    <span className="font-bold text-white">{distanceKm} km</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" /> Tiempo:
                    </span>
                    <span className="font-bold text-white">{durationMin} min</span>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-300 font-medium flex items-center gap-1">
                      <DollarSign className="w-5 h-5 text-brand-yellow" /> Tarifa estimada:
                    </span>
                    <span className="font-bold text-brand-yellow text-lg">${tarifaEstimada}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Elige tu gruero</h3>
                {cargandoGrueros ? (
                  <p className="text-xs text-gray-400 animate-pulse">Buscando grúas cercanas activas...</p>
                ) : gruerosOrdenados.length === 0 ? (
                  <p className="text-xs text-gray-500">No hay grúas activas en este momento. Intenta más tarde.</p>
                ) : grueroElegido ? (
                  <div className="p-3 rounded-xl border border-brand-yellow bg-yellow-950/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{grueroElegido.usuario.nombre}</p>
                      <p className="text-xs text-gray-400 truncate">{grueroElegido.tipoGrua} · Placa {grueroElegido.placa}</p>
                    </div>
                    <button
                      onClick={() => setGrueroElegido(null)}
                      className="text-xs text-gray-400 hover:text-white shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {gruerosOrdenados.map(({ gruero, distancia }) => (
                      <GrueroCercanoCard
                        key={gruero.id}
                        gruero={gruero}
                        distanciaKm={distancia}
                        seleccionado={false}
                        onSeleccionar={() => setGrueroElegido(gruero)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={() => setPaso('pago')}
                disabled={loadingRoute || routeCoords.length === 0 || !grueroElegido}
                className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition duration-200"
              >
                Continuar al Pago
              </button>
            </div>
          ) : !servicioActual && paso === 'pago' ? (
            /* Paso 2: elegir método de pago */
            <div className="space-y-5">
              <button
                onClick={() => setPaso('configurando')}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>

              <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-1">
                <p className="text-xs text-gray-400">Gruero elegido</p>
                <p className="text-sm font-semibold text-white">
                  {grueroElegido?.usuario.nombre} · {grueroElegido?.tipoGrua} (Placa {grueroElegido?.placa})
                </p>
                <p className="text-brand-yellow font-bold text-lg pt-1">Tarifa: ${tarifaEstimada}</p>
              </div>

              {!metodoPago ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">¿Cómo vas a pagar?</h3>
                  <button
                    onClick={() => setMetodoPago('EFECTIVO')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-brand-yellow bg-gray-800/40 hover:bg-gray-800 transition text-left"
                  >
                    <Banknote className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="font-semibold text-white">Efectivo</p>
                      <p className="text-xs text-gray-400">Le pagas al gruero directamente</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMetodoPago('PAGO_MOVIL')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-brand-yellow bg-gray-800/40 hover:bg-gray-800 transition text-left"
                  >
                    <Landmark className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-white">Pago Móvil</p>
                      <p className="text-xs text-gray-400">Transfieres a la cuenta de la app; un admin lo verifica</p>
                    </div>
                  </button>
                </div>
              ) : metodoPago === 'EFECTIVO' ? (
                <div className="space-y-4">
                  <button onClick={() => setMetodoPago(null)} className="text-xs text-gray-400 hover:text-white">
                    ← Cambiar método de pago
                  </button>
                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1.5 block">¿Con cuánto vas a pagar?</label>
                    <input
                      type="number"
                      min={tarifaEstimada}
                      step="0.01"
                      value={montoEntregado}
                      onChange={(e) => setMontoEntregado(e.target.value)}
                      placeholder={`Mínimo $${tarifaEstimada}`}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
                  {vueltoPreview > 0 && (
                    <p className="text-xs text-gray-400">
                      Vuelto estimado: <span className="text-brand-yellow font-semibold">${vueltoPreview.toFixed(2)}</span> — si no
                      lo recibes en efectivo, quedará como saldo a favor en tu cuenta.
                    </p>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    onClick={handleCrearServicio}
                    disabled={creandoServicio || Number(montoEntregado || 0) < tarifaEstimada}
                    className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {creandoServicio && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar y Notificar al Gruero
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setMetodoPago(null)} className="text-xs text-gray-400 hover:text-white">
                    ← Cambiar método de pago
                  </button>
                  {!datosPagoMovil ? (
                    <p className="text-xs text-gray-400 animate-pulse">Cargando datos de pago móvil...</p>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-2 text-sm">
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Transfiere a esta cuenta</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Banco:</span>
                        <span className="text-white font-medium">{datosPagoMovil.banco}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Teléfono:</span>
                        <span className="text-white font-medium flex items-center gap-1.5">
                          {datosPagoMovil.telefono}
                          <Copy
                            className="w-3.5 h-3.5 cursor-pointer text-gray-500 hover:text-white"
                            onClick={() => navigator.clipboard.writeText(datosPagoMovil.telefono)}
                          />
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Cédula/RIF:</span>
                        <span className="text-white font-medium">{datosPagoMovil.cedulaORif}</span>
                      </div>
                      <hr className="border-gray-700" />
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-300">Monto a pagar:</span>
                        <span className="font-bold text-brand-yellow">${tarifaEstimada}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
                      Número de referencia de tu transferencia
                    </label>
                    <input
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder="Ej: 003456789"
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-brand-yellow"
                    />
                  </div>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <button
                    onClick={handleCrearServicio}
                    disabled={creandoServicio || referenciaPago.trim().length < 4}
                    className="w-full py-3.5 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {creandoServicio && <Loader2 className="w-4 h-4 animate-spin" />}
                    Ya pagué, enviar referencia
                  </button>
                </div>
              )}
            </div>
          ) : estado === 'PENDIENTE_PAGO' ? (
            /* Esperando que el admin verifique el pago móvil */
            <div className="space-y-6 flex-1 flex flex-col justify-center items-center text-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              <div>
                <h3 className="text-base font-bold text-white">Verificando tu pago móvil...</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Referencia: {servicioActual?.pago?.referencia} — un administrador la está confirmando
                </p>
              </div>
              <button onClick={handleCancelar} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Cancelar solicitud
              </button>
            </div>
          ) : estado === 'SOLICITADO' ? (
            /* Esperando que el gruero elegido acepte */
            <div className="space-y-6 flex-1 flex flex-col justify-center items-center text-center">
              <Loader2 className="w-10 h-10 text-brand-yellow animate-spin" />
              <div>
                <h3 className="text-base font-bold text-white">Esperando que {servicioActual?.gruero?.usuario.nombre} acepte...</h3>
                <p className="text-xs text-gray-400 mt-1">Ya le llegó tu solicitud</p>
              </div>
              <button onClick={handleCancelar} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Cancelar solicitud
              </button>
            </div>
          ) : estado === 'ASIGNADO' || estado === 'EN_CAMINO' || estado === 'LLEGADA' || estado === 'EN_TRASLADO' ? (
            /* Gruero real asignado, con su ubicación en vivo */
            <div className="space-y-6">
              <div className="bg-green-950/40 border border-green-800/50 p-4 rounded-2xl text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <h3 className="text-base font-bold text-green-400">
                  {estado === 'EN_TRASLADO' ? '¡Traslado Iniciado!' : '¡Grúa Asignada!'}
                </h3>
                <p className="text-xs text-gray-300">
                  {servicioActual?.gruero?.usuario.nombre} · {servicioActual?.gruero?.tipoGrua} (Placa {servicioActual?.gruero?.placa})
                </p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-2">
                <p className="text-xs text-gray-400 uppercase font-semibold">Estado</p>
                <p className="text-lg font-bold text-brand-yellow">
                  {estado === 'EN_CAMINO'
                    ? 'El gruero va en camino'
                    : estado === 'LLEGADA'
                    ? 'El gruero llegó a tu ubicación'
                    : estado === 'EN_TRASLADO'
                    ? 'Traslado iniciado: tu vehículo va camino al taller'
                    : 'Asignado, esperando que inicie el viaje'}
                </p>
                {!grueroPos && (
                  <p className="text-xs text-gray-500">Aún no recibimos su ubicación en vivo, espera un momento...</p>
                )}
              </div>

              {servicioActual?.gruero?.usuario.telefono && (
                <a
                  href={`tel:${servicioActual.gruero.usuario.telefono}`}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <PhoneCall className="w-4 h-4 text-green-400" />
                  Llamar al Conductor
                </a>
              )}

              <button
                onClick={handleCancelar}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelar Servicio
              </button>
            </div>
          ) : (
            /* COMPLETADO o CANCELADO */
            <div className="space-y-6 flex-1 flex flex-col justify-center items-center text-center">
              {estado === 'COMPLETADO' ? (
                <>
                  <ShieldCheck className="w-10 h-10 text-green-400" />
                  <h3 className="text-base font-bold text-white">Servicio completado</h3>
                  {servicioActual?.pago?.metodo === 'EFECTIVO' && servicioActual.pago.vuelto ? (
                    <p className="text-xs text-gray-400">
                      Tu vuelto de ${servicioActual.pago.vuelto.toFixed(2)} quedó como saldo a favor en tu cuenta.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-gray-500" />
                  <h3 className="text-base font-bold text-white">
                    {servicioActual?.pago?.estado === 'RECHAZADO' ? 'Tu pago no pudo ser verificado' : 'Servicio cancelado'}
                  </h3>
                </>
              )}
              <button
                onClick={nuevaSolicitud}
                className="py-2.5 px-5 bg-brand-yellow hover:bg-yellow-500 text-black font-bold rounded-xl transition"
              >
                Solicitar otra grúa
              </button>
            </div>
          )}
        </aside>

        <div className="flex-1 h-full w-full">
          <Map
            origin={origin}
            destination={destination}
            routeCoords={routeCoords}
            cranePos={grueroPos}
            craneBearing={grueroBearing}
            isLiveTracking={bloqueadoParaEditar}
            onOriginDragEnd={handleOriginDrag}
            onDestinationDragEnd={handleDestinationDrag}
            grueros={marcadoresGruero}
            grueroSeleccionadoId={grueroElegido?.id ?? null}
            onSeleccionarGruero={(id) => {
              const encontrado = gruerosCercanos.find((g) => g.id === id);
              if (encontrado) setGrueroElegido(encontrado);
            }}
          />
        </div>
      </main>
    </div>
  );
}
