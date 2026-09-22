import { Truck } from 'lucide-react';
import { urlArchivo } from '../utils/archivos';
import type { GrueroActivo } from '../types';

interface GrueroCercanoCardProps {
  gruero: GrueroActivo;
  distanciaKm: number;
  seleccionado: boolean;
  onSeleccionar: () => void;
}

export function GrueroCercanoCard({ gruero, distanciaKm, seleccionado, onSeleccionar }: GrueroCercanoCardProps) {
  const foto = gruero.documentos?.[0]?.archivoUrl;

  return (
    <button
      onClick={onSeleccionar}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
        seleccionado ? 'border-brand-yellow bg-yellow-950/20' : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
      }`}
    >
      {foto ? (
        <img src={urlArchivo(foto)} alt={gruero.tipoGrua} className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
          <Truck className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{gruero.usuario.nombre}</p>
        <p className="text-xs text-gray-400 truncate">{gruero.tipoGrua} · Placa {gruero.placa}</p>
        <p className="text-xs text-brand-yellow font-medium">{distanciaKm.toFixed(1)} km de distancia</p>
      </div>
    </button>
  );
}
