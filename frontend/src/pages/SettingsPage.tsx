import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Slider } from '../components/ui/Slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { API_BASE_URL } from '../utils/constants';
import { apiClient } from '../api/client';
import { DatasetUploadModal } from '../components/upload/DatasetUploadModal';
import {
  Settings,
  Upload,
  Database,
  Server,
  RefreshCw,
  CheckCircle,
  Sliders,
  FileCheck,
  Cpu,
  Download,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC<{ simulation: ReturnType<typeof useSimulation> }> = ({
  simulation,
}) => {
  const [site, setSite] = useState('caltech-jpl');
  const [fairnessMode, setFairnessMode] = useState(true);
  const [solverTimeout, setSolverTimeout] = useState([50]);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const activeDs = simulation.datasetInfo;
  const isCustom = activeDs?.is_custom ?? false;
  const dsName = activeDs?.metadata?.name || 'Caltech-JPL Research Facility Benchmark';
  const sessionCount = activeDs?.session_count ?? simulation.allSessions.length;
  const totalKwh = activeDs?.total_requested_kwh ?? 540.2;

  const handleResetDemo = () => {
    simulation.reset();
    simulation.setSiteCapKw(45);
    setNotificationStatus('System parameters restored to Caltech-JPL Hackathon Demo Defaults!');
    setTimeout(() => setNotificationStatus(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="pb-2 border-b border-[#253441]/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#20E3FF] bg-[#20E3FF]/10 px-2 py-0.5 rounded border border-[#20E3FF]/20">
            SYSTEM ARCHITECTURE & PROVENANCE
          </span>
          <span className="text-[10px] text-[#91A5B3] font-mono">CALTECH RES-FACILITY</span>
        </div>
        <h2 className="text-xl font-bold text-[#EAF5FA] tracking-wide flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-[#20E3FF]" />
          Configuration & Telematic Provenance
        </h2>
        <p className="text-xs text-[#91A5B3] mt-0.5">
          Configure transformer physical parameters, simulation datasets, solver preferences, and live backend connection.
        </p>
      </div>

      {notificationStatus && (
        <div className="p-3.5 rounded-xl bg-[#00D6B3]/10 border border-[#00D6B3]/40 text-[#00D6B3] text-xs flex items-center gap-2 font-mono">
          <CheckCircle className="w-4 h-4 text-[#00D6B3] shrink-0" />
          <span>{notificationStatus}</span>
        </div>
      )}

      {/* Grid: Dataset Configuration & Hardware Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dataset & Site Selector */}
        <Card className="border-[#253441] bg-[#111A22]">
          <CardHeader className="pb-3 border-b border-[#253441]/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#20E3FF]" />
                Dataset Provenance & Ingestion
              </CardTitle>
              <Badge variant={isCustom ? 'success' : 'info'} dot className="text-[10px] font-mono">
                {isCustom ? 'CUSTOM FLEET' : 'BENCHMARK'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs pt-4">
            {/* Active Dataset Provenance Pill */}
            <div className="p-3.5 rounded-xl bg-[#080D12] border border-[#253441] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#91A5B3]">
                  Active Fleet Trace:
                </span>
                <span className="font-mono font-bold text-[#20E3FF] truncate max-w-[220px]">
                  {dsName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#253441]/60 font-mono text-[11px]">
                <div>
                  <span className="text-[#91A5B3]">Sessions: </span>
                  <span className="text-[#7CFF6B] font-bold">{sessionCount} EVs</span>
                </div>
                <div>
                  <span className="text-[#91A5B3]">Total Energy: </span>
                  <span className="text-[#EAF5FA] font-bold">{totalKwh.toFixed(1)} kWh</span>
                </div>
              </div>
            </div>

            {/* Upload Action Button / Trigger */}
            <div
              onClick={() => setIsUploadModalOpen(true)}
              className="border-2 border-dashed border-[#253441] hover:border-[#20E3FF]/60 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#080D12]/60 hover:bg-[#080D12] group"
            >
              <Upload className="w-6 h-6 text-[#91A5B3] group-hover:text-[#20E3FF] mx-auto mb-1.5 transition-colors" />
              <p className="text-[11px] text-[#EAF5FA] font-medium group-hover:text-[#20E3FF] transition-colors">
                Upload & Ingest Custom Dataset (.csv)
              </p>
              <p className="text-[10px] text-[#91A5B3] mt-0.5 font-mono">
                Automatic column matching, schema mapping, and transactional preview
              </p>
            </div>

            {/* Action buttons: Download sample & Reset benchmark */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => apiClient.downloadSampleCsv()}
                className="flex-1 gap-1.5 h-8 text-[11px] font-mono border-[#253441] text-[#20E3FF] hover:bg-[#20E3FF]/10"
              >
                <Download className="w-3.5 h-3.5" />
                Sample CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await simulation.resetToBenchmark();
                  setNotificationStatus('Reset to Caltech-JPL Benchmark Dataset (51 sessions).');
                  setTimeout(() => setNotificationStatus(null), 4000);
                }}
                className="flex-1 gap-1.5 h-8 text-[11px] font-mono border-[#253441] text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#162330]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Benchmark
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transformer & Electrical Limits */}
        <Card className="border-[#253441] bg-[#111A22]">
          <CardHeader className="pb-3 border-b border-[#253441]/60">
            <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#20E3FF]" />
              Electrical Substation Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[#91A5B3] font-mono uppercase text-[10px] tracking-wider">Transformer Cap Limit</label>
                <span className="font-mono text-[#20E3FF] font-bold text-sm">{simulation.siteCapKw} kW</span>
              </div>
              <Slider
                value={[simulation.siteCapKw]}
                min={10}
                max={120}
                step={5}
                onValueChange={(val) => simulation.setSiteCapKw(val[0])}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#91A5B3]">
                <span>10 kW (Stress)</span>
                <span className="text-[#20E3FF]">45 kW (Default)</span>
                <span>120 kW (Unconstrained)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#253441]/60">
              <div>
                <span className="text-[#EAF5FA] font-medium block">Proportional Alpha-Fairness</span>
                <span className="text-[10px] text-[#91A5B3]">Prevent starvation of low-urgency commuter vehicles</span>
              </div>
              <Switch checked={fairnessMode} onCheckedChange={setFairnessMode} />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#253441]/60">
              <div className="flex justify-between items-center">
                <label className="text-[#91A5B3] font-mono uppercase text-[10px] tracking-wider">Solver Time Budget</label>
                <span className="font-mono text-[#20E3FF] font-bold">{solverTimeout[0]} ms</span>
              </div>
              <Slider
                value={solverTimeout}
                min={10}
                max={200}
                step={10}
                onValueChange={setSolverTimeout}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backend API Connection & Diagnostics */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#20E3FF]" />
            Backend API Configuration & Standalone Telemetry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#080D12] border border-[#253441]">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-bold text-[#EAF5FA]">FastAPI Backend Endpoint:</span>
                <span className="text-[#20E3FF]">{API_BASE_URL}</span>
              </div>
              <p className="text-[11px] text-[#91A5B3] mt-1">
                ChargeWise EV OS includes zero-dependency deterministic simulation fallback for resilient offline hackathon operation.
              </p>
            </div>

            <Badge variant="success" dot className="font-mono text-[10px]">
              SIMULATION ENGINE ONLINE
            </Badge>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              className="gap-2 border-[#253441] text-[#EAF5FA] hover:bg-[#162330] font-mono text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#20E3FF]" />
              Reset All to Demo Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Dataset Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        simulation={simulation}
        onSuccess={(name) => {
          setNotificationStatus(`Dataset "${name}" successfully loaded into active simulation.`);
          setTimeout(() => setNotificationStatus(null), 5000);
        }}
      />
    </div>
  );
};

