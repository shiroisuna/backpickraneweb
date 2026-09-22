import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Coordenadas, Servicio } from '../types';

const iconoGruero = L.divIcon({
  className: 'crane-own-marker',
  html: `<div style="font-size:28px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">🚚</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function crearIconoSolicitud(seleccionado: boolean) {
  return L.divIcon({
    className: 'solicitud-marker',
    html: `<div style="
      background-color: ${seleccionado ? '#FFC107' : '#ef4444'};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.6);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Centra el mapa en la posición del gruero la primera vez que se conoce (o si cambia mucho). */
function Centrador({ centro }: { centro: Coordenadas }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, Math.max(map.getZoom(), 13));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro[0], centro[1]]);
  return null;
}

interface MapaGrueroProps {
  posicionGruero: Coordenadas | null;
  servicios: Servicio[];
  servicioSeleccionadoId: string | null;
  onSeleccionarServicio: (servicio: Servicio) => void;
}

export function MapaGruero({
  posicionGruero,
  servicios,
  servicioSeleccionadoId,
  onSeleccionarServicio,
}: MapaGrueroProps) {
  const centro: Coordenadas = posicionGruero || [10.4806, -66.9036]; // Caracas como fallback

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={centro} zoom={13} scrollWheelZoom className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {posicionGruero && <Centrador centro={posicionGruero} />}

        {posicionGruero && (
          <Marker position={posicionGruero} icon={iconoGruero}>
            <Popup>
              <span className="font-bold">Tu ubicación</span>
            </Popup>
          </Marker>
        )}

        {servicios.map((s) => (
          <Marker
            key={s.id}
            position={[s.origenLat, s.origenLng]}
            icon={crearIconoSolicitud(s.id === servicioSeleccionadoId)}
            eventHandlers={{ click: () => onSeleccionarServicio(s) }}
          >
            <Popup>
              <span className="font-semibold">{s.origenDireccion}</span>
              <br />→ {s.destinoDireccion}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
