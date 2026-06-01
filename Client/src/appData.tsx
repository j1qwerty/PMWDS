import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type {
  ActivityLogRecord,
  AlertRuleRecord,
  Department,
  Milestone,
  NotificationItem,
  NotificationTemplateRecord,
  OrganizationRecord,
  PagesDataResponse,
  PermissionRecord,
  Project,
  RoleRecord,
  Task,
  User,
} from "./types";

type AppData = {
  organizations: OrganizationRecord[];
  departments: Department[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  subtasks: Task[];
  users: User[];
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  notifications: NotificationItem[];
  notificationTemplates: NotificationTemplateRecord[];
  alertRules: AlertRuleRecord[];
  activityLogs: ActivityLogRecord[];
};

type AppDataContextValue = {
  data: AppData;
  pages: PagesDataResponse | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const emptyData: AppData = {
  organizations: [],
  departments: [],
  projects: [],
  milestones: [],
  tasks: [],
  subtasks: [],
  users: [],
  roles: [],
  permissions: [],
  notifications: [],
  notificationTemplates: [],
  alertRules: [],
  activityLogs: [],
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function items<T>(page: { items: T[] } | undefined): T[] {
  return page?.items ?? [];
}

function mapRoleRecords(pages: PagesDataResponse): RoleRecord[] {
  const permissionsByCode = new Map(items(pages.permissions).map((permission) => [permission.code, permission]));
  return items(pages.roles).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissionLevel: role.permissionLevel,
    permissions: role.permissions
      .map((code) => permissionsByCode.get(code))
      .filter((permission): permission is PermissionRecord => Boolean(permission)),
  }));
}

function mapDepartments(pages: PagesDataResponse): Department[] {
  return items(pages.departments).map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    organizationId: department.organizationId,
    parentDepartmentId: null,
    departmentHeadUserId: department.departmentHeadUserId,
    maxCapacity: department.maxCapacity,
    capacityUtilization: 0,
  }));
}

function mapUsers(pages: PagesDataResponse): User[] {
  const departmentsById = new Map(items(pages.departments).map((department) => [department.id, department]));
  return items(pages.users).map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    profilePictureUrl: user.profilePictureUrl,
    jobTitle: user.jobTitle,
    organizationId: user.departmentId ? departmentsById.get(user.departmentId)?.organizationId ?? null : null,
    department: user.departmentName,
    departmentId: user.departmentId,
    departments: [],
    profileId: null,
    bio: null,
    availabilityStatus: "Available",
    availabilityPercentage: 0,
    aiWorkloadScore: 0,
    aiBurnoutRiskScore: 0,
    aiPerformanceScore: 0,
    activeTaskCount: 0,
    isActive: user.isActive,
    lastLoginDate: null,
    roles: user.roles,
    skills: user.skills?.map((skill) => skill.skillName) ?? [],
    skillDetails: user.skills?.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      proficiencyLevel: skill.proficiencyLevel,
      experienceMonths: 0,
      lastUsed: null,
    })),
  }));
}

function mapPagesData(pages: PagesDataResponse): AppData {
  return {
    organizations: items(pages.organizations) as OrganizationRecord[],
    departments: mapDepartments(pages),
    projects: items(pages.projects) as Project[],
    milestones: items(pages.milestones) as Milestone[],
    tasks: items(pages.tasks) as Task[],
    subtasks: items(pages.subtasks) as Task[],
    users: mapUsers(pages),
    roles: mapRoleRecords(pages),
    permissions: items(pages.permissions) as PermissionRecord[],
    notifications: items(pages.notifications) as NotificationItem[],
    notificationTemplates: items(pages.notificationTemplates) as NotificationTemplateRecord[],
    alertRules: items(pages.alertRules) as AlertRuleRecord[],
    activityLogs: items(pages.activityLogs) as ActivityLogRecord[],
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { auth } = useAuth();
  const [pages, setPages] = useState<PagesDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!auth) {
      setPages(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await api.getPagesData(auth.token);
      setPages(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load application data.");
      setPages(null);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = useMemo(() => (pages ? mapPagesData(pages) : emptyData), [pages]);
  const value = useMemo(
    () => ({ data, pages, loading, error, refresh }),
    [data, pages, loading, error, refresh],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }

  return context;
}
