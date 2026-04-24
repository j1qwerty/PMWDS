import type {
  AIModel,
  AIProvider,
  AISettingsRequest,
  AISettingsResponse,
  AIProviderTestResult,
  AuthResponse,
  ChatResponse,
  DashboardData,
  DashboardRecord,
  DelayPrediction,
  Department,
  Milestone,
  NotificationItem,
  NotificationTemplateRecord,
  AlertRuleRecord,
  OrganizationRecord,
  PermissionRecord,
  Project,
  ProjectHealth,
  RoleRecord,
  Task,
  UserProfileRecord,
  User,
  WorkloadReport,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5177/api/v1";

type ApiOptions = {
  token?: string | null;
  method?: string;
  body?: BodyInit | object | null;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, "")}`);

  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let body = options.body ?? undefined;
  if (
    body &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    typeof body !== "string"
  ) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || text;
    } catch {}
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.blob()) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>("auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  refresh(token: string) {
    return request<{ token: string; expiry: string }>("auth/refresh", {
      method: "POST",
      token,
    });
  },
  getDashboard(token: string, departmentId?: string | null) {
    return request<DashboardData>("projects/dashboard", {
      token,
      query: { departmentId: departmentId ?? undefined },
    });
  },
  getProjects(token: string, filters?: { departmentId?: string; status?: string }) {
    return request<Project[]>("projects", {
      token,
      query: filters ?? {},
    });
  },
  getProject(token: string, id: string) {
    return request<Project>(`projects/${id}`, { token });
  },
  createProject(token: string, payload: Record<string, unknown>) {
    return request<Project>("projects", { token, method: "POST", body: payload });
  },
  updateProject(token: string, id: string, payload: Record<string, unknown>) {
    return request<Project>(`projects/${id}`, { token, method: "PUT", body: payload });
  },
  updateProjectStatus(token: string, id: string, newStatus: string, justification?: string) {
    return request<Project>(`projects/${id}/status`, {
      token,
      method: "PATCH",
      body: { newStatus, justification },
    });
  },
  getProjectProgress(token: string, id: string) {
    return request<Record<string, unknown>>(`projects/${id}/progress`, { token });
  },
  getProjectInsights(token: string, id: string) {
    return request<string[]>(`projects/${id}/ai/insights`, { token });
  },
  getProjectHealth(token: string, id: string) {
    return request<ProjectHealth>(`projects/${id}/ai/health`, { token });
  },
  optimizeProjectResources(token: string, id: string) {
    return request<Record<string, unknown>>(`projects/${id}/ai/optimize-resources`, {
      token,
      method: "POST",
    });
  },
  uploadProjectDocument(token: string, id: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    return request<void>(`projects/${id}/documents`, { token, method: "POST", body: form });
  },
  deleteProject(token: string, id: string) {
    return request<void>(`projects/${id}`, { token, method: "DELETE" });
  },
  getMilestonesByProject(token: string, projectId: string) {
    return request<Milestone[]>(`milestones/by-project/${projectId}`, { token });
  },
  createMilestone(token: string, payload: Record<string, unknown>) {
    return request<Milestone>("milestones", { token, method: "POST", body: payload });
  },
  getMilestone(token: string, id: string) {
    return request<Milestone>(`milestones/${id}`, { token });
  },
  updateMilestone(token: string, id: string, payload: Record<string, unknown>) {
    return request<Milestone>(`milestones/${id}`, { token, method: "PUT", body: payload });
  },
  completeMilestone(token: string, id: string) {
    return request<Milestone>(`milestones/${id}/complete`, { token, method: "PATCH" });
  },
  deleteMilestone(token: string, id: string) {
    return request<void>(`milestones/${id}`, { token, method: "DELETE" });
  },
  getTasksByProject(token: string, projectId: string) {
    return request<Task[]>(`tasks/by-project/${projectId}`, { token });
  },
  getMyTasks(token: string) {
    return request<Task[]>("tasks/my-tasks", { token });
  },
  getTask(token: string, id: string) {
    return request<Task>(`tasks/${id}`, { token });
  },
  getOverdueTasks(token: string) {
    return request<Task[]>("tasks/overdue", { token });
  },
  getEscalatedTasks(token: string) {
    return request<Task[]>("tasks/escalated", { token });
  },
  getUnassignedTasks(token: string) {
    return request<Task[]>("tasks/unassigned", { token });
  },
  createTask(token: string, payload: Record<string, unknown>) {
    return request<Task>("tasks", { token, method: "POST", body: payload });
  },
  updateTask(token: string, id: string, payload: Record<string, unknown>) {
    return request<Task>(`tasks/${id}`, { token, method: "PUT", body: payload });
  },
  updateTaskProgress(token: string, id: string, progressPercentage: number, notes?: string) {
    return request<Task>(`tasks/${id}/progress`, {
      token,
      method: "PATCH",
      body: { progressPercentage, notes },
    });
  },
  updateTaskStatus(token: string, id: string, newStatus: string) {
    return request<Task>(`tasks/${id}/status`, { token, method: "PATCH", body: { newStatus } });
  },
  assignTask(token: string, id: string, assigneeId: string, useAIRecommendation = false) {
    return request<Task>(`tasks/${id}/assign`, {
      token,
      method: "POST",
      body: { assigneeId, useAIRecommendation },
    });
  },
  getTaskRecommendation(token: string, id: string) {
    return request<Record<string, unknown>>(`tasks/${id}/ai/recommend-assignee`, { token });
  },
  getTaskDelayPrediction(token: string, id: string) {
    return request<DelayPrediction>(`tasks/${id}/ai/delay-prediction`, { token });
  },
  escalateTask(token: string, id: string) {
    return request<Task>(`tasks/${id}/escalate`, { token, method: "POST" });
  },
  addTaskComment(token: string, id: string, comment: string) {
    return request<Task>(`tasks/${id}/comments`, {
      token,
      method: "POST",
      body: { comment },
    });
  },
  uploadTaskAttachment(token: string, id: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    return request<Task>(`tasks/${id}/attachments`, { token, method: "POST", body: form });
  },
  startTaskTimer(token: string, id: string, description: string, isBillable = false) {
    return request<Task>(`tasks/${id}/time/start`, {
      token,
      method: "POST",
      body: { description, isBillable },
    });
  },
  stopTaskTimer(token: string, id: string) {
    return request<Task>(`tasks/${id}/time/stop`, { token, method: "POST" });
  },
  deleteTask(token: string, id: string) {
    return request<void>(`tasks/${id}`, { token, method: "DELETE" });
  },
  getSubtasks(token: string, parentTaskId: string) {
    return request<Task[]>(`tasks/${parentTaskId}/subtasks`, { token });
  },
  createSubtask(token: string, parentTaskId: string, payload: Record<string, unknown>) {
    return request<Task>(`tasks/${parentTaskId}/subtasks`, { token, method: "POST", body: payload });
  },
  getSubtask(token: string, id: string) {
    return request<Task>(`tasks/subtasks/${id}`, { token });
  },
  updateSubtask(token: string, id: string, payload: Record<string, unknown>) {
    return request<Task>(`tasks/subtasks/${id}`, { token, method: "PUT", body: payload });
  },
  updateSubtaskProgress(token: string, id: string, progressPercentage: number, notes?: string) {
    return request<Task>(`tasks/subtasks/${id}/progress`, {
      token,
      method: "PATCH",
      body: { progressPercentage, notes },
    });
  },
  updateSubtaskStatus(token: string, id: string, newStatus: string) {
    return request<Task>(`tasks/subtasks/${id}/status`, {
      token,
      method: "PATCH",
      body: { newStatus },
    });
  },
  assignSubtask(token: string, id: string, assigneeId: string, useAIRecommendation = false) {
    return request<Task>(`tasks/subtasks/${id}/assign`, {
      token,
      method: "POST",
      body: { assigneeId, useAIRecommendation },
    });
  },
  deleteSubtask(token: string, id: string) {
    return request<void>(`tasks/subtasks/${id}`, { token, method: "DELETE" });
  },
  getUsers(token: string, departmentId?: string | null) {
    return request<User[]>("users", {
      token,
      query: { departmentId: departmentId ?? undefined },
    });
  },
  getMe(token: string) {
    return request<User>("users/me", { token });
  },
  getAvailableUsers(token: string) {
    return request<User[]>("users/available", { token });
  },
  getWorkload(token: string, departmentId?: string | null) {
    return request<WorkloadReport>("users/workload", {
      token,
      query: { departmentId: departmentId ?? undefined },
    });
  },
  registerUser(token: string, payload: Record<string, unknown>) {
    return request<User>("users/register", { token, method: "POST", body: payload });
  },
  updateAvailability(token: string, id: string, status: string, availabilityPercentage: number) {
    return request<User>(`users/${id}/availability`, {
      token,
      method: "PATCH",
      body: { status, availabilityPercentage },
    });
  },
  addUserSkill(token: string, id: string, skillId: string, proficiencyLevel: number, experienceMonths: number) {
    return request<User>(`users/${id}/skills`, {
      token,
      method: "POST",
      body: { skillId, proficiencyLevel, experienceMonths },
    });
  },
  deactivateUser(token: string, id: string) {
    return request<void>(`users/${id}/deactivate`, { token, method: "PATCH" });
  },
  getDepartments(token: string) {
    return request<Department[]>("departments", { token });
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
  deleteRole(token: string, id: string) {
    return request<void>(`roles/${id}`, { token, method: "DELETE" });
  },
  getPermissions(token: string) {
    return request<PermissionRecord[]>("roles/permissions", { token });
  },
  createPermission(token: string, payload: Record<string, unknown>) {
    return request<PermissionRecord>("roles/permissions", { token, method: "POST", body: payload });
  },
  updatePermission(token: string, id: string, payload: Record<string, unknown>) {
    return request<PermissionRecord>(`roles/permissions/${id}`, { token, method: "PUT", body: payload });
  },
  deletePermission(token: string, id: string) {
    return request<void>(`roles/permissions/${id}`, { token, method: "DELETE" });
  },
  getProfile(token: string, userId: string) {
    return request<UserProfileRecord>(`profiles/${userId}`, { token });
  },
  upsertProfile(token: string, userId: string, payload: Record<string, unknown>) {
    return request<UserProfileRecord>(`profiles/${userId}`, { token, method: "PUT", body: payload });
  },
  getDepartmentDashboard(token: string, id: string) {
    return request<Record<string, unknown>>(`departments/${id}/dashboard`, { token });
  },
  createDepartment(token: string, payload: Record<string, unknown>) {
    return request<Department>("departments", { token, method: "POST", body: payload });
  },
  updateDepartment(token: string, id: string, payload: Record<string, unknown>) {
    return request<void>(`departments/${id}`, { token, method: "PUT", body: payload });
  },
  deleteDepartment(token: string, id: string) {
    return request<void>(`departments/${id}`, { token, method: "DELETE" });
  },
  getNotifications(token: string, unreadOnly = false) {
    return request<NotificationItem[]>("notifications", {
      token,
      query: { unreadOnly, page: 1, pageSize: 50 },
    });
  },
  getUnreadNotificationCount(token: string) {
    return request<{ count: number }>("notifications/unread-count", { token });
  },
  markNotificationRead(token: string, id: string) {
    return request<void>(`notifications/${id}/read`, { token, method: "PATCH" });
  },
  markAllNotificationsRead(token: string) {
    return request<void>("notifications/read-all", { token, method: "PATCH" });
  },
  deleteNotification(token: string, id: string) {
    return request<void>(`notifications/${id}`, { token, method: "DELETE" });
  },
  broadcastNotification(token: string, payload: Record<string, unknown>) {
    return request<void>("notifications/broadcast", { token, method: "POST", body: payload });
  },
  getNotificationTemplates(token: string) {
    return request<NotificationTemplateRecord[]>("notifications/templates", { token });
  },
  createNotificationTemplate(token: string, payload: Record<string, unknown>) {
    return request<NotificationTemplateRecord>("notifications/templates", {
      token,
      method: "POST",
      body: payload,
    });
  },
  updateNotificationTemplate(token: string, id: string, payload: Record<string, unknown>) {
    return request<NotificationTemplateRecord>(`notifications/templates/${id}`, {
      token,
      method: "PUT",
      body: payload,
    });
  },
  deleteNotificationTemplate(token: string, id: string) {
    return request<void>(`notifications/templates/${id}`, { token, method: "DELETE" });
  },
  getAlertRules(token: string) {
    return request<AlertRuleRecord[]>("notifications/rules", { token });
  },
  createAlertRule(token: string, payload: Record<string, unknown>) {
    return request<AlertRuleRecord>("notifications/rules", {
      token,
      method: "POST",
      body: payload,
    });
  },
  updateAlertRule(token: string, id: string, payload: Record<string, unknown>) {
    return request<AlertRuleRecord>(`notifications/rules/${id}`, {
      token,
      method: "PUT",
      body: payload,
    });
  },
  deleteAlertRule(token: string, id: string) {
    return request<void>(`notifications/rules/${id}`, { token, method: "DELETE" });
  },
  getOrganizations(token: string) {
    return request<OrganizationRecord[]>("organizations", { token });
  },
  getOrganization(token: string, id: string) {
    return request<OrganizationRecord>(`organizations/${id}`, { token });
  },
  createOrganization(token: string, payload: Record<string, unknown>) {
    return request<OrganizationRecord>("organizations", { token, method: "POST", body: payload });
  },
  updateOrganization(token: string, id: string, payload: Record<string, unknown>) {
    return request<OrganizationRecord>(`organizations/${id}`, {
      token,
      method: "PUT",
      body: payload,
    });
  },
  assignDepartmentToOrganization(token: string, id: string, departmentId: string) {
    return request<void>(`organizations/${id}/departments/${departmentId}`, {
      token,
      method: "PUT",
    });
  },
  removeDepartmentFromOrganization(token: string, id: string, departmentId: string) {
    return request<void>(`organizations/${id}/departments/${departmentId}`, {
      token,
      method: "DELETE",
    });
  },
  deleteOrganization(token: string, id: string) {
    return request<void>(`organizations/${id}`, { token, method: "DELETE" });
  },
  getDashboards(token: string) {
    return request<DashboardRecord[]>("dashboards", { token });
  },
  getDashboardById(token: string, id: string) {
    return request<DashboardRecord>(`dashboards/${id}`, { token });
  },
  createDashboard(token: string, payload: Record<string, unknown>) {
    return request<DashboardRecord>("dashboards", { token, method: "POST", body: payload });
  },
  updateDashboard(token: string, id: string, payload: Record<string, unknown>) {
    return request<DashboardRecord>(`dashboards/${id}`, { token, method: "PUT", body: payload });
  },
  addDashboardWidget(token: string, dashboardId: string, payload: Record<string, unknown>) {
    return request<DashboardRecord["widgets"][number]>(`dashboards/${dashboardId}/widgets`, {
      token,
      method: "POST",
      body: payload,
    });
  },
  updateDashboardWidget(token: string, widgetId: string, payload: Record<string, unknown>) {
    return request<DashboardRecord["widgets"][number]>(`dashboards/widgets/${widgetId}`, {
      token,
      method: "PUT",
      body: payload,
    });
  },
  reorderDashboardWidgets(token: string, dashboardId: string, widgetIds: string[]) {
    return request<void>(`dashboards/${dashboardId}/widgets/reorder`, {
      token,
      method: "PATCH",
      body: { widgetIds },
    });
  },
  deleteDashboardWidget(token: string, widgetId: string) {
    return request<void>(`dashboards/widgets/${widgetId}`, {
      token,
      method: "DELETE",
    });
  },
  deleteDashboard(token: string, id: string) {
    return request<void>(`dashboards/${id}`, { token, method: "DELETE" });
  },
  getAiProviders(token: string) {
    return request<AIProvider[]>("ai/providers", { token });
  },
  searchAiModels(token: string, provider: string, search?: string) {
    return request<AIModel[]>(`ai/providers/${provider}/models`, {
      token,
      query: { search, limit: 30 },
    });
  },
  testAiProvider(token: string, provider: string, model?: string, prompt?: string) {
    return request<AIProviderTestResult>(`ai/providers/${provider}/test`, {
      token,
      method: "POST",
      body: { model, prompt },
    });
  },
  chat(token: string, message: string, provider?: string, model?: string) {
    return request<ChatResponse>("ai/chat", {
      token,
      method: "POST",
      body: { message, provider, model },
    });
  },
  getAiBurnoutRisk(token: string, departmentId?: string | null) {
    return request<Array<Record<string, unknown>>>("ai/burnout-risk", {
      token,
      query: { departmentId: departmentId ?? undefined },
    });
  },
  getAiInsights(token: string, projectId: string) {
    return request<string[]>(`ai/insights/${projectId}`, { token });
  },
  getAiProjectHealth(token: string, projectId: string) {
    return request<ProjectHealth>(`ai/project-health/${projectId}`, { token });
  },
  optimizeResources(token: string, projectId: string) {
    return request<Record<string, unknown>>(`ai/optimize-resources/${projectId}`, {
      token,
      method: "POST",
    });
  },
  getTaskDelay(token: string, taskId: string) {
    return request<DelayPrediction>(`ai/predict-delay/${taskId}`, { token });
  },
  downloadReport(
    token: string,
    path: string,
    options?: { method?: string; body?: Record<string, unknown>; format?: string },
  ) {
    return request<Blob>(path, {
      token,
      method: options?.method ?? "GET",
      body: options?.body ?? null,
      query: { format: options?.format ?? "pdf" },
    });
  },
  getAISettings(token: string) {
    return request<AISettingsResponse>("ai/settings", { token });
  },
  saveAISettings(token: string, settings: AISettingsRequest) {
    return request<{ success: boolean; message: string }>("ai/settings", {
      token,
      method: "POST",
      body: settings,
    });
  },
};
