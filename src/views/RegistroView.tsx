import { useState } from 'react';
import { Truck, User, Wrench, Loader2 } from 'lucide-react';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { registrar } from '../services/auth.service';
import type { Usuario, Coordenadas } from '../types';

interface RegistroViewProps {
  onRegistrado: (usuario: Usuario) => void;
  onIrALogin: () => void;
}

type RolElegido = 'CLIENTE' | 'GRUERO' | null;

const inputClass =
  'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-brand-yellow transition placeholder-gray-500';
const labelClass = 'text-xs font-semibold text-gray-300 mb-1.5 block';

export default function RegistroView({ onRegistrado, onIrALogin }: RegistroViewProps) {
  const [rol, setRol] = useState<RolElegido>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');

  // Campos exclusivos de GRUERO
  const [tipoGrua, setTipoGrua] = useState('');
  const [placa, setPlaca] = useState('');
  const [direccion, setDireccion] = useState('');
  const [coordsDireccion, setCoordsDireccion] = useState<Coordenadas | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rol === 'GRUERO' && !coordsDireccion) {
      setError('Selecciona la dirección de tu base desde el buscador (necesitamos las coordenadas).');
      return;
    }

    setEnviando(true);
    try {
      const { usuario } =
        rol === 'CLIENTE'
          ? await registrar({ rol: 'CLIENTE', nombre, email, password, telefono: telefono || undefined })
          : await registrar({
              rol: 'GRUERO',
              nombre,
              email,
              password,
              telefono: telefono || undefined,
              tipoGrua,
              placa,
              direccion,
              latitud: coordsDireccion![0],
              longitud: coordsDireccion![1],
            });
      onRegistrado(usuario);
    } catch (err) {
      const mensaje =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo completar el registro. Intenta de nuevo.';
      setError(typeof mensaje === 'string' ? mensaje : 'Revisa los datos ingresados.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-brand-gray border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-yellow p-2 rounded-lg text-black font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-brand-yellow">Crear cuenta en PickCrane</h1>
        </div>

        {rol === null ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">¿Cómo quieres usar PickCrane?</p>
            <button
              onClick={() => setRol('CLIENTE')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-brand-yellow bg-gray-800/40 hover:bg-gray-800 transition text-left"
            >
              <User className="w-6 h-6 text-blue-400" />
              <div>
                <p className="font-semibold text-white">Soy usuario</p>
                <p className="text-xs text-gray-400">Quiero solicitar grúas cuando las necesite</p>
              </div>
            </button>
            <button
              onClick={() => setRol('GRUERO')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-brand-yellow bg-gray-800/40 hover:bg-gray-800 transition text-left"
            >
              <Wrench className="w-6 h-6 text-brand-yellow" />
              <div>
                <p className="font-semibold text-white">Soy gruero</p>
                <p className="text-xs text-gray-400">Quiero ofrecer servicios de grúa (requiere certificación)</p>
              </div>
            </button>
            <button onClick={onIrALogin} className="w-full text-center text-xs text-gray-400 hover:text-white pt-2">
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setRol(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ← Cambiar tipo de cuenta ({rol === 'CLIENTE' ? 'Usuario' : 'Gruero'})
            </button>

            <div>
              <label className={labelClass}>Nombre completo</label>
              <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono (opcional)</label>
              <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>

            {rol === 'GRUERO' && (
              <>
                <hr className="border-gray-700" />
                <p className="text-xs text-brand-yellow font-semibold">Datos de tu grúa</p>
                <div>
                  <label className={labelClass}>Tipo de grúa</label>
                  <input
                    className={inputClass}
                    placeholder="Ej: Plataforma, Grúa de arrastre, Canastilla..."
                    value={tipoGrua}
                    onChange={(e) => setTipoGrua(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Placa</label>
                  <input className={inputClass} value={placa} onChange={(e) => setPlaca(e.target.value)} required />
                </div>
                <LocationSearchInput
                  label="Dirección de tu base / taller"
                  placeholder="Busca tu dirección..."
                  iconColor="text-brand-yellow"
                  onSelectLocation={(coords, nombreLugar) => {
                    setCoordsDireccion(coords);
                    setDireccion(nombreLugar);
                  }}
                />
                <p className="text-[11px] text-gray-500">
                  Después de crear tu cuenta te pediremos subir foto de la grúa, licencia, certificado médico y RCV
                  para certificarte.
                </p>
              </>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
