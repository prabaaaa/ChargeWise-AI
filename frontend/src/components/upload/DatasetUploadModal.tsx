import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Table,
  Zap,
  Clock,
  Car,
  Layers,
  Sparkles,
  ArrowRight,
  X,
  FileCheck2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient } from '../../api/client';
import { UploadPreviewResponse, DatasetValidationIssue } from '../../api/types';
import { useSimulation } from '../../hooks/useSimulation';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: ReturnType<typeof useSimulation>;
  onSuccess?: (datasetName: string) => void;
}

const CANONICAL_FIELD_LABELS: Record<string, { label: string; required: boolean; desc: string }> = {
  arrival_time: { label: 'Arrival / Plug-in Time', required: true, desc: 'ISO, RFC3339, or YYYY-MM-DD HH:MM' },
  departure_time: { label: 'Departure Deadline', required: true, desc: 'Must be after arrival time' },
  session_id: { label: 'Session / Vehicle ID', required: false, desc: 'Unique identifier for the session' },
  requested_energy_kwh: { label: 'Requested Energy (kWh)', required: false, desc: 'Target energy requirement' },
  battery_capacity_kwh: { label: 'Battery Capacity (kWh)', required: false, desc: 'Vehicle battery pack size' },
  initial_soc_percent: { label: 'Initial SOC (%)', required: false, desc: 'State of charge on arrival (0-100)' },
  target_soc_percent: { label: 'Target SOC (%)', required: false, desc: 'Desired state of charge (0-100)' },
  charger_id: { label: 'Charger Bay ID', required: false, desc: 'CP-01 to CP-20, or auto-allocated' },
  charger_max_power_kw: { label: 'Max Charger Power (kW)', required: false, desc: 'Default 6.6 kW Level 2' },
  connector_type: { label: 'Connector Standard', required: false, desc: 'J1772, CCS, NACS, etc.' },
};

export const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  simulation,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [previewData, setPreviewData] = useState<UploadPreviewResponse | null>(null);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [customDatasetName, setCustomDatasetName] = useState('');
  const [showMappingDrawer, setShowMappingDrawer] = useState(false);
  const [previewTab, setPreviewTab] = useState<'normalized' | 'raw'>('normalized');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'success'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAbortControllerRef = useRef<AbortController | null>(null);
  const activeFileRef = useRef<string | null>(null);

  // Clean up any pending upload on unmount
  React.useEffect(() => {
    return () => {
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCancelValidation = () => {
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }
    setIsValidating(false);
    setErrorMessage('Upload was cancelled.');
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setErrorMessage('Unsupported file format: Please select a CSV file (.csv) or text delimiter file (.txt).');
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewData(null);
    setCustomMapping({});
    setCustomDatasetName(file.name.replace(/\.[^/.]+$/, ''));
    runValidation(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const runValidation = async (file: File, updatedMapping?: Record<string, string>) => {
    // Abort any existing in-flight request before launching new validation
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }

    const controller = new AbortController();
    currentAbortControllerRef.current = controller;
    activeFileRef.current = file.name;

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const mappingToSend = updatedMapping !== undefined ? updatedMapping : customMapping;
      const res = await apiClient.uploadDatasetPreview(file, mappingToSend, controller.signal);

      // Ensure response matches the active file
      if (activeFileRef.current !== file.name) return;

      setPreviewData(res);
      setCustomMapping(res.suggested_mapping || {});
      setActiveStep('preview');
    } catch (err: any) {
      if (controller.signal.aborted) {
        setErrorMessage('Upload request was cancelled.');
        return;
      }
      const rawMsg = String(err?.message || '');
      let friendlyMsg = rawMsg;
      if (rawMsg.includes('aborted') || rawMsg.includes('AbortError')) {
        friendlyMsg = 'Upload was interrupted or cancelled. Please try again.';
      } else if (rawMsg.includes('timed out') || rawMsg.includes('Timeout')) {
        friendlyMsg = 'Upload request timed out after 60 seconds. The file may be large or server is busy.';
      } else if (rawMsg.includes('Network') || rawMsg.includes('Failed to fetch')) {
        friendlyMsg = 'Network connection failed: Unable to reach ChargeWise AI backend at http://localhost:8000.';
      }
      setErrorMessage(friendlyMsg);
    } finally {
      if (activeFileRef.current === file.name) {
        setIsValidating(false);
        currentAbortControllerRef.current = null;
      }
    }
  };

  const handleMappingChange = (canonField: string, rawColumn: string) => {
    const updated = { ...customMapping };
    if (!rawColumn) {
      delete updated[canonField];
    } else {
      updated[canonField] = rawColumn;
    }
    setCustomMapping(updated);
    if (selectedFile) {
      runValidation(selectedFile, updated);
    }
  };

  const handleActivateDataset = async () => {
    if (!previewData || !previewData.upload_id) return;
    setIsActivating(true);
    setErrorMessage(null);
    try {
      const name = customDatasetName.trim() || selectedFile?.name || 'Custom Fleet Dataset';
      await simulation.activateDataset({
        upload_id: previewData.upload_id,
        custom_mapping: customMapping,
        dataset_name: name,
        site_cap_kw: simulation.siteCapKw,
      });
      setActiveStep('success');
      if (onSuccess) {
        onSuccess(name);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to activate dataset.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      await apiClient.downloadSampleCsv();
    } catch (err) {
      console.error('Download sample CSV error:', err);
    }
  };

  const handleResetToBenchmark = async () => {
    setIsActivating(true);
    setErrorMessage(null);
    try {
      await simulation.resetToBenchmark();
      setActiveStep('success');
      if (onSuccess) {
        onSuccess('Caltech-JPL Research Facility Benchmark');
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset to benchmark.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D12]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111A22] border border-[#253441] rounded-2xl shadow-2xl text-[#EAF5FA] flex flex-col">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#111A22]/95 border-b border-[#253441]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20E3FF]/10 border border-[#20E3FF]/30 flex items-center justify-center text-[#20E3FF]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-wide text-[#EAF5FA]">
                  EV Charging Dataset Pipeline
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#20E3FF]/15 text-[#20E3FF] border border-[#20E3FF]/30">
                  Transactional Ingestion
                </span>
              </div>
              <p className="text-xs text-[#91A5B3]">
                Upload custom workplace session traces, map telematic schema, and activate live simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#162330] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick Benchmark & Sample Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#080D12] border border-[#253441]/70">
            <div className="flex items-center gap-2 text-xs text-[#91A5B3]">
              <FileCheck2 className="w-4 h-4 text-[#7CFF6B]" />
              <span>Need a compatible test template or want to restore default data?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="gap-1.5 h-8 text-xs font-mono border-[#253441] text-[#20E3FF] hover:bg-[#20E3FF]/10"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToBenchmark}
                disabled={isActivating}
                className="gap-1.5 h-8 text-xs font-mono border-[#253441] text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#162330]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Caltech Benchmark
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] text-xs flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Validation Warning</p>
                  <p className="text-[#FCA5A5] mt-0.5">{errorMessage}</p>
                </div>
              </div>
              {selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runValidation(selectedFile)}
                  className="h-7 px-3 text-xs font-mono border-[#EF4444]/40 text-[#FCA5A5] hover:bg-[#EF4444]/20 shrink-0"
                >
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {activeStep === 'success' && (
            <div className="py-8 px-4 text-center space-y-3 bg-[#00D6B3]/10 border border-[#00D6B3]/40 rounded-xl">
              <CheckCircle2 className="w-12 h-12 text-[#00D6B3] mx-auto animate-bounce" />
              <h4 className="text-lg font-bold text-[#EAF5FA]">Dataset Activated Successfully!</h4>
              <p className="text-xs text-[#91A5B3] max-w-md mx-auto">
                The simulation engine, Digital Twin, and optimization scheduler have been reinitialized with your dataset.
              </p>
            </div>
          )}

          {activeStep !== 'success' && (
            <>
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#20E3FF] bg-[#20E3FF]/10 scale-[0.99]'
                    : selectedFile
                    ? 'border-[#00D6B3]/50 bg-[#00D6B3]/5 hover:border-[#00D6B3]'
                    : 'border-[#253441] bg-[#080D12]/60 hover:border-[#20E3FF]/50 hover:bg-[#080D12]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-[#162330] border border-[#253441] flex items-center justify-center mx-auto mb-3 text-[#20E3FF]">
                  <Upload className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#EAF5FA] font-mono flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-[#20E3FF]" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#91A5B3] font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag to replace file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-[#EAF5FA]">
                      Drop your EV Charging CSV file here, or{' '}
                      <span className="text-[#20E3FF] underline underline-offset-4">Browse Files</span>
                    </p>
                    <p className="text-xs text-[#91A5B3] font-mono">
                      Supports Caltech ACN-Data format, workplace fleet telemetry, or standard charging traces
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Diagnostics & Summary Cards */}
              {isValidating && (
                <div className="py-6 px-4 rounded-xl bg-[#080D12] border border-[#253441] text-center space-y-3">
                  <div className="w-7 h-7 border-2 border-[#20E3FF] border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold font-mono text-[#EAF5FA]">
                      Ingesting & Validating: {selectedFile?.name}
                    </p>
                    <p className="text-[11px] font-mono text-[#91A5B3]">
                      Parsing timestamps, checking chronological bounds, and allocating 20 campus bays...
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelValidation();
                    }}
                    className="h-7 text-xs font-mono border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10 mx-auto"
                  >
                    Cancel Upload
                  </Button>
                </div>
              )}

              {previewData && !isValidating && (
                <div className="space-y-5">
                  {/* High-level Validation Status Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                      <div className="text-[10px] font-mono uppercase text-[#91A5B3] tracking-wider">
                        Valid Records
                      </div>
                      <div className="text-xl font-bold font-mono text-[#7CFF6B] flex items-center gap-2">
                        {previewData.valid_rows}
                        <span className="text-xs font-normal text-[#91A5B3]">/ {previewData.total_rows}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                      <div className="text-[10px] font-mono uppercase text-[#91A5B3] tracking-wider">
                        Rejected Rows
                      </div>
                      <div
                        className={`text-xl font-bold font-mono flex items-center gap-2 ${
                          previewData.rejected_rows > 0 ? 'text-[#EF4444]' : 'text-[#91A5B3]'
                        }`}
                      >
                        {previewData.rejected_rows}
                        {previewData.rejected_rows === 0 && (
                          <span className="text-xs font-normal text-[#7CFF6B]">Clean</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                      <div className="text-[10px] font-mono uppercase text-[#91A5B3] tracking-wider">
                        Total Energy Need
                      </div>
                      <div className="text-xl font-bold font-mono text-[#20E3FF]">
                        {previewData.summary?.total_energy_requested_kwh ?? 0}{' '}
                        <span className="text-xs font-normal text-[#91A5B3]">kWh</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                      <div className="text-[10px] font-mono uppercase text-[#91A5B3] tracking-wider">
                        Avg Dwell Time
                      </div>
                      <div className="text-xl font-bold font-mono text-[#EAF5FA]">
                        {previewData.summary?.average_dwell_hours ?? 0}{' '}
                        <span className="text-xs font-normal text-[#91A5B3]">hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* Issues & Warnings Section */}
                  {previewData.issues && previewData.issues.length > 0 && (
                    <div className="rounded-xl border border-[#253441] bg-[#080D12] p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[#EAF5FA] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Validation Diagnostic Feedback ({previewData.issues.length})
                        </span>
                        <span className="text-[10px] text-[#91A5B3]">
                          Chronological order, power constraints & bay distribution verified
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {previewData.issues.map((issue: DatasetValidationIssue, idx: number) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-[11px] font-mono flex items-start gap-2 ${
                              issue.severity === 'error'
                                ? 'bg-[#EF4444]/10 text-[#FCA5A5] border border-[#EF4444]/30'
                                : 'bg-[#F59E0B]/10 text-[#FCD34D] border border-[#F59E0B]/30'
                            }`}
                          >
                            <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] uppercase font-bold shrink-0">
                              {issue.row > 0 ? `Row ${issue.row}` : 'File'}
                            </span>
                            <span className="flex-1">{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schema & Column Mapping Accordion */}
                  <div className="rounded-xl border border-[#253441] bg-[#080D12] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMappingDrawer(!showMappingDrawer)}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-mono text-[#EAF5FA] hover:bg-[#111A22] transition-colors"
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <SlidersHorizontal className="w-4 h-4 text-[#20E3FF]" />
                        <span>Schema & Column Mapping</span>
                        <Badge variant="neutral" className="text-[10px] ml-1">
                          {Object.keys(customMapping).length} Mapped
                        </Badge>
                      </div>
                      {showMappingDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showMappingDrawer && (
                      <div className="p-4 border-t border-[#253441] bg-[#111A22]/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(CANONICAL_FIELD_LABELS).map(([canonKey, meta]) => {
                          const currentMapped = customMapping[canonKey] || '';
                          return (
                            <div key={canonKey} className="space-y-1 text-xs">
                              <div className="flex justify-between items-center">
                                <label className="text-[#EAF5FA] font-medium font-mono text-[11px]">
                                  {meta.label}{' '}
                                  {meta.required && <span className="text-[#EF4444]">*</span>}
                                </label>
                                <span className="text-[9px] text-[#91A5B3]">{meta.desc}</span>
                              </div>
                              <select
                                value={currentMapped}
                                onChange={(e) => handleMappingChange(canonKey, e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#080D12] border border-[#253441] text-[#EAF5FA] font-mono text-xs focus:border-[#20E3FF] focus:outline-none"
                              >
                                <option value="">-- Auto / None --</option>
                                {previewData.columns.map((col) => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Preview Tables */}
                  <div className="rounded-xl border border-[#253441] bg-[#080D12] overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-[#253441] bg-[#111A22]/80">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-[#20E3FF]" />
                        <span className="text-xs font-bold font-mono text-[#EAF5FA]">
                          Sample Preview (First 5 Rows)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#080D12] p-0.5 rounded-lg border border-[#253441]">
                        <button
                          type="button"
                          onClick={() => setPreviewTab('normalized')}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            previewTab === 'normalized'
                              ? 'bg-[#20E3FF] text-[#080D12]'
                              : 'text-[#91A5B3] hover:text-[#EAF5FA]'
                          }`}
                        >
                          Normalized
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('raw')}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            previewTab === 'raw'
                              ? 'bg-[#20E3FF] text-[#080D12]'
                              : 'text-[#91A5B3] hover:text-[#EAF5FA]'
                          }`}
                        >
                          Raw CSV
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-48 text-xs font-mono">
                      {previewTab === 'normalized' ? (
                        <table className="w-full text-left">
                          <thead className="bg-[#162330] text-[#91A5B3] text-[10px] uppercase border-b border-[#253441]">
                            <tr>
                              <th className="py-2 px-3">Session</th>
                              <th className="py-2 px-3">Bay</th>
                              <th className="py-2 px-3">Arrival</th>
                              <th className="py-2 px-3">Departure</th>
                              <th className="py-2 px-3">Need (kWh)</th>
                              <th className="py-2 px-3">SOC %</th>
                              <th className="py-2 px-3">Charger kW</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#253441]/40 text-[#EAF5FA]">
                            {previewData.normalized_preview && previewData.normalized_preview.length > 0 ? (
                              previewData.normalized_preview.map((row, i) => (
                                <tr key={i} className="hover:bg-[#162330]/50">
                                  <td className="py-2 px-3 font-bold text-[#20E3FF]">{row.session_id}</td>
                                  <td className="py-2 px-3 text-[#7CFF6B]">{row.charger_id}</td>
                                  <td className="py-2 px-3">{row.arrival_time?.slice(11, 16)}</td>
                                  <td className="py-2 px-3">{row.departure_time?.slice(11, 16)}</td>
                                  <td className="py-2 px-3">{row.requested_energy_kwh?.toFixed(1) ?? '--'}</td>
                                  <td className="py-2 px-3">
                                    {row.initial_soc_percent ?? 20}% → {row.target_soc_percent ?? 85}%
                                  </td>
                                  <td className="py-2 px-3">{row.charger_max_power_kw} kW</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="py-4 text-center text-[#91A5B3]">
                                  No normalized records available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left">
                          <thead className="bg-[#162330] text-[#91A5B3] text-[10px] uppercase border-b border-[#253441]">
                            <tr>
                              {previewData.columns.slice(0, 7).map((col) => (
                                <th key={col} className="py-2 px-3">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#253441]/40 text-[#EAF5FA]">
                            {previewData.raw_preview && previewData.raw_preview.length > 0 ? (
                              previewData.raw_preview.map((row, i) => (
                                <tr key={i} className="hover:bg-[#162330]/50">
                                  {previewData.columns.slice(0, 7).map((col) => (
                                    <td key={col} className="py-2 px-3 text-[11px] truncate max-w-[120px]">
                                      {String(row[col] ?? '')}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={previewData.columns.length || 1}
                                  className="py-4 text-center text-[#91A5B3]"
                                >
                                  No raw records available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Confirmation / Activation Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#253441]">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <label className="text-[10px] font-mono uppercase text-[#91A5B3] shrink-0">
                        Dataset Name:
                      </label>
                      <input
                        type="text"
                        value={customDatasetName}
                        onChange={(e) => setCustomDatasetName(e.target.value)}
                        placeholder="e.g. Fleet Logistics Depot A"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#080D12] border border-[#253441] text-[#EAF5FA] font-mono text-xs focus:border-[#20E3FF] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-xs font-mono text-[#91A5B3]"
                      >
                        Cancel
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleActivateDataset}
                        disabled={!previewData.can_activate || isActivating}
                        className="gap-2 px-5 text-xs font-bold font-mono shadow-lg shadow-[#20E3FF]/25"
                      >
                        {isActivating ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#080D12] border-t-transparent rounded-full animate-spin" />
                            <span>Activating Live Simulation...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Activate Dataset ({previewData.valid_rows} Sessions)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
