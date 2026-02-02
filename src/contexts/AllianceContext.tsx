import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AllianceContext = createContext<any>(null);

export function AllianceProvider({ children }: { children: any }) {
  const [alliances, setAlliances] = useState<any[]>([]);
  const [activeAlliance, setActiveAllianceState] = useState<string>(
    localStorage.getItem("activeAlliance") || "SDS"
  );

  useEffect(() => {
    supabase
      .from("alliances")
      .select("*")
      .order("name")
      .then(({ data }) => setAlliances(data ?? []));
  }, []);

  function setActiveAlliance(id: string) {
    localStorage.setItem("activeAlliance", id);
    setActiveAllianceState(id);
  }

  return (
    <AllianceContext.Provider
      value={{ alliances, activeAlliance, setActiveAlliance }}
    >
      {children}
    </AllianceContext.Provider>
  );
}

export function useAlliance() {
  return useContext(AllianceContext);
}
