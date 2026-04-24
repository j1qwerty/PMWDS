import type { Milestone, Task } from "../../types";

export function filterProjects<T extends { name: string; status: string; departmentId?: string | null }>(
  items: T[],
  search: string,
  status: string,
  departmentId: string,
) {
  const query = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch = !query || item.name.toLowerCase().includes(query);
    const matchesStatus = !status || item.status === status;
    const matchesDepartment = !departmentId || item.departmentId === departmentId;
    return matchesSearch && matchesStatus && matchesDepartment;
  });
}

export function filterTasks(tasks: Task[], filters: Record<string, string>) {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesSearch = !query || task.title.toLowerCase().includes(query);
    const matchesStatus = !filters.status || task.status === filters.status;
    const matchesPriority = !filters.priority || task.priority === filters.priority;
    const matchesAssignee = !filters.assigneeId || task.assignedToUserId === filters.assigneeId;
    const matchesMilestone = !filters.milestoneId || task.milestoneId === filters.milestoneId;
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesMilestone;
  });
}

export function groupTasksByMilestone(tasks: Task[], milestones: Milestone[]) {
  return milestones.map((milestone) => ({
    milestone,
    tasks: tasks.filter((task) => task.milestoneId === milestone.id && !task.parentTaskId),
  }));
}

export function getStandaloneTasks(tasks: Task[]) {
  return tasks.filter((task) => !task.milestoneId && !task.parentTaskId);
}

export function getChildTasks(tasks: Task[], parentTaskId: string) {
  return tasks.filter((task) => task.parentTaskId === parentTaskId);
}
