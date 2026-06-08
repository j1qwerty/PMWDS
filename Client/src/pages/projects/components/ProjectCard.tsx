import { classNames } from "../../../ui";
import type { Department, OrganizationRecord, Project, User } from "../../../types";
import { AvatarStack, getProjectDepartments } from "../../shared";

interface ProjectCardProps {
  project: Project;
  departments: Department[];
  organizations: OrganizationRecord[];
  users: User[];
  selectedProjectId: string;
  onSelect: (id: string) => void;
}

export function ProjectCard({ project, departments, organizations, users, selectedProjectId, onSelect }: ProjectCardProps) {
  const projProgress = Math.min(Math.round(project.progressPercentage || 0), 100);
  const rawHealth = project.aiHealthScore ?? null;
  const projHealth = rawHealth == null ? null : Math.min(Math.round(rawHealth > 1 ? rawHealth : rawHealth * 100), 100);
  const isSelected = project.id === selectedProjectId;
  const assignedDepartments = getProjectDepartments(project, departments);
  const department = assignedDepartments[0] ?? departments.find((item) => item.id === project.departmentId);
  const organization = organizations.find((item) => item.id === department?.organizationId);
  const departmentLabel = assignedDepartments.length > 1
    ? `${assignedDepartments[0].name} +${assignedDepartments.length - 1}`
    : department?.name || "No department";

  const getStatusStyles = (status: string) => {
    const styles: Record<string, {
      label: string;
      dot: string;
      border: string;
      borderSelected: string;
      progressColor: string;
      bgHover: string;
      bgSelected: string;
      textColor: string;
      shadow: string;
    }> = {
      NotStarted: {
        label: "Not Started", dot: "bg-slate-400", border: "border-slate-200",
        borderSelected: "border-slate-400",
        progressColor: "stroke-slate-400", bgHover: "hover:bg-slate-50",
        bgSelected: "bg-slate-50", textColor: "text-slate-600",
        shadow: "shadow-sm hover:shadow-md",
      },
      InProgress: {
        label: "On Track", dot: "bg-primary", border: "border-outline-variant/30",
        borderSelected: "border-primary", 
        progressColor: "stroke-primary", bgHover: "hover:bg-primary/5",
        bgSelected: "", textColor: "text-primary",
        shadow: "shadow-sm hover:shadow-md",
      },
      Completed: {
        label: "Completed", dot: "bg-emerald-500", border: "border-emerald-200",
        borderSelected: "border-emerald-400",
        progressColor: "stroke-emerald-500", bgHover: "hover:bg-emerald-50",
        bgSelected: "bg-emerald-50", textColor: "text-emerald-700",
        shadow: "shadow-sm hover:shadow-md",
      },
      Delayed: {
        label: "At Risk", dot: "bg-error", border: "border-error/20",
        borderSelected: "border-error",
        progressColor: "stroke-error", bgHover: "hover:bg-error/5",
        bgSelected: "bg-error/5", textColor: "text-error",
        shadow: "shadow-sm hover:shadow-md",
      },
      OnHold: {
        label: "On Hold", dot: "bg-amber-500", border: "border-amber-200",
        borderSelected: "border-amber-400",
        progressColor: "stroke-amber-500", bgHover: "hover:bg-amber-50",
        bgSelected: "bg-amber-50", textColor: "text-amber-700",
        shadow: "shadow-sm hover:shadow-md",
      },
      Cancelled: {
        label: "Cancelled", dot: "bg-slate-400", border: "border-slate-100",
        borderSelected: "border-slate-300",
        progressColor: "stroke-slate-400", bgHover: "hover:bg-slate-50",
        bgSelected: "bg-slate-50", textColor: "text-slate-500",
        shadow: "shadow-sm hover:shadow-md",
      },
    };
    return styles[status] || styles.NotStarted;
  };

  const statusStyle = getStatusStyles(project.status);
  const manager = users.find((user) => user.id === project.projectManagerId);
  const projectPeople = project.projectManagerId || project.projectManagerName
    ? [{
      id: project.projectManagerId || project.id,
      fullName: manager?.fullName || project.projectManagerName || "Project Manager",
      userId: project.projectManagerId,
      profilePictureUrl: manager?.profilePictureUrl ?? null,
    }]
    : [];
  const getHealthColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 50) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div
      key={project.id}
      onClick={() => onSelect(project.id)}
      className={classNames(
        "p-md rounded-xl cursor-pointer relative overflow-hidden group border shadow-sm transition-all duration-200",
        isSelected
          ? `${statusStyle.borderSelected} ${statusStyle.bgSelected} shadow-md `
          : `${statusStyle.border} bg-white ${statusStyle.shadow}`,
        statusStyle.bgHover,
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col min-w-0 flex-1 mr-3">
          <span className={`text-[10px] font-bold tracking-widest ${statusStyle.textColor}`}>
            {project.id}
          </span>
          <h3 className="text-lg font-bold text-on-surface truncate">
            {project.name}
          </h3>
          <span className="mt-1 truncate text-[11px] font-medium text-slate-400">
            {departmentLabel} {organization ? `- ${organization.name}` : ""}
          </span>
        </div>

        <div className="size-12 relative flex items-center justify-center flex-shrink-0">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
            <circle
              className={`${statusStyle.progressColor} transition-all duration-700`}
              cx="18" cy="18" fill="none" r="16"
              strokeDasharray="100"
              strokeDashoffset={100 - projProgress}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span className={`absolute text-[10px] font-bold ${statusStyle.textColor}`}>
            {projProgress}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-on-surface-variant mb-4">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${statusStyle.dot} ${project.status === 'Delayed' ? 'animate-pulse' : ''}`} />
          <span className={`font-medium ${statusStyle.textColor}`}>{statusStyle.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span className="truncate">
            {project.plannedStartDate && project.plannedEndDate
              ? `${new Date(project.plannedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(project.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : "No dates set"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3">
        {projectPeople.length > 0 ? (
          <AvatarStack people={projectPeople} limit={3} size="sm" />
        ) : (
          <span className="text-[10px] font-semibold text-outline">No manager</span>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-outline">Health</span>
          {projHealth != null ? (
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getHealthColor(projHealth)}`}>
              {projHealth}%
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">N/A</div>
          )}
        </div>
      </div>
    </div>
  );
}
