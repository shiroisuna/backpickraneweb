import { useState } from 'react';
import { CheckCircle2, UploadCloud, Loader2 } from 'lucide-react';

interface DocumentoUploadCardProps {
  titulo: string;
  descripcion: string;
  yaSubido: boolean;
  onSubir: (archivo: File) => Promise<void>;
}

export function DocumentoUploadCard({ titulo, descripcion, yaSubido, onSubir }: DocumentoUploadCardProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      await onSubir(archivo);
    } catch {
      setError('No se pudo subir. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${
        yaSubido ? 'border-green-700 bg-green-950/20' : 'border-gray-700 bg-gray-800/40'
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-xs text-gray-400">{descripcion}</p>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {yaSubido ? (
        <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold shrink-0">
          <CheckCircle2 className="w-4 h-4" /> Subido
        </div>
      ) : (
        <label className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-black bg-brand-yellow hover:bg-yellow-500 px-3 py-2 rounded-lg cursor-pointer transition">
          {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Subir
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} disabled={subiendo} />
        </label>
      )}
    </div>
  );
}
