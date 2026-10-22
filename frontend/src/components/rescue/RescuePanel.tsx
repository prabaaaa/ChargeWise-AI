import React, { useState, useEffect } from 'react';
import { RescueStation, ActiveSession, ChargingSession } from '../../api/types';
import { StationCard } from './StationCard';
import { RescueMap } from './RescueMap';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { LifeBuoy, AlertTriangle, ShieldCheck, MapPin, Zap, Compass, Radio } from 'lucide-react';
import { apiClient } from '../../api/client';
import { formatEnergy } from '../../utils/formatting';

export interface RescuePanelProps {
  sessions: ChargingSession[];
  activeSessions: ActiveSession[];
  initialSelectedSessionId?: string | null;
  className?: string;
}

export const RescuePanel: React.FC<RescuePanelProps> = ({
  sessions,
  activeSessions,
  initialSelectedSessionId,
  className,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSelectedSessionId || sessions[0]?.session_id || 'cs-101'
  );
  const [stations, setStations] = useState<RescueStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSelectedSessionId) {
      setSelectedSessionId(initialSelectedSessionId);
    }
  }, [initialSelectedSessionId]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    apiClient.getRescueStations(selectedSessionId).then((res) => {
      if (isMounted) {
        setStations(res);
        if (res.length > 0 && !selectedStationId) {
          setSelectedStationId(res[0].station_id);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  const currentSessionMeta = sessions.find((s) => s.session_id === selectedSessionId);
  const currentActive = activeSessions.find((s) => s.session_id === selectedSessionId);

  const reqEnergy = currentSessionMeta?.requested_energy_kwh ?? 25;
  const delEnergy = currentActive?.energy_delivered_kwh ?? 12;
  const shortfall = Math.max(0, reqEnergy - delEnergy);
  const estimatedSoc = currentActive?.initial_soc_percent ?? 25;

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Top Banner / Session Selector */}
      <Card className="p-5 border-[#253441] bg-[#111A22]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#20E3FF]/10 border border-[#20E3FF]/30 text-[#20E3FF]">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#20E3FF] bg-[#20E3FF]/10 px-2 py-0.5 rounded border border-[#20E3FF]/20">
                  OFF-SITE DISPATCH TELEMATICS
                </span>
                <span className="text-[10px] text-[#91A5B3] font-mono">OCM DIRECT FEED</span>
              </div>
              <h3 className="text-lg font-bold text-[#EAF5FA] tracking-wide flex items-center gap-2.5">
                Charging Rescue Network
                <Badge variant="info">Smart Off-site Dispatch</Badge>
              </h3>
              <p className="text-xs text-[#91A5B3] mt-0.5">
                Automatically resolves site capacity shortfalls by guiding vehicles to nearby high-power DC fast hubs.
              </p>
            </div>
          </div>

          {/* EV Session Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#91A5B3] font-mono">SELECT VEHICLE:</span>
            <div className="w-64">
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-[#080D12] border-[#253441] text-[#EAF5FA] font-mono text-xs">
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent className="bg-[#111A22] border-[#253441] text-[#EAF5FA]">
                  {sessions.map((s) => (
                    <SelectItem key={s.session_id} value={s.session_id}>
                      {s.charger_id} ({s.session_id}) — {s.requested_energy_kwh} kWh
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Selected Vehicle Status Alert */}
        <div className="mt-4 pt-4 border-t border-[#253441]/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Target Shortfall</span>
            <div className="font-mono text-base font-bold text-[#F59E0B] mt-0.5">
              {shortfall > 0 ? formatEnergy(shortfall) : '0.0 kWh (Fully Met)'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Connector Standard</span>
            <div className="font-mono text-base font-bold text-[#20E3FF] mt-0.5">
              {currentSessionMeta?.connector_type || 'CCS / NACS (J3400)'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Battery Level (SOC)</span>
            <div className="font-mono text-base font-bold text-[#EAF5FA] mt-0.5">
              {estimatedSoc}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Reachability Status</span>
            <div className="font-mono text-base font-bold text-[#7CFF6B] mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7CFF6B]" />
              Reachable (4.2x Reserve)
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Interactive Map + Recommended Station Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#91A5B3] pb-1">
            <span className="font-mono text-[#EAF5FA] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#20E3FF]" />
              Regional DC Fast Charging Hubs (5 km Radius)
            </span>
            <span className="font-mono text-[#20E3FF]">{stations.length} locations active</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-[#253441]">
            <RescueMap
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStation={setSelectedStationId}
              className="h-[480px] w-full"
            />
          </div>
        </div>

        {/* Right: Station Recommendations List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs text-[#91A5B3] font-mono pb-1">
            RECOMMENDED FAST CHARGERS RANKED BY DISTANCE & POWER:
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {stations.map((st) => (
              <StationCard
                key={st.station_id}
                station={st}
                isSelected={selectedStationId === st.station_id}
                onSelect={() => setSelectedStationId(st.station_id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

