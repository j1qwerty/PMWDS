import type { Department, Filters, Project, Role, Task, User, WorkspaceData } from "./types";

export const statuses = ["NotStarted", "InProgress", "Completed", "Delayed", "OnHold", "Cancelled"];
export const palette = ["#6366f1", "#3b82f6", "#22c55e", "#f97316", "#ec4899", "#eab308", "#14b8a6", "#ef4444"];

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name?: string | null) {
  return (name ?? "NA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function canUseRole(userRoles: readonly string[] | undefined, allow?: readonly Role[]) {
  if (!allow?.length) return true;
  if (!userRoles?.length) return false;
  return allow.some((role) => userRoles.includes(role));
}

export function roleScope(authUserId: string | undefined, roles: Role[] | undefined, users: User[], departments: Department[]) {
  const isGlobal = canUseRole(roles, ["SuperAdmin"]);
  if (isGlobal || !authUserId) return { isGlobal, organizationId: "" };
  const user = users.find((item) => item.id === authUserId);
  const primary = user?.departments?.find((department) => department.isPrimary);
  const organizationId =
    user?.organizationId ??
    primary?.organizationId ??
    departments.find((department) => department.id === user?.departmentId)?.organizationId ??
    "";
  return { isGlobal, organizationId };
}

export function projectOrganizationId(project: Project, departments: Department[]) {
  return departments.find((department) => department.id === project.departmentId)?.organizationId ?? "";
}

export function taskChildren(task: Task) {
  return task.subTasks ?? [];
}

export function allTasksFlat(tasks: Task[]) {
  return tasks.flatMap((task) => [task, ...taskChildren(task)]);
}

export function applyWorkspaceFilters(data: WorkspaceData, filters: Filters, scopedOrganizationId = "") {
  const search = filters.search.trim().toLowerCase();
  const organizationId = filters.organizationId || scopedOrganizationId;

  let departments = data.departments;
  if (organizationId) departments = departments.filter((department) => department.organizationId === organizationId);
  if (filters.departmentId) departments = departments.filter((department) => department.id === filters.departmentId);

  const departmentIds = new Set(departments.map((department) => department.id));
  let projects = data.projects.filter((project) => departmentIds.has(project.departmentId));
  if (filters.projectId) projects = projects.filter((project) => project.id === filters.projectId);
  if (filters.status) projects = projects.filter((project) => project.status === filters.status || !filters.projectId);

  const projectIds = new Set(projects.map((project) => project.id));
  let milestones = data.milestones.filter((milestone) => projectIds.has(milestone.projectId));
  if (filters.milestoneId) milestones = milestones.filter((milestone) => milestone.id === filters.milestoneId);
  if (filters.status) milestones = milestones.filter((milestone) => milestone.status === filters.status || !filters.milestoneId);

  const milestoneIds = new Set(milestones.map((milestone) => milestone.id));
  let tasks = data.tasks.filter((task) => projectIds.has(task.projectId));
  if (filters.milestoneId) tasks = tasks.filter((task) => task.milestoneId && milestoneIds.has(task.milestoneId));
  if (filters.taskId) tasks = tasks.filter((task) => task.id === filters.taskId);
  if (filters.status) {
    tasks = tasks.filter(
      (task) =>
        task.status === filters.status ||
        task.subTasks?.some((subtask) => subtask.status === filters.status),
    );
  }

  if (search) {
    const matches = (value?: string | null) => value?.toLowerCase().includes(search);
    projects = projects.filter((project) => matches(project.name) || matches(project.projectCode) || matches(project.description));
    const visibleProjectIds = new Set(projects.map((project) => project.id));
    milestones = milestones.filter(
      (milestone) => visibleProjectIds.has(milestone.projectId) || matches(milestone.name) || matches(milestone.description),
    );
    tasks = tasks.filter((task) => {
      const project = data.projects.find((item) => item.id === task.projectId);
      const milestone = data.milestones.find((item) => item.id === task.milestoneId);
      return (
        matches(task.title) ||
        matches(task.description) ||
        matches(project?.name) ||
        matches(milestone?.name) ||
        task.subTasks?.some((subtask) => matches(subtask.title) || matches(subtask.description))
      );
    });
  }

  const sorters = {
    name: (a: { name?: string; title?: string }, b: { name?: string; title?: string }) =>
      (a.name ?? a.title ?? "").localeCompare(b.name ?? b.title ?? ""),
    progress: (a: { progressPercentage: number }, b: { progressPercentage: number }) =>
      b.progressPercentage - a.progressPercentage,
    dueDate: (a: { dueDate?: string }, b: { dueDate?: string }) =>
      new Date(a.dueDate ?? "2999-01-01").getTime() - new Date(b.dueDate ?? "2999-01-01").getTime(),
    status: (a: { status: string }, b: { status: string }) => a.status.localeCompare(b.status),
  };
  const sorter = sorters[filters.sortBy];

  return {
    organizations: organizationId
      ? data.organizations.filter((organization) => organization.id === organizationId)
      : data.organizations,
    departments,
    projects: [...projects].sort(sorter as (a: Project, b: Project) => number),
    milestones: [...milestones].sort(sorter as (a: { progressPercentage: number; status: string }, b: { progressPercentage: number; status: string }) => number),
    tasks: [...tasks].sort(sorter as (a: Task, b: Task) => number),
  };
}
