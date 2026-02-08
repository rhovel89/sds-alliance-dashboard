import { createContext, useContext } from "react";
import { usePermissions } from "../hooks/usePermissions";

type PermissionContextType = ReturnType<typeof usePermissions>;

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const value = usePermissions();
  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermissionContext must be used inside PermissionProvider");
  }
  return ctx;
}

