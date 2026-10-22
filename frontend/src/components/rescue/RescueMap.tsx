import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { RescueStation } from '../../api/types';
import { Zap, Navigation } from 'lucide-react';

export interface RescueMapProps {
  stations: RescueStation[];
  selectedStationId?: string | null;
  onSelectStation?: (stationId: string) => void;
  siteLat?: number;
  siteLng?: number;
  className?: string;
}

export const RescueMap: React.FC<RescueMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  siteLat = 34.1377, // Caltech coordinates
  siteLng = -118.1253,
  className = 'h-[400px] w-full',
}) => {
  // Custom Leaflet DivIcons to prevent 404 image asset issues
  const siteIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-site-marker',
      html: `
        <div style="background-color: #20E3FF; border: 2px solid #EAF5FA; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(32,227,255,0.85);">
          <div style="background-color: #080D12; width: 10px; height: 10px; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }, []);

  const createStationIcon = (isFast: boolean, isSelected: boolean) => {
    const bgColor = isSelected ? '#20E3FF' : isFast ? '#00D6B3' : '#F59E0B';
    const border = isSelected ? '3px solid #EAF5FA' : '2px solid #080D12';
    return L.divIcon({
      className: 'custom-station-marker',
      html: `
        <div style="background-color: ${bgColor}; border: ${border}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6); font-size: 11px; font-weight: bold; color: #080D12;">
          ⚡
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className={`rounded-xl overflow-hidden border border-[#253441] shadow-xl relative ${className}`}>
      <MapContainer
        center={[siteLat, siteLng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        {/* CartoDB Dark Matter tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 5km Radius Circle */}
        <Circle
          center={[siteLat, siteLng]}
          radius={5000}
          pathOptions={{
            color: '#20E3FF',
            fillColor: '#20E3FF',
            fillOpacity: 0.05,
            weight: 1,
            dashArray: '4, 4',
          }}
        />

        {/* Current Site Marker */}
        <Marker position={[siteLat, siteLng]} icon={siteIcon}>
          <Popup className="dark-popup">
            <div className="p-1 text-navy-900 font-sans">
              <h5 className="font-bold text-xs">Current Facility</h5>
              <p className="text-[11px] text-gray-700">Caltech-JPL Main Lot</p>
            </div>
          </Popup>
        </Marker>

        {/* Rescue Station Markers */}
        {stations.map((st) => {
          const isSelected = selectedStationId === st.station_id;
          const isFast = st.max_power_kw >= 150;
          return (
            <Marker
              key={st.station_id}
              position={[st.latitude, st.longitude]}
              icon={createStationIcon(isFast, isSelected)}
              eventHandlers={{
                click: () => onSelectStation?.(st.station_id),
              }}
            >
              <Popup>
                <div className="p-1 text-navy-900 font-sans">
                  <h5 className="font-bold text-xs">{st.name}</h5>
                  <p className="text-[11px] font-semibold text-teal-700">
                    {st.max_power_kw} kW • {st.distance_km} km ({st.driving_time_minutes} min)
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">{st.availability}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
