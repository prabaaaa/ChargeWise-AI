import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SimulationResult,
  ComparisonResult,
  ActiveSession,
  ChargingSession,
  CutoffEvent,
  DatasetInfo,
  ActivateDatasetRequest,
} from '../api/types';
import { apiClient } from '../api/client';
import { DEFAULT_SITE_CAP_KW } from '../utils/constants';

export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [siteCapKw, setSiteCapKw] = useState<number>(DEFAULT_SITE_CAP_KW);
  const [policy, setPolicy] = useState<'optimized' | 'uncontrolled'>('optimized');
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [emergencySessions, setEmergencySessions] = useState<Set<string>>(new Set());
  const [leavingSoonSessions, setLeavingSoonSessions] = useState<Set<string>>(new Set());
  const [stoppedSessions, setStoppedSessions] = useState<Set<string>>(new Set());
  const [manualCutoffEvents, setManualCutoffEvents] = useState<CutoffEvent[]>([]);

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [allSessions, setAllSessions] = useState<ChargingSession[]>([]);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load simulation data & comparison
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sessions, simRes, compRes, dsInfo] = await Promise.all([
        apiClient.getSessions(),
        apiClient.runSimulation(policy, siteCapKw),
        apiClient.getComparison(siteCapKw),
        apiClient.getDatasetInfo(),
      ]);
      setAllSessions(sessions);
      setSimulationResult(simRes);
      setComparisonResult(compRes);
      setDatasetInfo(dsInfo);

      // Auto-advance to first interval with connected vehicles
      if (simRes?.intervals?.length) {
        const firstOccupied = simRes.intervals.findIndex(
          (iv) => iv.connected_vehicles && iv.connected_vehicles.length > 0
        );
        if (firstOccupied >= 0) {
          setCurrentIntervalIndex(firstOccupied);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load simulation data');
    } finally {
      setIsLoading(false);
    }
  }, [policy, siteCapKw]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIntervals = simulationResult?.intervals.length || 65;
  const currentInterval = simulationResult?.intervals[currentIntervalIndex] || null;
  const currentTime = currentInterval?.timestamp || '2026-10-21T09:00:00Z';

  // Compute active sessions at current interval
  // Compute active sessions at current interval with authoritative Least-Laxity-First (LLF) metrics
  const activeSessions: ActiveSession[] = (simulationResult?.intervals ? 
    (() => {
      if (!currentInterval) return [];
      const intervalAllocations = currentInterval.allocations || {};
      const activeIds = currentInterval.connected_vehicles || [];
      const hasManualOverrides = emergencySessions.size > 0 || stoppedSessions.size > 0 || leavingSoonSessions.size > 0;

      // 1. Gather sessions and calculate physics metrics
      const rawSessions = activeIds.map((id) => {
        const sessionMeta = allSessions.find((s) => s.session_id === id);
        const outcome = simulationResult.outcomes.find((o) => o.session_id === id);
        const isEmergency = emergencySessions.has(id);
        const isLeavingSoon = leavingSoonSessions.has(id);
        const isStopped = stoppedSessions.has(id);

        const reqEnergy = sessionMeta?.requested_energy_kwh || 25;
        let effectiveTarget = sessionMeta?.effective_energy_target_kwh || reqEnergy;

        // Battery safety headroom
        if (sessionMeta?.battery_capacity_kwh && sessionMeta.initial_soc_percent !== null && sessionMeta.initial_soc_percent !== undefined) {
          const headroom = (sessionMeta.battery_capacity_kwh * (100 - sessionMeta.initial_soc_percent)) / 100;
          effectiveTarget = Math.min(effectiveTarget, headroom);
        }

        // Approximate energy delivered up to this interval
        let deliveredSoFar = 0;
        for (let i = 0; i <= currentIntervalIndex; i++) {
          const stepAlloc = simulationResult.intervals[i]?.allocations[id] || 0;
          deliveredSoFar += stepAlloc * 0.25;
        }

        const remainingKwh = Math.max(0, effectiveTarget - deliveredSoFar);
        const feasibility = outcome?.feasibility_status || (remainingKwh < 2 ? 'feasible' : 'at_risk');
        const maxChargerPower = sessionMeta?.charger_max_power_kw || 6.6;

        // Accurate Time Remaining and Slack Laxity
        const effectiveDepStr = isLeavingSoon ? '2026-10-21T10:30:00Z' : (sessionMeta?.departure_time || '2026-10-21T17:00:00Z');
        const depMs = new Date(effectiveDepStr).getTime();
        const curMs = new Date(currentTime).getTime();
        const timeRemainingHours = Math.max(0.01, (depMs - curMs) / 3600000);
        const minChargeTime = remainingKwh / maxChargerPower;
        const laxityHours = Math.round((timeRemainingHours - minChargeTime) * 10) / 10;

        let urgencyScore = 1.0 / Math.max(0.01, laxityHours);
        if (isEmergency) urgencyScore += 1000000.0;

        return {
          id,
          sessionMeta,
          isEmergency,
          isLeavingSoon,
          isStopped,
          effectiveTarget,
          deliveredSoFar,
          remainingKwh,
          feasibility,
          maxChargerPower,
          effectiveDepStr,
          timeRemainingHours,
          laxityHours,
          urgencyScore,
          baseAlloc: intervalAllocations[id] || 0.0,
        };
      });

      // 2. Authoritative Power Allocation: if manual overrides exist, greedily allocate under siteCapKw
      const finalAllocations: Record<string, number> = {};
      if (hasManualOverrides) {
        let remainingBudget = siteCapKw;
        // Sort by urgency descending
        const sortedForAlloc = [...rawSessions].sort((a, b) => b.urgencyScore - a.urgencyScore);
        for (const item of sortedForAlloc) {
          if (item.isStopped || item.remainingKwh <= 0.05 || remainingBudget <= 0.01) {
            finalAllocations[item.id] = 0.0;
            continue;
          }
          const powerNeededForInterval = item.remainingKwh / 0.25;
          const desired = Math.min(item.maxChargerPower, powerNeededForInterval);
          const allocated = Math.min(desired, remainingBudget);
          finalAllocations[item.id] = Math.round(allocated * 10) / 10;
          remainingBudget = Math.max(0, remainingBudget - allocated);
        }
      } else {
        rawSessions.forEach((s) => {
          finalAllocations[s.id] = s.baseAlloc;
        });
      }

      // 3. Assemble ActiveSession objects with calibrated priority ranking
      const assembled: ActiveSession[] = rawSessions.map((s) => {
        const allocatedKw = finalAllocations[s.id] ?? 0.0;

        // Cutoff state evaluation
        let cutoffStatus = 'QUEUED';
        if (s.isStopped) {
          cutoffStatus = 'AUTO CUTOFF';
        } else if (s.remainingKwh <= 0.05 || s.deliveredSoFar >= s.effectiveTarget - 0.05) {
          cutoffStatus = 'TARGET REACHED';
        } else if (allocatedKw > 0.05) {
          cutoffStatus = 'CHARGING';
        } else {
          cutoffStatus = 'QUEUED';
        }

        // Calibrate priority score (0-100)
        let priority = 50;
        if (s.isEmergency) priority = 100;
        else if (cutoffStatus === 'TARGET REACHED' || s.isStopped) priority = 0;
        else {
          priority = Math.min(99, Math.max(5, Math.round(Math.min(10, s.urgencyScore) * 9.5)));
        }

        return {
          session_id: s.id,
          charger_id: s.sessionMeta?.charger_id || `CP-${s.id.replace(/\D+/g, '').padStart(2, '0')}`,
          arrival_time: s.sessionMeta?.arrival_time || currentInterval.timestamp,
          departure_time: s.effectiveDepStr,
          energy_delivered_kwh: Math.round(s.deliveredSoFar * 10) / 10,
          energy_requested_kwh: s.sessionMeta?.requested_energy_kwh ?? s.effectiveTarget,
          allocated_power_kw: allocatedKw,
          priority_score: priority,
          feasibility_status: s.feasibility,
          remaining_energy_kwh: Math.round(s.remainingKwh * 10) / 10,
          departure_source: s.sessionMeta?.departure_source || 'scheduled',
          is_emergency: s.isEmergency,
          is_manually_stopped: s.isStopped,
          cutoff_status: cutoffStatus,
          target_soc_percent: s.sessionMeta?.target_soc_percent ?? 85,
          effective_energy_target_kwh: Math.round(s.effectiveTarget * 10) / 10,
          initial_soc_percent: s.sessionMeta?.initial_soc_percent ?? 25,
          battery_capacity_kwh: s.sessionMeta?.battery_capacity_kwh ?? 70,
          laxity_hours: s.laxityHours,
          urgency_score: Math.round(s.urgencyScore * 100) / 100,
          charger_max_power_kw: s.maxChargerPower,
        };
      });

      // Sort in authoritative dispatch priority order
      assembled.sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0));
      return assembled;
    })() : []);

  // Timer interval for playback
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const stepForward = useCallback(() => {
    setCurrentIntervalIndex((prev) => {
      if (prev >= totalIntervals - 1) {
        setIsRunning(false);
        return 0; // loop or stop
      }
      return prev + 1;
    });
  }, [totalIntervals]);

  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = 1000 / speed;
    const intervalId = setInterval(() => {
      stepForward();
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [isRunning, speed, stepForward]);

  const togglePlayPause = () => {
    setIsRunning((prev) => !prev);
  };

  const reset = () => {
    setIsRunning(false);
    setCurrentIntervalIndex(0);
  };

  const declareEmergency = (sessionId: string) => {
    setEmergencySessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const declareLeavingSoon = (sessionId: string) => {
    setLeavingSoonSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const stopCharging = async (sessionId: string) => {
    setStoppedSessions((prev) => new Set(prev).add(sessionId));
    const sessionMeta = allSessions.find((s) => s.session_id === sessionId);
    const manualEvt: CutoffEvent = {
      session_id: sessionId,
      charger_id: sessionMeta?.charger_id || `CP-${sessionId.replace(/\D+/g, '').padStart(2, '0')}`,
      timestamp: currentTime,
      reason: 'MANUAL_STOP',
      final_energy_delivered_kwh: activeSessions.find((s) => s.session_id === sessionId)?.energy_delivered_kwh || 0,
      target_energy_kwh: sessionMeta?.requested_energy_kwh || 25,
      target_achieved: false,
      final_soc_percent: activeSessions.find((s) => s.session_id === sessionId)?.initial_soc_percent ?? null,
      message: `Manual charging cutoff triggered by operator for ${sessionMeta?.charger_id || sessionId}. Power set to 0.0 kW immediately.`,
    };
    setManualCutoffEvents((prev) => [manualEvt, ...prev]);
    await apiClient.stopCharging(sessionId);
  };

  const startCharging = async (sessionId: string) => {
    setStoppedSessions((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    await apiClient.startCharging(sessionId);
  };

  // Collect all cutoff events up to the current interval plus manual stops
  const allCutoffEvents: CutoffEvent[] = (() => {
    const events: CutoffEvent[] = [...manualCutoffEvents];
    if (simulationResult?.cutoff_events) {
      for (const ev of simulationResult.cutoff_events) {
        if (!events.some((e) => e.session_id === ev.session_id && e.reason === ev.reason)) {
          events.push(ev);
        }
      }
    }
    return events;
  })();

  const activateDataset = async (req: ActivateDatasetRequest) => {
    setIsRunning(false);
    setIsLoading(true);
    try {
      const res = await apiClient.activateDataset(req);
      setEmergencySessions(new Set());
      setLeavingSoonSessions(new Set());
      setStoppedSessions(new Set());
      setManualCutoffEvents([]);
      setCurrentIntervalIndex(0);
      await loadData();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const resetToBenchmark = async () => {
    setIsRunning(false);
    setIsLoading(true);
    try {
      const res = await apiClient.resetToBenchmark();
      setEmergencySessions(new Set());
      setLeavingSoonSessions(new Set());
      setStoppedSessions(new Set());
      setManualCutoffEvents([]);
      setCurrentIntervalIndex(0);
      await loadData();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveTotalPower = Math.round(
    activeSessions.reduce((acc, s) => acc + s.allocated_power_kw, 0) * 10
  ) / 10;
  const synchronizedInterval = currentInterval ? {
    ...currentInterval,
    site_total_power_kw: effectiveTotalPower,
    grid_power_kw: Math.max(0, Math.round((effectiveTotalPower - (currentInterval.solar_power_kw || 0)) * 10) / 10),
  } : null;

  return {
    isRunning,
    speed,
    siteCapKw,
    policy,
    currentIntervalIndex,
    totalIntervals,
    currentInterval: synchronizedInterval,
    currentTime,
    activeSessions,
    allSessions,
    datasetInfo,
    simulationResult,
    comparisonResult,
    selectedSessionId,
    stoppedSessions,
    cutoffEvents: allCutoffEvents,
    isLoading,
    error,
    togglePlayPause,
    stepForward,
    reset,
    setSpeed,
    setSiteCapKw,
    setPolicy,
    setSelectedSessionId,
    setCurrentIntervalIndex,
    declareEmergency,
    declareLeavingSoon,
    stopCharging,
    startCharging,
    activateDataset,
    resetToBenchmark,
    reload: loadData,
  };
}
