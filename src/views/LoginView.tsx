import { useState } from 'react';
import { Truck, Loader2 } from 'lucide-react';
import { iniciarSesion } from '../services/auth.service';
import type { Usuario } from '../types';

interface LoginViewProps {
  onSesionIniciada: (usuario: Usuario) => void;
  onIrARegistro: () => void;
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-brand-yellow transition placeholder-gray-500';
const labelClass = 'text-xs font-semibold text-gray-300 mb-1.5 block';

export default function LoginView({ onSesionIniciada, onIrARegistro }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { usuario } = await iniciarSesion(email, password);
      onSesionIniciada(usuario);
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-brand-gray border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-yellow p-2 rounded-lg text-black font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-brand-yellow">Iniciar sesión</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3 px-4 bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>

          <button type="button" onClick={onIrARegistro} className="w-full text-center text-xs text-gray-400 hover:text-white">
            ¿No tienes cuenta? Regístrate
          </button>
        </form>
      </div>
    </div>
  );
}
