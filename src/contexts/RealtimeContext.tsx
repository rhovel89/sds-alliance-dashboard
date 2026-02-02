import { createContext, useContext, useEffect } from 'react';
import { startRealtime, stopRealtime } from '../realtime/realtimeManager';
import { useFeatures } from './FeatureContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { realtime } = useFeatures();

  useEffect(() => {
    if (realtime) {
      startRealtime();
      return () => stopRealtime();
    }
  }, [realtime]);

  return (
    <RealtimeContext.Provider value={null}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
