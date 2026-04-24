import { useEffect, useState } from "react";
import { api } from "../../../api";
import type { Department, Milestone, Project, User } from "../../../types";

type WorkspaceState = {
  projects: Project[];
  departments: Department[];
  users: User[];
  milestones: Milestone[];
  loading: boolean;
  error: string;
};

export function useProjectWorkspace(token?: string | null, selectedProjectId?: string, refreshKey = 0) {
  const [state, setState] = useState<WorkspaceState>({
    projects: [],
    departments: [],
    users: [],
    milestones: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    Promise.all([api.getProjects(token), api.getDepartments(token), api.getAvailableUsers(token)])
      .then(async ([projects, departments, users]) => {
        const milestoneProjectId = selectedProjectId || projects[0]?.id;
        const milestones = milestoneProjectId ? await api.getMilestonesByProject(token, milestoneProjectId) : [];
        if (!active) {
          return;
        }
        setState({ projects, departments, users, milestones, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load workspace.",
        }));
      });

    return () => {
      active = false;
    };
  }, [token, selectedProjectId, refreshKey]);

  return state;
}
