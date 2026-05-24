import { useMemo, useState } from "react";
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

export function DashboardPage() {
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const workspace = useWorkspace(filters);
  const [colors, setColors] = useLocalRecord("pmwds-client2-colors");
  const [detail, setDetail] = useState<{
    item: Project | Milestone | Task | null;
    type: "project" | "milestone" | "task" | "subtask";
  }>({ item: null, type: "project" });

  const flatTasks = allTasksFlat(workspace.filtered.tasks);
  const metrics = useMemo(
    () => [
      { label: "Organizations", value: workspace.filtered.organizations.length, note: "Visible in current role scope", tone: "indigo" },
      { label: "Departments", value: workspace.filtered.departments.length, note: "Filtered by organization", tone: "blue" },
      { label: "Projects", value: workspace.filtered.projects.length, note: "Project portfolio", tone: "green" },
      { label: "Milestones", value: workspace.filtered.milestones.length, note: "Delivery checkpoints", tone: "yellow" },
      { label: "Tasks", value: workspace.filtered.tasks.length, note: "Parent tasks", tone: "orange" },
      { label: "Subtasks", value: flatTasks.length - workspace.filtered.tasks.length, note: "Nested work items", tone: "pink" },
    ],
    [workspace.filtered, flatTasks.length],
  );

  return (
    <>
      <PageTitle
        eyebrow={workspace.data.source === "demo" ? "Demo data" : "Live data"}
        title="Dashboard"
        description="Role-aware project control across organizations, departments, projects, milestones, tasks, and subtasks."
        actions={
          <div className="quick-actions">
            {["Organization", "Department", "Project", "Milestone", "Task", "Subtask"].map((label) => (
              <AddButton key={label} label={`Add ${label}`} />
            ))}
          </div>
        }
      />
      {workspace.error ? <p className="message-line">{workspace.error}</p> : null}
      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
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
      <DetailModal item={detail.item} type={detail.type} onClose={() => setDetail({ item: null, type: "project" })} />
    </>
  );
}

function useLocalRecord(key: string) {
  const [value, setValue] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  });

  const setAndStore: typeof setValue = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };

  return [value, setAndStore] as const;
}
