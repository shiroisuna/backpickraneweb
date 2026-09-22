import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Icono estático de origen y destino
const createPinIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background-color: ${color};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.6);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

// Icono animado de la grúa en movimiento
const createCraneIcon = (rotation: number) => {
  return L.divIcon({
    className: 'crane-live-marker',
    html: `<div style="
      transform: rotate(${rotation}deg);
      transition: all 0.3s linear;
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));
    ">🚚</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const originIcon = createPinIcon('#22c55e');
const destinationIcon = createPinIcon('#ef4444');

// Icono de un gruero cercano seleccionable en el mapa
const crearIconoGruero = (seleccionado: boolean) =>
  L.divIcon({
    className: 'gruero-map-marker',
    html: `<div style="
      background-color: ${seleccionado ? '#FFC107' : '#1f2937'};
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid ${seleccionado ? '#000' : 'white'};
      box-shadow: 0 0 10px rgba(0,0,0,0.6);
    ">🚛</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

export interface GrueroMarcador {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
  tipoGrua: string;
  placa: string;
  fotoUrl?: string | null;
}

// Controlador de cámara para seguir a la grúa en modo Live
function MapController({ 
  cranePos, 
  isLiveTracking, 
  origin, 
  destination 
}: { 
  cranePos: [number, number] | null; 
  isLiveTracking: boolean;
  origin: [number, number]; 
  destination: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (isLiveTracking && cranePos) {
      map.panTo(cranePos, { animate: true, duration: 0.5 });
    } else if (destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      map.setView(origin, 13);
    }
  }, [cranePos, isLiveTracking, origin, destination, map]);

  return null;
}

interface MapProps {
  origin: [number, number];
  destination: [number, number] | null;
  routeCoords: [number, number][];
  cranePos: [number, number] | null;
  craneBearing: number;
  isLiveTracking: boolean;
  onOriginDragEnd: (coords: [number, number]) => void;
  onDestinationDragEnd: (coords: [number, number]) => void;
  /** Grueros cercanos que el cliente puede elegir, mostrados como marcadores clicables. */
  grueros?: GrueroMarcador[];
  grueroSeleccionadoId?: string | null;
  onSeleccionarGruero?: (id: string) => void;
}

export const Map: React.FC<MapProps> = ({ 
  origin, 
  destination, 
  routeCoords, 
  cranePos,
  craneBearing,
  isLiveTracking,
  onOriginDragEnd, 
  onDestinationDragEnd,
  grueros,
  grueroSeleccionadoId,
  onSeleccionarGruero,
}) => {
  const originMarkerRef = useRef<L.Marker>(null);
  const destinationMarkerRef = useRef<L.Marker>(null);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={origin} 
        zoom={14} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController 
          cranePos={cranePos} 
          isLiveTracking={isLiveTracking} 
          origin={origin} 
          destination={destination} 
        />

        {/* Punto de origen / avería */}
        <Marker 
          position={origin} 
          icon={originIcon} 
          draggable={!isLiveTracking}
          eventHandlers={{
            dragend() {
              const marker = originMarkerRef.current;
              if (marker) {
                const latLng = marker.getLatLng();
                onOriginDragEnd([latLng.lat, latLng.lng]);
              }
            }
          }}
          ref={originMarkerRef}
        >
          <Popup><span className="font-bold">Ubicación de la Avería</span></Popup>
        </Marker>

        {/* Punto de destino / taller */}
        {destination && (
          <Marker 
            position={destination} 
            icon={destinationIcon} 
            draggable={!isLiveTracking}
            eventHandlers={{
              dragend() {
                const marker = destinationMarkerRef.current;
                if (marker) {
                  const latLng = marker.getLatLng();
                  onDestinationDragEnd([latLng.lat, latLng.lng]);
                }
              }
            }}
            ref={destinationMarkerRef}
          >
            <Popup><span className="font-bold">Destino / Taller</span></Popup>
          </Marker>
        )}

        {/* Grúa en movimiento en Modo Live */}
        {isLiveTracking && cranePos && (
          <Marker position={cranePos} icon={createCraneIcon(craneBearing)}>
            <Popup><span className="font-bold text-blue-600">Grúa PickCrane en camino</span></Popup>
          </Marker>
        )}

        {/* Grueros cercanos que el cliente puede elegir */}
        {grueros?.map((g) => (
          <Marker
            key={g.id}
            position={[g.lat, g.lng]}
            icon={crearIconoGruero(g.id === grueroSeleccionadoId)}
            eventHandlers={{ click: () => onSeleccionarGruero?.(g.id) }}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                {g.fotoUrl && (
                  <img
                    src={g.fotoUrl}
                    alt={g.tipoGrua}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
                  />
                )}
                <div style={{ fontWeight: 700 }}>{g.nombre}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{g.tipoGrua} · Placa {g.placa}</div>
                {g.id === grueroSeleccionadoId && (
                  <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700, marginTop: 4 }}>✓ Elegido para este servicio</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Línea de ruta trazada */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            pathOptions={{ color: isLiveTracking ? '#22c55e' : '#3b82f6', weight: 6, opacity: 0.8 }} 
          />
        )}
      </MapContainer>
    </div>
  );
};