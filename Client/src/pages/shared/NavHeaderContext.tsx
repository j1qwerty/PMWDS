import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface NavHeaderAction {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface NavHeaderState {
  title: string;
  description?: string;
  action?: NavHeaderAction;
  actions?: NavHeaderAction[];
}

interface NavHeaderContextType extends NavHeaderState {
  setNavHeader: (state: NavHeaderState) => void;
}

const NavHeaderContext = createContext<NavHeaderContextType | null>(null);

const DEFAULT_STATE: NavHeaderState = { title: "PMWDS" };

export function NavHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavHeaderState>(DEFAULT_STATE);

  const setNavHeader = useCallback((newState: NavHeaderState) => {
    setState(newState);
  }, []);

  return (
    <NavHeaderContext.Provider value={{ ...state, setNavHeader }}>
      {children}
    </NavHeaderContext.Provider>
  );
}

export function useNavHeader() {
  const ctx = useContext(NavHeaderContext);
  if (!ctx) throw new Error("useNavHeader must be used within NavHeaderProvider");
  return ctx;
}
