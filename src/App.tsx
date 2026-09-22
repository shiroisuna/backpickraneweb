import { useState } from 'react';
import SolicitarGruaView from './views/SolicitarGruaView';
import RegistroView from './views/RegistroView';
import LoginView from './views/LoginView';
import CertificacionGrueroView from './views/CertificacionGrueroView';
import GrueroDashboardView from './views/GrueroDashboardView';
import AdminPanelView from './views/AdminPanelView';
import { obtenerUsuarioActual } from './services/auth.service';
import type { Usuario } from './types';
import './App.css';

type Pantalla = 'registro' | 'login';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => obtenerUsuarioActual());
  const [pantallaAuth, setPantallaAuth] = useState<Pantalla>('registro');

  // Sin sesión: registro o login
  if (!usuario) {
    return pantallaAuth === 'registro' ? (
      <RegistroView onRegistrado={setUsuario} onIrALogin={() => setPantallaAuth('login')} />
    ) : (
      <LoginView onSesionIniciada={setUsuario} onIrARegistro={() => setPantallaAuth('registro')} />
    );
  }

  // Admin: panel de certificaciones
  if (usuario.rol === 'ADMIN') {
    return <AdminPanelView onCerrarSesion={() => setUsuario(null)} />;
  }

  // Gruero sin certificación aprobada: pantalla de subida de documentos
  if (usuario.rol === 'GRUERO' && usuario.grueroPerfil?.estadoCertificacion !== 'APROBADO') {
    return (
      <CertificacionGrueroView
        usuario={usuario}
        onCertificado={() => setUsuario({ ...usuario, grueroPerfil: { ...usuario.grueroPerfil!, estadoCertificacion: 'APROBADO' } })}
        onCerrarSesion={() => setUsuario(null)}
      />
    );
  }

  // Cliente: la app principal de solicitud (ya conectada al servicio real + Socket.IO)
  // Gruero ya certificado: su dashboard con switch de disponibilidad y mapa
  if (usuario.rol === 'GRUERO') {
    return <GrueroDashboardView usuario={usuario} onCerrarSesion={() => setUsuario(null)} />;
  }
  return <SolicitarGruaView usuario={usuario} onCerrarSesion={() => setUsuario(null)} />;
}
