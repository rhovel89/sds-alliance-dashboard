import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

type UserContextType = {
  user: any;
};

const UserContext = createContext<UserContextType>({
  user: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  const user = session?.user ?? null;

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

