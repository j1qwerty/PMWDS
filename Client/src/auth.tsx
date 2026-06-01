import {
  createContext,
  useCallback,
  startTransition,
  useContext,
  useEffect,
  useMemo,
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

const permissionCoverage: Record<string, string[]> = {
  ORGANIZATION_MANAGE: ["ORGANIZATION_VIEW", "ORGANIZATION_CREATE", "ORGANIZATION_EDIT", "ORGANIZATION_DELETE"],
  DEPARTMENT_MANAGE: ["DEPARTMENT_VIEW", "DEPARTMENT_CREATE", "DEPARTMENT_EDIT", "DEPARTMENT_DELETE"],
  PROJECT_MANAGE: ["PROJECT_VIEW", "PROJECT_CREATE", "PROJECT_EDIT", "PROJECT_DELETE"],
  MILESTONE_MANAGE: ["MILESTONE_VIEW", "MILESTONE_CREATE", "MILESTONE_EDIT", "MILESTONE_DELETE"],
  TASK_MANAGE: ["TASK_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_DELETE", "TASK_ASSIGN", "TASK_COMMENT_CREATE", "TASK_ATTACHMENT_CREATE", "TASK_TIME_TRACK"],
  SUBTASK_MANAGE: ["SUBTASK_VIEW", "SUBTASK_CREATE", "SUBTASK_EDIT", "SUBTASK_DELETE"],
  USER_MANAGE: ["USER_VIEW", "USER_CREATE", "USER_EDIT", "USER_DELETE", "USER_DEPARTMENT_MANAGE", "USER_PROFILE_PICTURE_MANAGE"],
  ROLE_MANAGE: ["ROLE_VIEW", "ROLE_CREATE", "ROLE_EDIT", "ROLE_DELETE"],
  PERMISSION_MANAGE: ["PERMISSION_VIEW", "PERMISSION_CREATE", "PERMISSION_EDIT", "PERMISSION_DELETE"],
  NOTIFICATION_MANAGE: ["NOTIFICATION_VIEW", "NOTIFICATION_BROADCAST", "NOTIFICATION_TEMPLATE_MANAGE", "NOTIFICATION_RULE_MANAGE"],
  ACTIVITY_LOG_MANAGE: ["ACTIVITY_LOG_VIEW", "ACTIVITY_LOG_CREATE"],
};

function hasCoveredPermission(userPermissions: readonly string[], requested: string) {
  if (userPermissions.includes("SYSTEM_ADMIN") || userPermissions.includes(requested)) return true;
  return Object.entries(permissionCoverage).some(
    ([managePermission, covered]) =>
      userPermissions.includes(managePermission) && covered.includes(requested),
  );
}

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

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setAuth(mapAuth(response));
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!auth) return;
    const refreshed = await api.refresh(auth.token);
    setAuth({
      ...auth,
      token: refreshed.token,
      expiry: refreshed.expiry,
    });
  }, [auth]);

  const updateCurrentUser = useCallback((patch: Partial<Pick<AuthState, "fullName" | "email" | "profilePictureUrl">>) => {
    setAuth((current) => current ? { ...current, ...patch } : current);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => {
    if (!auth) return false;
    return roles.some((role) => auth.roles.includes(role));
  }, [auth]);

  const hasPermission = useCallback((...permissions: string[]) => {
    if (!auth) return false;
    return permissions.some((permission) => hasCoveredPermission(auth.permissions ?? [], permission));
  }, [auth]);

  const value: AuthContextValue = useMemo(() => ({
    auth,
    login,
    logout,
    refresh,
    updateCurrentUser,
    hasRole,
    hasPermission,
  }), [auth, login, logout, refresh, updateCurrentUser, hasRole, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
