import { useEffect, useState } from 'react';
import { ArrowLeft, Route, Clock, DollarSign, Loader2 } from 'lucide-react';
import { obtenerMisServicios } from '../services/servicio.service';
import type { EstadoServicio, Servicio } from '../types';

interface MisServiciosViewProps {
  titulo?: string;
  onVolver: () => void;
  onVerServicio: (servicio: Servicio) => void;
}

const EN_PROCESO: EstadoServicio[] = ['PENDIENTE_PAGO', 'SOLICITADO', 'ASIGNADO', 'EN_CAMINO', 'LLEGADA', 'EN_TRASLADO'];

const ETIQUETA_ESTADO: Record<EstadoServicio, string> = {
  PENDIENTE_PAGO: 'Verificando tu pago',
  SOLICITADO: 'Esperando que el gruero acepte',
  ASIGNADO: 'Gruero asignado',
  EN_CAMINO: 'En camino',
  LLEGADA: 'Gruero en el lugar',
  EN_TRASLADO: 'Traslado en curso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

const COLOR_ESTADO: Record<EstadoServicio, string> = {
  PENDIENTE_PAGO: 'text-purple-400 bg-purple-950/30 border-purple-800/50',
  SOLICITADO: 'text-yellow-400 bg-yellow-950/30 border-yellow-800/50',
  ASIGNADO: 'text-blue-400 bg-blue-950/30 border-blue-800/50',
  EN_CAMINO: 'text-blue-400 bg-blue-950/30 border-blue-800/50',
  LLEGADA: 'text-green-400 bg-green-950/30 border-green-800/50',
  EN_TRASLADO: 'text-green-400 bg-green-950/30 border-green-800/50',
  COMPLETADO: 'text-gray-400 bg-gray-800/40 border-gray-700',
  CANCELADO: 'text-red-400 bg-red-950/30 border-red-800/50',
};

export default function MisServiciosView({ titulo = 'Mis Servicios', onVolver, onVerServicio }: MisServiciosViewProps) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerMisServicios()
      .then(setServicios)
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="min-h-screen w-full bg-brand-dark font-sans">
      <header className="bg-brand-gray border-b border-gray-800 p-4 flex items-center gap-3 text-white shadow-md">
        <button onClick={onVolver} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-brand-yellow">{titulo}</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-3">
        {cargando ? (
          <p className="text-brand-yellow text-sm text-center py-10 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </p>
        ) : servicios.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">Todavía no has solicitado ninguna grúa.</p>
        ) : (
          servicios.map((s) => {
            const enProceso = EN_PROCESO.includes(s.estado);
            return (
              <button
                key={s.id}
                onClick={() => enProceso && onVerServicio(s)}
                disabled={!enProceso}
                className={`w-full text-left bg-brand-gray border border-gray-800 rounded-2xl p-4 space-y-2 transition ${
                  enProceso ? 'hover:border-brand-yellow cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${COLOR_ESTADO[s.estado]}`}>
                    {ETIQUETA_ESTADO[s.estado]}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-white">{s.origenDireccion}</p>
                <p className="text-xs text-gray-500">→ {s.destinoDireccion}</p>

                <div className="flex items-center gap-3 text-xs text-gray-400">
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
                    <span className="text-gray-500">
                      · {s.pago.metodo === 'EFECTIVO' ? 'Efectivo' : 'Pago Móvil'}
                    </span>
                  )}
                </div>

                {enProceso && <p className="text-[11px] text-brand-yellow pt-1">Toca para ver el seguimiento en vivo →</p>}
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}
