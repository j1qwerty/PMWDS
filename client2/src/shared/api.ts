import type {
  AuthResponse,
  Department,
  Milestone,
  Organization,
  Project,
  Task,
  User,
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
  getMilestonesByProject(token: string, projectId: string) {
    return request<Milestone[]>(`milestones/by-project/${projectId}`, { token });
  },
  getTasksByProject(token: string, projectId: string) {
    return request<Task[]>(`tasks/by-project/${projectId}`, { token });
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
};
