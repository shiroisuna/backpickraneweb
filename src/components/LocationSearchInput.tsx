import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapPin, Loader2, Search } from 'lucide-react';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchInputProps {
  label: string;
  placeholder: string;
  iconColor: string;
  initialValue?: string;
  onSelectLocation: (coords: [number, number], displayName: string) => void;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  label,
  placeholder,
  iconColor,
  initialValue = '',
  onSelectLocation,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar lista desplegable al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce para consultar Nominatim mientras el usuario escribe
  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Se prioriza la búsqueda en Venezuela
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: query,
            format: 'json',
            countrycodes: 've',
            addressdetails: 1,
            limit: 5,
          },
        });
        setSuggestions(response.data);
        setIsOpen(true);
      } catch (error) {
        console.error('Error buscando ubicación:', error);
      } finally {
        setIsLoading(false);
      }
    }, 400); // 400ms de retraso para evitar peticiones excesivas

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: Suggestion) => {
    const coords: [number, number] = [parseFloat(item.lat), parseFloat(item.lon)];
    setQuery(item.display_name);
    setIsOpen(false);
    onSelectLocation(coords, item.display_name);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className={`text-xs font-semibold ${iconColor} flex items-center gap-1.5 mb-1.5`}>
        <MapPin className="w-4 h-4" /> {label}
      </label>

      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 pl-9 pr-8 focus:outline-none focus:border-brand-yellow transition placeholder-gray-500"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-brand-yellow animate-spin absolute right-3" />
        )}
      </div>

      {/* Menú flotante con las sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto text-xs divide-y divide-gray-800">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSelect(item)}
              className="p-3 hover:bg-gray-800 cursor-pointer text-gray-300 hover:text-white transition flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};