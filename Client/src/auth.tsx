import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { api } from "./api";
import type { AuthResponse, Role } from "./types";

export type AuthState = {
  token: string;
  expiry: string;
  userId: string;
  fullName: string;
  email: string;
  profilePictureUrl?: string | null;
  roles: Role[];
  permissions: string[];
};

type AuthContextValue = {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateCurrentUser: (patch: Partial<Pick<AuthState, "fullName" | "email" | "profilePictureUrl">>) => void;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (...permissions: string[]) => boolean;
};

const STORAGE_KEY = "pmwds-client-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuth(response: AuthResponse): AuthState {
  return {
    token: response.token,
    expiry: response.expiry,
    userId: response.userId,
    fullName: response.fullName,
    email: response.email,
    profilePictureUrl: response.profilePictureUrl,
    roles: response.roles,
    permissions: response.permissions ?? [],
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  });

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return;

    const expiry = new Date(auth.expiry).getTime();
    const timeout = expiry - Date.now() - 60_000;

    const doRefresh = async () => {
      try {
        const refreshed = await api.refresh(auth.token);
        startTransition(() => {
          setAuth((current) =>
            current
              ? {
                  ...current,
                  token: refreshed.token,
                  expiry: refreshed.expiry,
                }
              : current,
          );
        });
      } catch {
        setAuth(null);
      }
    };

    if (timeout <= 0) {
      void doRefresh();
      return;
    }

    const timer = window.setTimeout(() => void doRefresh(), timeout);
    return () => window.clearTimeout(timer);
  }, [auth]);

  const value: AuthContextValue = {
    auth,
    async login(email, password) {
      const response = await api.login(email, password);
      setAuth(mapAuth(response));
    },
    logout() {
      setAuth(null);
    },
    async refresh() {
      if (!auth) return;
      const refreshed = await api.refresh(auth.token);
      setAuth({
        ...auth,
        token: refreshed.token,
        expiry: refreshed.expiry,
      });
    },
    updateCurrentUser(patch) {
      setAuth((current) => current ? { ...current, ...patch } : current);
    },
    hasRole(...roles) {
      if (!auth) return false;
      return roles.some((role) => auth.roles.includes(role));
    },
    hasPermission(...permissions) {
      if (!auth) return false;
      return permissions.some((permission) => (auth.permissions ?? []).includes(permission));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
