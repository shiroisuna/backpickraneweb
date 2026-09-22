import { useEffect, useState } from 'react';
import { Truck, ShieldCheck, Clock, XCircle, LogOut, RefreshCcw } from 'lucide-react';
import { DocumentoUploadCard } from '../components/DocumentoUploadCard';
import { obtenerPerfilGruero, subirDocumentoGruero } from '../services/gruero.service';
import { actualizarUsuarioGuardado, cerrarSesion } from '../services/auth.service';
import type { GrueroPerfil, TipoDocumento, Usuario } from '../types';

interface CertificacionGrueroViewProps {
  usuario: Usuario;
  onCertificado: () => void;
  onCerrarSesion: () => void;
}

const DOCUMENTOS: { tipo: TipoDocumento; titulo: string; descripcion: string }[] = [
  { tipo: 'FOTO_GRUA', titulo: 'Foto de la grúa', descripcion: 'Una foto clara del vehículo completo' },
  { tipo: 'LICENCIA', titulo: 'Licencia de conducir', descripcion: 'Vigente, categoría acorde al vehículo' },
  { tipo: 'CERTIFICADO_MEDICO', titulo: 'Certificado médico', descripcion: 'No mayor a 1 año de emitido' },
  { tipo: 'RCV', titulo: 'RCV (seguro)', descripcion: 'Responsabilidad Civil Vehicular vigente' },
];

export default function CertificacionGrueroView({ usuario, onCertificado, onCerrarSesion }: CertificacionGrueroViewProps) {
  const [perfil, setPerfil] = useState<GrueroPerfil | null>(usuario.grueroPerfil);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = async () => {
    try {
      const data = await obtenerPerfilGruero();
      setPerfil(data);
      actualizarUsuarioGuardado({ ...usuario, grueroPerfil: data });
      if (data.estadoCertificacion === 'APROBADO') onCertificado();
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras está EN_REVISION, revisa cada 15s si el admin ya lo resolvió,
  // para no depender de que el gruero recargue la página manualmente.
  useEffect(() => {
    if (perfil?.estadoCertificacion !== 'EN_REVISION') return;
    const intervalo = setInterval(cargarPerfil, 15000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.estadoCertificacion]);

  const tiposSubidos = new Set((perfil?.documentos || []).map((d) => d.tipo));

  const handleSubir = async (tipo: TipoDocumento, archivo: File) => {
    await subirDocumentoGruero(tipo, archivo);
    await cargarPerfil();
  };

  if (cargando) {
    return (
      <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center text-brand-yellow">
        Cargando tu perfil...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-brand-gray border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-yellow p-2 rounded-lg text-black font-bold">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-brand-yellow">Certificación de gruero</h1>
              <p className="text-xs text-gray-400">{usuario.nombre} · {perfil?.tipoGrua} · Placa {perfil?.placa}</p>
            </div>
          </div>
          <button
            onClick={() => {
              cerrarSesion();
              onCerrarSesion();
            }}
            className="text-gray-400 hover:text-white"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {perfil?.estadoCertificacion === 'EN_REVISION' && (
          <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-4 flex items-center justify-between gap-3 text-yellow-300 text-sm">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 shrink-0" />
              Ya subiste tus 4 documentos. Están en revisión — te avisamos apenas un administrador los apruebe.
            </div>
            <button
              onClick={cargarPerfil}
              className="shrink-0 text-yellow-300 hover:text-white"
              title="Verificar ahora"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        )}
        {perfil?.estadoCertificacion === 'RECHAZADO' && (
          <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
            <XCircle className="w-5 h-5 shrink-0" />
            Tu certificación fue rechazada. Contacta a soporte para más información.
          </div>
        )}
        {perfil?.estadoCertificacion === 'APROBADO' && (
          <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-4 flex items-center gap-3 text-green-300 text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            ¡Certificación aprobada! Ya puedes empezar a recibir servicios.
          </div>
        )}

        <div className="space-y-3">
          {DOCUMENTOS.map((doc) => (
            <DocumentoUploadCard
              key={doc.tipo}
              titulo={doc.titulo}
              descripcion={doc.descripcion}
              yaSubido={tiposSubidos.has(doc.tipo)}
              onSubir={(archivo) => handleSubir(doc.tipo, archivo)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
