import { useState } from "react";
import type { Milestone, Project, Task } from "../../shared/types";
import {
  AddButton,
  DetailModal,
  HierarchyFilters,
  KanbanBoard,
  MetricCard,
  PageTitle,
  WorkHierarchy,
} from "../../shared/components";
import { useAuth } from "../../shared/auth";
import { defaultFilters, useWorkspace } from "../../shared/useWorkspace";
import { allTasksFlat } from "../../shared/utils";

export function TasksPage() {
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const workspace = useWorkspace(filters);
  const [colors, setColors] = useColorAssignments();
  const [detail, setDetail] = useState<{
    item: Project | Milestone | Task | null;
    type: "project" | "milestone" | "task" | "subtask";
  }>({ item: null, type: "task" });

  const flatTasks = allTasksFlat(workspace.filtered.tasks);
  const completed = flatTasks.filter((task) => task.status === "Completed").length;
  const delayed = flatTasks.filter((task) => task.status === "Delayed" || task.isOverdue).length;
  const average = flatTasks.length
    ? Math.round(flatTasks.reduce((sum, task) => sum + task.progressPercentage, 0) / flatTasks.length)
    : 0;

  return (
    <>
      <PageTitle
        eyebrow="Tasks"
        title="Task execution"
        description="Update progress, status, comments, and nested subtask details without leaving the list."
        actions={
          <div className="quick-actions">
            <AddButton label="Add Task" />
            <AddButton label="Add Subtask" />
          </div>
        }
      />
      <section className="metric-grid">
        <MetricCard label="All Work Items" value={flatTasks.length} note="Tasks plus subtasks" tone="indigo" />
        <MetricCard label="Completed" value={completed} note="Closed work" tone="green" />
        <MetricCard label="Delayed" value={delayed} note="Needs attention" tone="orange" />
        <MetricCard label="Average Progress" value={`${average}%`} note="Visible work" tone="blue" />
        <MetricCard label="Milestones" value={workspace.filtered.milestones.length} note="Task groups" tone="yellow" />
        <MetricCard label="Projects" value={workspace.filtered.projects.length} note="Parent projects" tone="pink" />
      </section>
      <HierarchyFilters
        organizations={workspace.data.organizations}
        departments={workspace.data.departments}
        projects={workspace.data.projects}
        milestones={workspace.data.milestones}
        tasks={workspace.data.tasks}
        users={workspace.data.users}
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        showOrganization={hasRole("SuperAdmin")}
      />
      <div className="layout-grid">
        <WorkHierarchy
          projects={workspace.filtered.projects}
          milestones={workspace.filtered.milestones}
          tasks={workspace.filtered.tasks}
          users={workspace.data.users}
          departments={workspace.data.departments}
          colors={colors}
          onColor={(id, color) => setColors((current) => ({ ...current, [id]: color }))}
          onProgress={(id, progress, notes) => void workspace.updateProgress(id, progress, notes)}
          onComment={(id, content) => void workspace.addComment(id, content)}
          onStatus={(id, status) => void workspace.updateStatus(id, status)}
          onView={(item, type) => setDetail({ item, type })}
          density="compact"
        />
        <KanbanBoard
          tasks={workspace.filtered.tasks}
          projects={workspace.data.projects}
          users={workspace.data.users}
          onView={(task) => setDetail({ item: task, type: "task" })}
        />
      </div>
      <DetailModal item={detail.item} type={detail.type} onClose={() => setDetail({ item: null, type: "task" })} />
    </>
  );
}

function useColorAssignments() {
  const [value, setValue] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem("pmwds-client2-colors");
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  });
  const setAndStore: typeof setValue = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      localStorage.setItem("pmwds-client2-colors", JSON.stringify(resolved));
      return resolved;
    });
  };
  return [value, setAndStore] as const;
}
