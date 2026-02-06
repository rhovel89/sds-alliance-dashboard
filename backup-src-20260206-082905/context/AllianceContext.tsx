import { createContext, useContext } from "react";

type AllianceContextType = {
  allianceId: string;
  loading: boolean;
};

const AllianceContext = createContext<AllianceContextType>({
  allianceId: "1bf14480-765e-4704-89e6-63bfb02e1187",
  loading: false
});

export function AllianceProvider({ children }: { children: React.ReactNode }) {
  return (
    <AllianceContext.Provider
      value={{
        allianceId: "1bf14480-765e-4704-89e6-63bfb02e1187",
        loading: false
      }}
    >
      {children}
    </AllianceContext.Provider>
  );
}

export function useAlliance() {
  return useContext(AllianceContext);
}
