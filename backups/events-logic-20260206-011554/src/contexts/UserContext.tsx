import { createContext, useContext } from "react";
import { useSession } from "../hooks/useSession";

type UserContextType = {
  user: any;
};

const UserContext = createContext<UserContextType>({
  user: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

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



