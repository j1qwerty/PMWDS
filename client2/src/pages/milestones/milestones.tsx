import { useState } from "react";
import type { Filters, Milestone, Project, Task } from "../../shared/types";
import { AddButton, DetailModal, HierarchyFilters, PageTitle, WorkHierarchy } from "../../shared/components";
import { useAuth } from "../../shared/auth";
import { defaultFilters, useWorkspace } from "../../shared/useWorkspace";

export function MilestonesPage() {
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, sortBy: "dueDate" });
  const workspace = useWorkspace(filters);
  const [colors, setColors] = useColorAssignments();
  const [detail, setDetail] = useState<{
    item: Project | Milestone | Task | null;
    type: "project" | "milestone" | "task" | "subtask";
  }>({ item: null, type: "milestone" });

  return (
    <>
      <PageTitle
        eyebrow="Milestones"
        title="Milestone control"
        description="Click a milestone to expand details, then expand each task or subtask to update status, progress, and comments."
        actions={
          <div className="quick-actions">
            <AddButton label="Add Milestone" />
            <AddButton label="Add Task" />
          </div>
        }
      />
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
      <DetailModal item={detail.item} type={detail.type} onClose={() => setDetail({ item: null, type: "milestone" })} />
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
