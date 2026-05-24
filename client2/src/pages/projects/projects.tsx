import { useMemo, useState } from "react";
import type { Milestone, Project, Task } from "../../shared/types";
import {
  AddButton,
  DetailModal,
  HierarchyFilters,
  KanbanBoard,
  MetricCard,
  PageTitle,
  ProgressBar,
  StatusBadge,
  WorkHierarchy,
} from "../../shared/components";
import { useAuth } from "../../shared/auth";
import { defaultFilters, useWorkspace } from "../../shared/useWorkspace";
import { formatDate } from "../../shared/utils";

export function ProjectsPage({ defaultView = "list" }: { defaultView?: "list" | "kanban" }) {
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [view, setView] = useState<"list" | "kanban">(defaultView);
  const workspace = useWorkspace(filters);
  const [colors, setColors] = useColorAssignments();
  const [detail, setDetail] = useState<{
    item: Project | Milestone | Task | null;
    type: "project" | "milestone" | "task" | "subtask";
  }>({ item: null, type: "project" });

  const health = useMemo(() => {
    const total = workspace.filtered.projects.length || 1;
    const delayed = workspace.filtered.projects.filter((project) => project.status === "Delayed").length;
    const averageProgress =
      workspace.filtered.projects.reduce((sum, project) => sum + project.progressPercentage, 0) / total;
    return { delayed, averageProgress: Math.round(averageProgress) };
  }, [workspace.filtered.projects]);

  return (
    <>
      <PageTitle
        eyebrow="Portfolio"
        title="Projects"
        description="A compact project workspace with cascading filters, color assignment, expandable details, and a kanban board."
        actions={
          <div className="quick-actions">
            <AddButton label="Add Project" />
            <AddButton label="Add Milestone" />
            <AddButton label="Add Task" />
            <button className="icon-text-btn" onClick={() => setView(view === "list" ? "kanban" : "list")}>
              {view === "list" ? "Kanban board" : "Compact list"}
            </button>
          </div>
        }
      />
      <section className="metric-grid">
        <MetricCard label="Projects" value={workspace.filtered.projects.length} note="In current scope" tone="green" />
        <MetricCard label="Delayed" value={health.delayed} note="Needs intervention" tone="orange" />
        <MetricCard label="Average Progress" value={`${health.averageProgress}%`} note="Across visible projects" tone="blue" />
        <MetricCard label="Milestones" value={workspace.filtered.milestones.length} note="Filtered checkpoints" tone="yellow" />
        <MetricCard label="Tasks" value={workspace.filtered.tasks.length} note="Visible parent tasks" tone="pink" />
        <MetricCard label="Departments" value={workspace.filtered.departments.length} note="Portfolio owners" tone="indigo" />
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
      {view === "kanban" ? (
        <KanbanBoard
          tasks={workspace.filtered.tasks}
          projects={workspace.data.projects}
          users={workspace.data.users}
          onView={(task) => setDetail({ item: task, type: "task" })}
        />
      ) : (
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
          />
          <ProjectSummary projects={workspace.filtered.projects} colors={colors} onView={(project) => setDetail({ item: project, type: "project" })} />
        </div>
      )}
      <DetailModal item={detail.item} type={detail.type} onClose={() => setDetail({ item: null, type: "project" })} />
    </>
  );
}

function ProjectSummary({
  projects,
  colors,
  onView,
}: {
  projects: Project[];
  colors: Record<string, string>;
  onView: (project: Project) => void;
}) {
  return (
    <section className="settings-card">
      <h3>Project details</h3>
      {projects.map((project) => (
        <button className="kanban-card" key={project.id} onClick={() => onView(project)}>
          <strong>{project.name}</strong>
          <p>{project.description ?? project.projectCode}</p>
          <div>
            <StatusBadge status={project.status} />
            <span>{formatDate(project.plannedEndDate)}</span>
          </div>
          <ProgressBar value={project.progressPercentage} color={colors[project.id]} />
        </button>
      ))}
    </section>
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
