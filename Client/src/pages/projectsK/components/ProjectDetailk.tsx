import type { Project, ProjectHealth, User } from "../../../types";
import { useMemo } from "react";
import { ProjectBasicDetails } from "./ProjectBasicDetails";
import { AIInsightsSection } from "./AIInsightsSection";
import { MilestonesTab } from "../../shared/MilestonesTab";
import { DocumentsSection } from "./DocumentsSection";

interface ProjectDetailkProps {
  project: Project | null;
  health: ProjectHealth | null;
  insights: string[];
  canManageProjects: boolean;
  onStatusChange: (status: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  formatMoney: (amount: number) => string;
  authToken?: string | null;
  users?: User[];
}

function normalizePercent(value?: number | null) {
  if (value == null) return null;
  return Math.min(Math.round(value > 1 ? value : value * 100), 100);
}

export function ProjectDetailk({
  project,
  health,
  canManageProjects,
  onStatusChange,
  onEdit,
  onDelete,
  formatMoney,
  authToken,
  users = [],
}: ProjectDetailkProps) {
  const healthScore = normalizePercent(project?.aiHealthScore);
  const delayRisk = normalizePercent(project?.aiDelayRiskScore);
  const progress = project?.progressPercentage || 0;
  const manager = useMemo(
    () => users.find((user) => user.id === project?.projectManagerId),
    [users, project?.projectManagerId]
  );

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white/50">
        <span className="material-symbols-outlined text-5xl mb-3">folder_open</span>
        <p className="text-sm font-medium">Select or create a project</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ProjectBasicDetails
        project={project}
        canManage={canManageProjects}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        users={users}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MilestonesTab
          key={project.id}
          projectId={project.id}
          authToken={authToken ?? undefined}
        />
        <AIInsightsSection
          project={project}
          progress={progress}
          healthScore={healthScore}
          delayRisk={delayRisk}
          manager={manager}
          formatMoney={formatMoney}
        />
      </div>
    </div>
  );
}
