import { useParams } from "react-router-dom";
import { createContext, useContext } from "react";

type AllianceContextType = {
  alliance_id: string;
  loading: boolean;
};

const AllianceContext = createContext<AllianceContextType>({
  alliance_id: "1bf14480-765e-4704-89e6-63bfb02e1187",
  loading: false
});

export function AllianceProvider({ children }: { children: React.ReactNode }) {
  return (
    <AllianceContext.Provider
      value={{
        alliance_id: "1bf14480-765e-4704-89e6-63bfb02e1187",
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
