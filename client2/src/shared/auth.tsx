import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { api } from "./api";
import type { AuthResponse, AuthState, Role } from "./types";

type AuthContextValue = {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

const STORAGE_KEY = "pmwds-client2-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuth(response: AuthResponse): AuthState {
  return response;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  });

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      async login(email, password) {
        const response = await api.login(email, password);
        setAuth(mapAuth(response));
      },
      loginDemo() {
        setAuth({
          token: "demo-token",
          expiry: new Date(Date.now() + 86400000).toISOString(),
          userId: "u-admin",
          fullName: "Demo Director",
          email: "demo@pmwds.local",
          roles: ["SuperAdmin", "Director"],
        });
      },
      logout() {
        setAuth(null);
      },
      hasRole(...roles) {
        if (!auth) return false;
        return roles.some((role) => auth.roles.includes(role));
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
