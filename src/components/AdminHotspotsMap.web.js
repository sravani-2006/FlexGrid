import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

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

const getColor = (severity) => {
  if (severity === 'critical') return '#DC2626';
  if (severity === 'medium') return '#A16207';
  return '#4F5D33';
};

const AdminHotspotsMap = ({ issues, selectedIssueId, onMarkerPress }) => {
  useEffect(() => {
    ensureLeafletStyles();
  }, []);

  return (
    <MapContainer
      center={[12.9716, 77.5946]}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {(issues || []).map((issue) => (
        <CircleMarker
          key={issue.id}
          center={[issue.location.latitude, issue.location.longitude]}
          pathOptions={{
            color: selectedIssueId === issue.id ? '#1F1F1D' : '#FFFFFF',
            weight: selectedIssueId === issue.id ? 3 : 2,
            fillColor: getColor(issue.severity),
            fillOpacity: 1,
          }}
          radius={selectedIssueId === issue.id ? 11 : 8}
          eventHandlers={{
            click: () => onMarkerPress && onMarkerPress(issue),
          }}
        >
          <Popup>
            <strong>{issue.title}</strong>
            <br />
            Severity: {issue.severity}
            <br />
            Status: {issue.status}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default AdminHotspotsMap;
