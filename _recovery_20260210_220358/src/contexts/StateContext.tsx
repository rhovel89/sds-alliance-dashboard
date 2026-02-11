import { createContext, useContext, useState, useEffect } from "react";
import { useAlliance } from "./AllianceContext";

type StateContextType = {
  activeState: string | null;
  setActiveState: (state: string | null) => void;
};

const StateContext = createContext<StateContextType | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const allianceCtx = useAlliance(); // may be null during boot
  const [activeState, setActiveState] = useState<string | null>(null);

  useEffect(() => {
    if (!allianceCtx || !allianceCtx.activeAlliance) {
      // Alliance not ready yet — do NOTHING
      return;
    }

    // Safe to derive state now
    if (allianceCtx.activeAlliance.state_id) {
      setActiveState(allianceCtx.activeAlliance.state_id);
    }
  }, [allianceCtx]);

  return (
    <StateContext.Provider value={{ activeState, setActiveState }}>
      {children}
    </StateContext.Provider>
  );
}

export function useStateContext() {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("useStateContext must be used inside StateProvider");
  }
  return ctx;
}

