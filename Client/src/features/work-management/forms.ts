import type { Milestone, Project, Task } from "../../types";

export type ProjectFormState = {
  projectCode: string;
  name: string;
  description: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedBudget: number;
  departmentId: string;
  projectManagerId: string;
  priority: string;
};

export type MilestoneFormState = {
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  order: number;
  isCritical: boolean;
  progressPercentage: number;
};

export type TaskFormState = {
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  projectId: string;
  milestoneId: string;
  parentTaskId: string;
  assignedToUserId: string;
  priority: string;
};

export function createProjectForm(project?: Project): ProjectFormState {
  return {
    projectCode: project?.projectCode ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    category: project?.category ?? "Operations",
    plannedStartDate: project?.plannedStartDate?.slice(0, 10) ?? "",
    plannedEndDate: project?.plannedEndDate?.slice(0, 10) ?? "",
    plannedBudget: project?.plannedBudget ?? 0,
    departmentId: project?.departmentId ?? "",
    projectManagerId: project?.projectManagerId ?? "",
    priority: project?.priority ?? "Medium",
  };
}

export function createMilestoneForm(projectId: string, milestone?: Milestone): MilestoneFormState {
  return {
    projectId,
    name: milestone?.name ?? "",
    description: milestone?.description ?? "",
    dueDate: milestone?.dueDate?.slice(0, 10) ?? "",
    order: milestone?.order ?? 1,
    isCritical: milestone?.isCritical ?? false,
    progressPercentage: milestone?.progressPercentage ?? 0,
  };
}

export function createTaskForm(projectId: string, task?: Task, parentTaskId = ""): TaskFormState {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    startDate: task?.startDate?.slice(0, 10) ?? "",
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
    estimatedHours: task?.estimatedHours ?? 8,
    projectId: task?.projectId ?? projectId,
    milestoneId: task?.milestoneId ?? "",
    parentTaskId: task?.parentTaskId ?? parentTaskId,
    assignedToUserId: task?.assignedToUserId ?? "",
    priority: task?.priority ?? "Medium",
  };
}
