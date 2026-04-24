import { useEffect, useState } from "react";
import { api } from "../../../api";
import type { Milestone, Project, Task, User } from "../../../types";

type TaskWorkspaceState = {
  projects: Project[];
  users: User[];
  milestones: Milestone[];
  tasks: Task[];
  loading: boolean;
  error: string;
};

export function useTaskWorkspace(token?: string | null, selectedProjectId?: string, refreshKey = 0) {
  const [state, setState] = useState<TaskWorkspaceState>({
    projects: [],
    users: [],
    milestones: [],
    tasks: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    Promise.all([api.getProjects(token), api.getAvailableUsers(token)])
      .then(async ([projects, users]) => {
        const projectId = selectedProjectId || projects[0]?.id;
        const milestones = projectId ? await api.getMilestonesByProject(token, projectId) : [];
        const tasks = projectId ? await api.getTasksByProject(token, projectId) : [];
        if (!active) {
          return;
        }
        setState({ projects, users, milestones, tasks, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load tasks.",
        }));
      });

    return () => {
      active = false;
    };
  }, [token, selectedProjectId, refreshKey]);

  return state;
}
