import { createContext, useContext } from 'react';
import { features } from '../config/features';

const FeatureContext = createContext(features);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  return (
    <FeatureContext.Provider value={features}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  return useContext(FeatureContext);
}

