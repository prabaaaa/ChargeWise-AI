import React from 'react';
import { ActiveSession } from '../../api/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { formatTime, formatEnergy, formatPower } from '../../utils/formatting';
import {
  Car,
  Clock,
  Zap,
  BatteryCharging,
  AlertTriangle,
  LifeBuoy,
  TimerReset,
  ShieldAlert,
  PowerOff,
  Play,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export interface VehicleDetailProps {
  session?: ActiveSession | null;
  onEmergencyToggle?: (sessionId: string) => void;
  onLeavingSoonToggle?: (sessionId: string) => void;
  onOpenRescue?: (sessionId: string) => void;
  onStopCharging?: (sessionId: string) => void;
  onStartCharging?: (sessionId: string) => void;
  className?: string;
}

export const VehicleDetail: React.FC<VehicleDetailProps> = ({
  session,
  onEmergencyToggle,
  onLeavingSoonToggle,
  onOpenRescue,
  onStopCharging,
  onStartCharging,
  className,
}) => {
  if (!session) {
    return (
      <Card className={className}>
        <div className="flex flex-col items-center justify-center p-8 text-center text-[#91a5b3] space-y-2.5">
          <div className="p-3 rounded-2xl bg-[#172330] border border-[#253441] text-[#91a5b3]">
            <Car className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-bold text-[#eaf5fa]">No Bay Selected</h4>
          <p className="text-xs text-[#91a5b3] max-w-xs leading-relaxed">
            Click on any charging bay or vehicle in the digital twin to inspect real-time SOC, delivered kWh, and override controls.
          </p>
        </div>
      </Card>
    );
  }

  const reqEnergy = session.energy_requested_kwh || 25;
  const delEnergy = session.energy_delivered_kwh || 0;
  const energyPercent = Math.min(100, Math.round((delEnergy / reqEnergy) * 100));

  const initialSoc = session.initial_soc_percent ?? 25;
  const batteryCap = session.battery_capacity_kwh ?? 70;
  const estimatedSoc = Math.min(100, Math.round(initialSoc + (delEnergy / batteryCap) * 100));

  const isEmergency = session.is_emergency;
  const isAtRisk = session.feasibility_status === 'at_risk' || session.feasibility_status === 'infeasible';

  return (
    <Card className={className} variant={isEmergency ? 'danger' : 'glow'}>
      <CardHeader className="pb-3 border-b border-[#253441]/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#20e3ff]/10 border border-[#20e3ff]/30 text-[#20e3ff]">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-[#eaf5fa]">
                {session.charger_id}
                <span className="text-xs font-mono font-normal text-[#91a5b3] ml-2">
                  ({session.session_id})
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={session.feasibility_status === 'feasible' ? 'success' : 'warning'} dot>
                  {session.feasibility_status.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-[10px] text-[#91a5b3] font-mono bg-[#080d12] px-2 py-0.5 rounded border border-[#253441]">
                  {session.departure_source}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#91a5b3] font-mono block">URGENCY PRIORITY</span>
            <div className="text-lg font-mono font-extrabold text-[#20e3ff]">
              {session.priority_score ?? 50}/100
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* State of Charge (SOC) */}
        <div className="space-y-1.5 p-3 rounded-xl bg-[#080d12] border border-[#253441]">
          <div className="flex justify-between text-xs">
            <span className="text-[#91a5b3] flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-[#20e3ff]" />
              Battery Level (SOC)
            </span>
            <span className="font-mono font-bold text-[#eaf5fa]">{estimatedSoc}%</span>
          </div>
          <Progress value={estimatedSoc} className="bg-[#172330] h-2" indicatorClassName="bg-[#20e3ff]" />
          <div className="flex justify-between text-[10px] text-[#91a5b3] font-mono pt-0.5">
            <span>Arrival: {initialSoc}%</span>
            <span>Pack: {batteryCap} kWh</span>
            <span className="text-[#00d6b3]">Target: 80%+</span>
          </div>
        </div>

        {/* Energy delivery numbers */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
            <span className="text-[10px] text-[#91a5b3] font-mono block">Energy Delivered</span>
            <div className="font-mono text-base font-extrabold text-[#7cff6b] mt-0.5">
              {formatEnergy(delEnergy)}
            </div>
            <span className="text-[10px] text-[#91a5b3]">Target: {formatEnergy(reqEnergy)} ({energyPercent}%)</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
            <span className="text-[10px] text-[#91a5b3] font-mono block">Allocated Power</span>
            <div className="font-mono text-base font-extrabold text-[#20e3ff] mt-0.5">
              {formatPower(session.allocated_power_kw)}
            </div>
            <span className="text-[10px] text-[#91a5b3]">Active draw</span>
          </div>
        </div>

        {/* Automatic Cutoff Status Banner */}
        {session.cutoff_status === 'TARGET REACHED' && (
          <div className="p-3 rounded-xl bg-[#022c22]/60 border border-[#7cff6b]/40 flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-[#7cff6b] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-[#7cff6b]">Automatic Cutoff: Target Reached</span>
              <p className="text-[11px] text-[#91a5b3] leading-relaxed">
                Vehicle achieved target energy ({formatEnergy(session.energy_delivered_kwh)}). Power output set to 0.0 kW; capacity returned to grid pool.
              </p>
            </div>
          </div>
        )}

        {(session.is_manually_stopped || session.cutoff_status === 'AUTO CUTOFF') && (
          <div className="p-3 rounded-xl bg-[#451a03]/60 border border-[#f59e0b]/40 flex items-start gap-2.5 shadow-sm">
            <PowerOff className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-[#f59e0b]">Charging Cutoff: Manual Operator Stop</span>
              <p className="text-[11px] text-[#91a5b3] leading-relaxed">
                Operator manually stopped charging for this bay. Power allocation clamped at 0.0 kW. Click Start to resume.
              </p>
            </div>
          </div>
        )}

        {/* Timings */}
        <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441] flex justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-[#91a5b3] block font-sans">Arrival</span>
            <span className="text-[#eaf5fa]">{formatTime(session.arrival_time)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#91a5b3] block font-sans">Deadline Departure</span>
            <span className="text-[#20e3ff] font-bold">{formatTime(session.departure_time)}</span>
          </div>
        </div>

        {/* Operator Interactive Actions */}
        <div className="space-y-2 pt-2 border-t border-[#253441]">
          {/* Manual Cutoff Override: Start / Stop Charging */}
          <Button
            variant={session.is_manually_stopped ? 'primary' : 'danger'}
            size="sm"
            onClick={() => session.is_manually_stopped
              ? onStartCharging?.(session.session_id)
              : onStopCharging?.(session.session_id)
            }
            className="w-full text-xs gap-1.5 font-bold"
          >
            {session.is_manually_stopped ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Charging
              </>
            ) : (
              <>
                <PowerOff className="w-3.5 h-3.5" />
                Stop Charging (Manual Cutoff)
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isEmergency ? 'danger' : 'outline'}
              size="sm"
              onClick={() => onEmergencyToggle?.(session.session_id)}
              className="text-xs gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {isEmergency ? 'Cancel Priority' : 'Emergency Priority'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onLeavingSoonToggle?.(session.session_id)}
              className="text-xs gap-1.5"
            >
              <TimerReset className="w-3.5 h-3.5" />
              Leaving Soon
            </Button>
          </div>

          {isAtRisk && (
            <Button
              variant="tealOutline"
              size="sm"
              onClick={() => onOpenRescue?.(session.session_id)}
              className="w-full text-xs gap-1.5 font-bold"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Find DC Fast Charging Rescue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
