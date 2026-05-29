import { HiOutlineFlag, HiOutlineClipboardList } from "react-icons/hi";
import type { Milestone, Project, Task } from "../../../types";

interface WorkspaceStatsProps {
  project: Project | null;
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
}

export function WorkspaceStats({ project, projects, milestones, tasks }: WorkspaceStatsProps) {
  const rootTasks = tasks.filter((t) => !t.parentTaskId);
  const completed = rootTasks.filter((t) => t.status === "Completed").length;
  const inProgress = rootTasks.filter((t) => t.status === "InProgress").length;
  const criticalMilestones = milestones.filter((m) => m.isCritical).length;

  if (project) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Progress" value={`${Math.round(project.progressPercentage || 0)}%`} subtext={project.status} icon="trending_up" color="indigo" />
        <StatCard label="Milestones" value={milestones.length} subtext={`${criticalMilestones} critical`} icon={<HiOutlineFlag className="h-5 w-5" />} color="violet" />
        <StatCard label="Tasks" value={rootTasks.length} subtext={`${inProgress} in progress`} icon={<HiOutlineClipboardList className="h-5 w-5" />} color="emerald" />
        <StatCard label="Completed" value={completed} subtext={`${rootTasks.length ? Math.round((completed / rootTasks.length) * 100) : 0}% done`} icon="check_circle" color="emerald" />
      </div>
    );
  }

  const avgProgress = projects.length
    ? projects.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / projects.length
    : 0;
  const totalTasks = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const completedTasks = projects.reduce((sum, p) => sum + (p.completedTasks || 0), 0);
  const activeProjects = projects.filter((p) => p.status === "Active").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Projects" value={projects.length} subtext={`${activeProjects} active`} icon="folder" color="indigo" />
      <StatCard label="Avg progress" value={`${Math.round(avgProgress)}%`} subtext="Across filtered projects" icon="trending_up" color="violet" />
      <StatCard label="Total tasks" value={totalTasks} subtext="All projects" icon={<HiOutlineClipboardList className="h-5 w-5" />} color="emerald" />
      <StatCard label="Completed" value={completedTasks} subtext={totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}% done` : "No tasks"} icon="check_circle" color="emerald" />
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "violet";
}) {
  const colorMap = {
    indigo: { text: "text-indigo-600", border: "border-indigo-100" },
    emerald: { text: "text-emerald-600", border: "border-emerald-100" },
    violet: { text: "text-violet-600", border: "border-violet-100" },
  };
  const colors = colorMap[color];

  return (
    <div className={`rounded-xl border ${colors.border} bg-white/90 backdrop-blur-sm p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {typeof icon === "string" ? (
          <span className={`material-symbols-outlined text-lg ${colors.text}`}>{icon}</span>
        ) : (
          <span className={colors.text}>{icon}</span>
        )}
      </div>
      <span className={`text-2xl font-bold ${colors.text}`}>{value}</span>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
  );
}
