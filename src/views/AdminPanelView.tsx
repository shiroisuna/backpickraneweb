import { useEffect, useState } from 'react';
import { ShieldCheck, XCircle, LogOut, Truck, FileText, RefreshCcw, Landmark } from 'lucide-react';
import {
  listarGruerosPendientes,
  cambiarCertificacion,
  listarPagosPendientes,
  confirmarPago,
} from '../services/admin.service';
import { cerrarSesion } from '../services/auth.service';
import { urlArchivo } from '../utils/archivos';
import type { EstadoCertificacion, GrueroPerfil, TipoDocumento, PagoConServicio } from '../types';

interface AdminPanelViewProps {
  onCerrarSesion: () => void;
}

const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  FOTO_GRUA: 'Foto de la grúa',
  LICENCIA: 'Licencia',
  CERTIFICADO_MEDICO: 'Cert. médico',
  RCV: 'RCV',
};

const FILTROS: { valor: EstadoCertificacion; etiqueta: string }[] = [
  { valor: 'EN_REVISION', etiqueta: 'En revisión' },
  { valor: 'APROBADO', etiqueta: 'Aprobados' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados' },
  { valor: 'PENDIENTE', etiqueta: 'Pendientes (sin documentos)' },
];

type Seccion = 'certificaciones' | 'pagos';

export default function AdminPanelView({ onCerrarSesion }: AdminPanelViewProps) {
  const [seccion, setSeccion] = useState<Seccion>('certificaciones');

  const [filtro, setFiltro] = useState<EstadoCertificacion>('EN_REVISION');
  const [grueros, setGrueros] = useState<GrueroPerfil[]>([]);
  const [cargandoGrueros, setCargandoGrueros] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [pagos, setPagos] = useState<PagoConServicio[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(true);
  const [procesandoPagoId, setProcesandoPagoId] = useState<string | null>(null);

  const cargarGrueros = async (estado: EstadoCertificacion) => {
    setCargandoGrueros(true);
    try {
      setGrueros(await listarGruerosPendientes(estado));
    } finally {
      setCargandoGrueros(false);
    }
  };

  const cargarPagos = async () => {
    setCargandoPagos(true);
    try {
      setPagos(await listarPagosPendientes());
    } finally {
      setCargandoPagos(false);
    }
  };

  useEffect(() => {
    if (seccion === 'certificaciones') cargarGrueros(filtro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, seccion]);

  useEffect(() => {
    if (seccion === 'pagos') cargarPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion]);

  const resolverCertificacion = async (id: string, estado: 'APROBADO' | 'RECHAZADO') => {
    setProcesandoId(id);
    try {
      await cambiarCertificacion(id, estado);
      setGrueros((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setProcesandoId(null);
    }
  };

  const resolverPago = async (pagoId: string, aprobar: boolean) => {
    setProcesandoPagoId(pagoId);
    try {
      await confirmarPago(pagoId, aprobar);
      setPagos((prev) => prev.filter((p) => p.id !== pagoId));
    } finally {
      setProcesandoPagoId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-dark font-sans">
      <header className="bg-brand-gray border-b border-gray-800 p-4 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-brand-yellow p-2 rounded-lg text-black font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-brand-yellow">Panel de Administración</h1>
        </div>
        <button
          onClick={() => { cerrarSesion(); onCerrarSesion(); }}
          className="text-gray-400 hover:text-white"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-4 flex items-center gap-2">
        <button
          onClick={() => setSeccion('certificaciones')}
          className={`text-sm font-semibold px-4 py-2 rounded-t-lg border-b-2 transition ${
            seccion === 'certificaciones' ? 'border-brand-yellow text-brand-yellow' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Certificaciones
        </button>
        <button
          onClick={() => setSeccion('pagos')}
          className={`text-sm font-semibold px-4 py-2 rounded-t-lg border-b-2 transition flex items-center gap-1.5 ${
            seccion === 'pagos' ? 'border-brand-yellow text-brand-yellow' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" /> Pagos Móviles
          {pagos.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5 ml-1">{pagos.length}</span>
          )}
        </button>
      </div>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {seccion === 'certificaciones' ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {FILTROS.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => setFiltro(f.valor)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                    filtro === f.valor
                      ? 'bg-brand-yellow text-black border-brand-yellow'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {f.etiqueta}
                </button>
              ))}
              <button
                onClick={() => cargarGrueros(filtro)}
                className="ml-auto text-gray-400 hover:text-white flex items-center gap-1 text-xs"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Refrescar
              </button>
            </div>

            {cargandoGrueros ? (
              <p className="text-brand-yellow text-sm text-center py-10 animate-pulse">Cargando...</p>
            ) : grueros.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-10">No hay grueros en este estado.</p>
            ) : (
              <div className="space-y-4">
                {grueros.map((g) => (
                  <div key={g.id} className="bg-brand-gray border border-gray-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{g.usuario?.nombre}</p>
                        <p className="text-xs text-gray-400">{g.usuario?.email} {g.usuario?.telefono ? `· ${g.usuario.telefono}` : ''}</p>
                        <p className="text-xs text-gray-400 mt-1">{g.tipoGrua} · Placa {g.placa}</p>
                        <p className="text-xs text-gray-500">{g.direccion}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(g.documentos || []).map((doc) => (
                        <a
                          key={doc.id}
                          href={urlArchivo(doc.archivoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-gray-800/50 rounded-lg p-2"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {ETIQUETAS_DOCUMENTO[doc.tipo]}
                        </a>
                      ))}
                    </div>

                    {filtro === 'EN_REVISION' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => resolverCertificacion(g.id, 'APROBADO')}
                          disabled={procesandoId === g.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                        >
                          <ShieldCheck className="w-4 h-4" /> Aprobar
                        </button>
                        <button
                          onClick={() => resolverCertificacion(g.id, 'RECHAZADO')}
                          disabled={procesandoId === g.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                        >
                          <XCircle className="w-4 h-4" /> Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <button onClick={cargarPagos} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                <RefreshCcw className="w-3.5 h-3.5" /> Refrescar
              </button>
            </div>

            {cargandoPagos ? (
              <p className="text-brand-yellow text-sm text-center py-10 animate-pulse">Cargando...</p>
            ) : pagos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-10">No hay pagos móviles pendientes de verificar.</p>
            ) : (
              <div className="space-y-4">
                {pagos.map((p) => (
                  <div key={p.id} className="bg-brand-gray border border-gray-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{p.servicio.cliente.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {p.servicio.cliente.email} {p.servicio.cliente.telefono ? `· ${p.servicio.cliente.telefono}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {p.servicio.origenDireccion} → {p.servicio.destinoDireccion}
                        </p>
                        {p.servicio.gruero && (
                          <p className="text-xs text-gray-500">Gruero elegido: {p.servicio.gruero.usuario.nombre}</p>
                        )}
                      </div>
                      <p className="text-brand-yellow font-bold text-lg shrink-0">${p.monto}</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between text-sm">
                      <span className="text-gray-400">Referencia declarada:</span>
                      <span className="text-white font-mono font-semibold">{p.referencia}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => resolverPago(p.id, true)}
                        disabled={procesandoPagoId === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                      >
                        <ShieldCheck className="w-4 h-4" /> Aprobar pago
                      </button>
                      <button
                        onClick={() => resolverPago(p.id, false)}
                        disabled={procesandoPagoId === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
