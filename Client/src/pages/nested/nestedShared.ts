import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { Department, Milestone, MilestoneDependency, Project, Task, User } from "../../types";
import { projectBelongsToAnyDepartment } from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";

export interface ProjectWorkspaceData {
  project: Project | null;
  milestones: Milestone[];
  tasks: Task[];
  users: User[];
  dependencies: MilestoneDependency[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useProjectWorkspace(): ProjectWorkspaceData {
  const { projectId } = useParams<{ projectId: string }>();
  const { auth } = useAuth();
  const { data } = useAppData();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(
    users.length ? users : data.users,
    departments.length ? departments : data.departments,
  );

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<MilestoneDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleProject = useMemo(() => {
    if (!project) return null;
    if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = (departments.length ? departments : data.departments)
        .filter((d) => d.organizationId === userOrganizationId)
        .map((d) => d.id);
      if (!projectBelongsToAnyDepartment(project, orgDeptIds)) return null;
    }
    return project;
  }, [project, data.departments, departments, shouldFilterByOrg, userOrganizationId]);

  const load = async () => {
    if (!auth || !projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [projectData, milestoneData, taskData, dependencyData, userData, departmentData] = await Promise.all([
        api.getProject(auth.token, projectId).catch(() => {
          return data.projects.find((p) => p.id === projectId) ?? null;
        }),
        api.getMilestonesByProject(auth.token, projectId),
        api.getTasksByProject(auth.token, projectId),
        api.getMilestoneDependencies(auth.token, projectId),
        api.getUsers(auth.token).catch(() => data.users),
        api.getDepartments(auth.token).catch(() => data.departments),
      ]);
      setProject(projectData);
      setMilestones(milestoneData);
      setTasks(taskData);
      setDependencies(dependencyData);
      setUsers(userData);
      setDepartments(departmentData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, projectId]);

  return {
    project: visibleProject,
    milestones,
    tasks,
    users: users.length ? users : data.users,
    dependencies,
    loading,
    error,
    refresh: load,
  };
}

export function filterProjectsByUserScope(
  projects: Project[],
  departments: { id: string; organizationId?: string | null }[],
  userOrganizationId: string | null,
  shouldFilterByOrg: boolean,
): Project[] {
  if (!shouldFilterByOrg || !userOrganizationId) return projects;
  const orgDeptIds = departments
    .filter((d) => d.organizationId === userOrganizationId)
    .map((d) => d.id);
  return projects.filter((p) => projectBelongsToAnyDepartment(p, orgDeptIds));
}
