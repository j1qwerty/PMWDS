import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { demoWorkspace } from "./demoData";
import type { Filters, Task, WorkspaceData } from "./types";
import { applyWorkspaceFilters, roleScope } from "./utils";

export const defaultFilters: Filters = {
  organizationId: "",
  departmentId: "",
  projectId: "",
  milestoneId: "",
  taskId: "",
  status: "",
  search: "",
  sortBy: "name",
};

export function useWorkspace(filters: Filters) {
  const { auth } = useAuth();
  const [data, setData] = useState<WorkspaceData>(demoWorkspace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!auth) return;
    if (auth.token === "demo-token") {
      setData(demoWorkspace);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [organizations, departments, projects, users] = await Promise.all([
        api.getOrganizations(auth.token),
        api.getDepartments(auth.token),
        api.getProjects(auth.token),
        api.getUsers(auth.token),
      ]);
      const milestoneLists = await Promise.all(projects.map((project) => api.getMilestonesByProject(auth.token, project.id).catch(() => [])));
      const taskLists = await Promise.all(projects.map((project) => api.getTasksByProject(auth.token, project.id).catch(() => [])));
      setData({
        source: "api",
        organizations,
        departments,
        projects,
        users,
        milestones: milestoneLists.flat(),
        tasks: taskLists.flat(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load workspace. Showing demo data.");
      setData(demoWorkspace);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const scope = useMemo(
    () => roleScope(auth?.userId, auth?.roles, data.users, data.departments),
    [auth?.userId, auth?.roles, data.users, data.departments],
  );

  const filtered = useMemo(
    () => applyWorkspaceFilters(data, filters, scope.organizationId),
    [data, filters, scope.organizationId],
  );

  const updateLocalTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id === taskId) return { ...task, ...patch };
        if (task.subTasks?.some((subtask) => subtask.id === taskId)) {
          return {
            ...task,
            subTasks: task.subTasks.map((subtask) => (subtask.id === taskId ? { ...subtask, ...patch } : subtask)),
          };
        }
        return task;
      }),
    }));
  }, []);

  const updateProgress = useCallback(
    async (taskId: string, progress: number, notes?: string) => {
      const isSubtask = data.tasks.some((task) => task.subTasks?.some((subtask) => subtask.id === taskId));
      updateLocalTask(taskId, { progressPercentage: progress });
      if (!auth || auth.token === "demo-token") return;
      if (isSubtask) await api.updateSubtaskProgress(auth.token, taskId, progress, notes);
      else await api.updateTaskProgress(auth.token, taskId, progress, notes);
      await load();
    },
    [auth, data.tasks, load, updateLocalTask],
  );

  const addComment = useCallback(
    async (taskId: string, content: string) => {
      if (!content.trim()) return;
      const comment = {
        id: `local-${Date.now()}`,
        taskId,
        userId: auth?.userId ?? "local",
        content,
        createdDate: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id === taskId) return { ...task, comments: [...(task.comments ?? []), comment] };
          if (task.subTasks?.some((subtask) => subtask.id === taskId)) {
            return {
              ...task,
              subTasks: task.subTasks.map((subtask) =>
                subtask.id === taskId ? { ...subtask, comments: [...(subtask.comments ?? []), comment] } : subtask,
              ),
            };
          }
          return task;
        }),
      }));
      if (!auth || auth.token === "demo-token") return;
      await api.addTaskComment(auth.token, taskId, content);
      await load();
    },
    [auth, load],
  );

  const updateStatus = useCallback(
    async (taskId: string, status: string) => {
      const isSubtask = data.tasks.some((task) => task.subTasks?.some((subtask) => subtask.id === taskId));
      updateLocalTask(taskId, { status });
      if (!auth || auth.token === "demo-token") return;
      if (isSubtask) await api.updateSubtaskStatus(auth.token, taskId, status);
      else await api.updateTaskStatus(auth.token, taskId, status);
      await load();
    },
    [auth, data.tasks, load, updateLocalTask],
  );

  return {
    data,
    filtered,
    scope,
    loading,
    error,
    reload: load,
    updateProgress,
    addComment,
    updateStatus,
  };
}
