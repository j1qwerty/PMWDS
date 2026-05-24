import type {
  AuthResponse,
  Department,
  Milestone,
  Organization,
  Project,
  Task,
  User,
  NotificationItem,
  ActivityLog,
  RoleRecord,
  SkillRecord,
  UserProfile,
  AIProvider,
  BurnoutRisk,
  Integration,
  Webhook,
  KnowledgeArticle,
  LessonLearned,
  StoredReport,
  DashboardRecord,
  GenericRecord,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5177/api/v1";

type ApiOptions = {
  token?: string | null;
  method?: string;
  body?: BodyInit | object | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, "")}`);
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  const headers = new Headers();
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let body = options.body ?? undefined;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json() as Promise<T>;
  return undefined as T;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>("auth/login", { method: "POST", body: { email, password } });
  },
  refresh(token: string) {
    return request<{ token: string; expiry: string }>("auth/refresh", { method: "POST", token });
  },
  getOrganizations(token: string) {
    return request<Organization[]>("organizations", { token });
  },
  getDepartments(token: string) {
    return request<Department[]>("departments", { token });
  },
  getProjects(token: string) {
    return request<Project[]>("projects", { token });
  },
  getUsers(token: string) {
    return request<User[]>("users", { token });
  },
  getMe(token: string) {
    return request<User>("users/me", { token });
  },
  registerUser(token: string, payload: Record<string, unknown>) {
    return request<User>("users/register", { token, method: "POST", body: payload });
  },
  updateUser(token: string, id: string, payload: Record<string, unknown>) {
    return request<User>(`users/${id}`, { token, method: "PUT", body: payload });
  },
  updateAvailability(token: string, id: string, status: string, availabilityPercentage: number) {
    return request<User>(`users/${id}/availability`, {
      token,
      method: "PATCH",
      body: { status, availabilityPercentage },
    });
  },
  getProfile(token: string, userId: string) {
    return request<UserProfile>(`profiles/${userId}`, { token });
  },
  upsertProfile(token: string, userId: string, payload: Record<string, unknown>) {
    return request<UserProfile>(`profiles/${userId}`, { token, method: "PUT", body: payload });
  },
  createOrganization(token: string, payload: Record<string, unknown>) {
    return request<Organization>("organizations", { token, method: "POST", body: payload });
  },
  updateOrganization(token: string, id: string, payload: Record<string, unknown>) {
    return request<Organization>(`organizations/${id}`, { token, method: "PUT", body: payload });
  },
  createDepartment(token: string, payload: Record<string, unknown>) {
    return request<Department>("departments", { token, method: "POST", body: payload });
  },
  updateDepartment(token: string, id: string, payload: Record<string, unknown>) {
    return request<Department>(`departments/${id}`, { token, method: "PUT", body: payload });
  },
  getMilestonesByProject(token: string, projectId: string) {
    return request<Milestone[]>(`milestones/by-project/${projectId}`, { token });
  },
  getTasksByProject(token: string, projectId: string) {
    return request<Task[]>(`tasks/by-project/${projectId}`, { token });
  },
  createProject(token: string, payload: Record<string, unknown>) {
    return request<Project>("projects", { token, method: "POST", body: payload });
  },
  updateProject(token: string, id: string, payload: Record<string, unknown>) {
    return request<Project>(`projects/${id}`, { token, method: "PUT", body: payload });
  },
  createMilestone(token: string, payload: Record<string, unknown>) {
    return request<Milestone>("milestones", { token, method: "POST", body: payload });
  },
  updateMilestone(token: string, id: string, payload: Record<string, unknown>) {
    return request<Milestone>(`milestones/${id}`, { token, method: "PUT", body: payload });
  },
  createTask(token: string, payload: Record<string, unknown>) {
    return request<Task>("tasks", { token, method: "POST", body: payload });
  },
  updateTask(token: string, id: string, payload: Record<string, unknown>) {
    return request<Task>(`tasks/${id}`, { token, method: "PUT", body: payload });
  },
  updateTaskProgress(token: string, taskId: string, progressPercentage: number, notes?: string) {
    return request<Task>(`tasks/${taskId}/progress`, {
      token,
      method: "PATCH",
      body: { progressPercentage, notes },
    });
  },
  updateSubtaskProgress(token: string, taskId: string, progressPercentage: number, notes?: string) {
    return request<Task>(`tasks/subtasks/${taskId}/progress`, {
      token,
      method: "PATCH",
      body: { progressPercentage, notes },
    });
  },
  addTaskComment(token: string, taskId: string, comment: string) {
    return request<Task>(`tasks/${taskId}/comments`, { token, method: "POST", body: { comment } });
  },
  updateTaskStatus(token: string, taskId: string, newStatus: string) {
    return request<Task>(`tasks/${taskId}/status`, { token, method: "PATCH", body: { newStatus } });
  },
  updateSubtaskStatus(token: string, taskId: string, newStatus: string) {
    return request<Task>(`tasks/subtasks/${taskId}/status`, {
      token,
      method: "PATCH",
      body: { newStatus },
    });
  },
  getNotifications(token: string, unreadOnly = false) {
    return request<NotificationItem[]>("notifications", { token, query: { unreadOnly, page: 1, pageSize: 100 } });
  },
  markNotificationRead(token: string, id: string) {
    return request<void>(`notifications/${id}/read`, { token, method: "PATCH" });
  },
  markAllNotificationsRead(token: string) {
    return request<void>("notifications/read-all", { token, method: "PATCH" });
  },
  broadcastNotification(token: string, payload: Record<string, unknown>) {
    return request<void>("notifications/broadcast", { token, method: "POST", body: payload });
  },
  getNotificationTemplates(token: string) {
    return request<GenericRecord[]>("notifications/templates", { token });
  },
  getAlertRules(token: string) {
    return request<GenericRecord[]>("notifications/rules", { token });
  },
  getAllActivityLogs(token: string, count = 100) {
    return request<ActivityLog[]>("activitylogs/all", { token, query: { count } });
  },
  getTeamActivityLogs(token: string, count = 100) {
    return request<ActivityLog[]>("activitylogs/team", { token, query: { count } });
  },
  getMyActivityLogs(token: string, count = 100) {
    return request<ActivityLog[]>("activitylogs", { token, query: { count } });
  },
  createActivityLog(token: string, payload: Record<string, unknown>) {
    return request<ActivityLog>("activitylogs", { token, method: "POST", body: payload });
  },
  getRoles(token: string) {
    return request<RoleRecord[]>("roles", { token });
  },
  createRole(token: string, payload: Record<string, unknown>) {
    return request<RoleRecord>("roles", { token, method: "POST", body: payload });
  },
  updateRole(token: string, id: string, payload: Record<string, unknown>) {
    return request<RoleRecord>(`roles/${id}`, { token, method: "PUT", body: payload });
  },
  getPermissions(token: string) {
    return request<GenericRecord[]>("roles/permissions", { token });
  },
  getSkills(token: string) {
    return request<SkillRecord[]>("skills", { token });
  },
  createSkill(token: string, payload: Record<string, unknown>) {
    return request<SkillRecord>("skills", { token, method: "POST", body: payload });
  },
  updateSkill(token: string, id: string, payload: Record<string, unknown>) {
    return request<SkillRecord>(`skills/${id}`, { token, method: "PUT", body: payload });
  },
  getAiProviders(token: string) {
    return request<AIProvider[]>("ai/providers", { token });
  },
  getAiBurnoutRisk(token: string, departmentId?: string | null) {
    return request<BurnoutRisk[]>("ai/burnout-risk", { token, query: { departmentId } });
  },
  getAiModels(token: string, modelType?: string) {
    return request<GenericRecord[]>("ai/models", { token, query: { modelType } });
  },
  getPredictionResults(token: string) {
    return request<GenericRecord[]>("ai/prediction-results", { token });
  },
  getAISettings(token: string) {
    return request<GenericRecord>("ai/settings", { token });
  },
  chat(token: string, message: string, provider?: string, model?: string) {
    return request<{ message: string; intent: string; suggestedActions?: string[] }>("ai/chat", {
      token,
      method: "POST",
      body: { message, provider, model },
    });
  },
  getStoredReports(token: string) {
    return request<StoredReport[]>("reports/stored", { token });
  },
  getReportSchedules(token: string) {
    return request<GenericRecord[]>("reports/schedules", { token });
  },
  createStoredReport(token: string, payload: Record<string, unknown>) {
    return request<StoredReport>("reports/stored", { token, method: "POST", body: payload });
  },
  getIntegrations(token: string) {
    return request<Integration[]>("integrations", { token });
  },
  createIntegration(token: string, payload: Record<string, unknown>) {
    return request<Integration>("integrations", { token, method: "POST", body: payload });
  },
  updateIntegration(token: string, id: string, payload: Record<string, unknown>) {
    return request<Integration>(`integrations/${id}`, { token, method: "PUT", body: payload });
  },
  getWebhooks(token: string, integrationId?: string) {
    return request<Webhook[]>("webhooks", { token, query: { integrationId } });
  },
  createWebhook(token: string, payload: Record<string, unknown>) {
    return request<Webhook>("webhooks", { token, method: "POST", body: payload });
  },
  getKnowledgeArticles(token: string, projectId?: string) {
    return request<KnowledgeArticle[]>("knowledge/articles", { token, query: { projectId } });
  },
  createKnowledgeArticle(token: string, payload: Record<string, unknown>) {
    return request<KnowledgeArticle>("knowledge/articles", { token, method: "POST", body: payload });
  },
  getLessons(token: string, projectId?: string) {
    return request<LessonLearned[]>("knowledge/lessons", { token, query: { projectId } });
  },
  createLesson(token: string, payload: Record<string, unknown>) {
    return request<LessonLearned>("knowledge/lessons", { token, method: "POST", body: payload });
  },
  getDashboards(token: string) {
    return request<DashboardRecord[]>("dashboards", { token });
  },
  createDashboard(token: string, payload: Record<string, unknown>) {
    return request<DashboardRecord>("dashboards", { token, method: "POST", body: payload });
  },
};
