import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ApiError, api } from "./api";
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
  ProjectNavigationItem,
  RoleRecord,
  Task,
  User,
  WorkspaceBootstrap,
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
    key: role.key,
    name: role.name,
    description: role.description,
    permissionLevel: role.permissionLevel,
    permissions: (role.permissionCodes ?? [])
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
  return items(pages.users).map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    profilePictureUrl: user.profilePictureUrl,
    jobTitle: user.jobTitle,
    organizationId: user.organizationId ?? null,
    department: user.departmentName,
    departmentId: user.departmentId,
    departments: user.departments ?? [],
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
    roleKeys: user.roleKeys,
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

function mapProjectNavigation(projects: ProjectNavigationItem[]): Project[] {
  return projects.map((project) => ({
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    description: null,
    category: "",
    status: project.status,
    priority: project.priority,
    plannedStartDate: project.createdDate,
    plannedEndDate: project.createdDate,
    actualStartDate: null,
    actualEndDate: null,
    plannedBudget: 0,
    actualCost: 0,
    budgetVariance: 0,
    progressPercentage: project.progressPercentage,
    aiHealthScore: 0,
    aiDelayRiskScore: project.aiDelayRiskScore,
    aiBudgetRiskScore: 0,
    aiInsightsSummary: null,
    departmentId: project.departmentId,
    departmentName: null,
    departmentIds: project.departmentIds,
    departments: project.departmentIds.map((departmentId) => ({
      departmentId,
      departmentName: null,
      isPrimary: departmentId === project.departmentId,
    })),
    projectManagerId: "",
    projectManagerName: null,
    totalTasks: project.totalTasks,
    completedTasks: 0,
    overdueTasks: 0,
    totalMilestones: 0,
    completedMilestones: 0,
    createdDate: project.createdDate,
    isNewForCurrentUser: project.isNewForCurrentUser,
  }));
}

function mapBootstrapData(bootstrap: WorkspaceBootstrap): AppData {
  return {
    ...emptyData,
    projects: mapProjectNavigation(bootstrap.projects),
    users: [bootstrap.currentUser],
    permissions: bootstrap.permissions.map((code) => ({
      id: code,
      code,
      name: code,
      description: "",
      module: code.split("_")[0] ?? "",
      isGlobal: false,
    })),
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const { auth, logout } = useAuth();
  const [bootstrap, setBootstrap] = useState<WorkspaceBootstrap | null>(null);
  const [pages, setPages] = useState<PagesDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!auth) {
      setBootstrap(null);
      setPages(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const bootstrapResponse = await api.getWorkspaceBootstrap(auth.token);
      setBootstrap(bootstrapResponse);
      const response = await api.getPagesData(auth.token);
      setPages(response);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        logout();
        return;
      }
      try {
        const response = await api.getPagesData(auth.token);
        setPages(response);
        setBootstrap(null);
      } catch (fallbackCause) {
        setError(fallbackCause instanceof Error ? fallbackCause.message : "Failed to load application data.");
        setPages(null);
      }
    } finally {
      setLoading(false);
    }
  }, [auth, logout]);

  useEffect(() => {
    if (!auth) {
      setBootstrap(null);
      setPages(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    api.getWorkspaceBootstrap(auth.token)
      .then((bootstrapResponse) => {
        if (cancelled) return;
        setBootstrap(bootstrapResponse);
        setLoading(false);
        void api.getPagesData(auth.token)
          .then((response) => {
            if (!cancelled) setPages(response);
          })
          .catch(() => {
            if (!cancelled) setPages(null);
          });
      })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 401) {
          logout();
          setLoading(false);
          return;
        }
        void api.getPagesData(auth.token)
          .then((response) => {
            if (cancelled) return;
            setPages(response);
            setBootstrap(null);
            setLoading(false);
          })
          .catch((fallbackCause) => {
            if (cancelled) return;
            setError(fallbackCause instanceof Error ? fallbackCause.message : "Failed to load application data.");
            setBootstrap(null);
            setPages(null);
            setLoading(false);
          });
      });

    return () => {
      cancelled = true;
    };
  }, [auth, logout]);

  const data = useMemo(() => {
    if (pages) {
      const pageData = mapPagesData(pages);
      if (!bootstrap) return pageData;
      return {
        ...pageData,
        // Navigation projects are independently server-scoped and are not
        // limited to the first page of the monolithic pages response.
        projects: mapProjectNavigation(bootstrap.projects),
        // Keep the authenticated user available even when they are not on the
        // first paginated users page.
        users: pageData.users.some((user) => user.id === bootstrap.currentUser.id)
          ? pageData.users
          : [bootstrap.currentUser, ...pageData.users],
      };
    }
    if (bootstrap) return mapBootstrapData(bootstrap);
    return emptyData;
  }, [bootstrap, pages]);
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
