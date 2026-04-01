import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const ensureLeafletStyles = () => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('leaflet-css');
  if (existing) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

const LocationPickerMap = ({ location, onDragEnd }) => {
  useEffect(() => {
    ensureLeafletStyles();
  }, []);

  const markerIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }),
    []
  );

  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={16}
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[location.latitude, location.longitude]}
        draggable
        icon={markerIcon}
        eventHandlers={{
          dragend: (event) => {
            const latLng = event.target.getLatLng();
            onDragEnd({ latitude: latLng.lat, longitude: latLng.lng });
          },
        }}
      />
    </MapContainer>
  );
};

export default LocationPickerMap;
