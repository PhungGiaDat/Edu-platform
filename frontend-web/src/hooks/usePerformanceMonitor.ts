// frontend-web/src/hooks/usePerformanceMonitor.ts
import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/runtime/PerformanceMonitor';
import { useMarkerHealthStore } from '@/stores/markerHealth.store';

export function usePerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { markers, getUnhealthyMarkers } = useMarkerHealthStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(performanceMonitor.getCurrentFPS());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const startMonitoring = useCallback(() => {
    performanceMonitor.start();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    performanceMonitor.stop();
    setIsMonitoring(false);
  }, []);

  const recordFrame = useCallback(() => {
    performanceMonitor.recordFrame();
  }, []);

  return {
    fps,
    isMonitoring,
    isHealthy: fps >= 15,
    markers: Array.from(markers.entries()).map(([id, m]) => ({ id, ...m })),
    unhealthyMarkers: getUnhealthyMarkers(),
    startMonitoring,
    stopMonitoring,
    recordFrame,
  };
}
