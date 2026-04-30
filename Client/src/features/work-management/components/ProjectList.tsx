import { StatusBadge } from "../../../components/common/StatusBadge";
import type { Project } from "../../../types";
import { classNames, EmptyState, formatDate, formatMoney, formatPercent, selectedCardClass } from "../../../ui";

type ProjectListProps = {
  projects: Project[];
  selectedId: string;
  onSelect: (projectId: string) => void;
};

export function ProjectList({ projects, selectedId, onSelect }: ProjectListProps) {
  if (!projects.length) {
    return <EmptyState title="No projects found" description="Adjust filters or create a project to start portfolio tracking." />;
  }

  return (
    <div className="grid max-h-[720px] grid-cols-1 gap-4 overflow-y-auto pr-1 xl:grid-cols-2">
      {projects.map((project) => (
        <button
          key={project.id}
          className={classNames(
            "group rounded-xl border border-transparent bg-white/[0.04] p-5 text-left shadow-lg shadow-black/15 transition duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-black/25",
            selectedId === project.id && selectedCardClass,
          )}
          onClick={() => onSelect(project.id)}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-sky-200 uppercase">{project.projectCode}</span>
                <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-amber-200 uppercase">{project.priority}</span>
              </div>
              <strong className="block truncate text-lg font-semibold text-white transition group-hover:text-sky-200">{project.name}</strong>
              <span className="mt-1 block text-sm text-slate-400">{project.projectManagerName || "No manager assigned"}</span>
            </div>
            <StatusBadge label={project.status} tone={project.status === "Completed" ? "success" : project.status === "Delayed" ? "danger" : "info"} />
          </div>
          <div className="mb-4 rounded-lg border border-white/8 bg-black/15 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-400">Timeline progress</span>
              <strong className="text-white">{formatPercent(project.progressPercentage)}</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-teal-200" style={{ width: `${Math.min(100, Math.max(0, project.progressPercentage ?? 0))}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/[0.035] p-2">
              <span className="block text-[0.62rem] font-semibold tracking-[0.14em] text-slate-500 uppercase">Health</span>
              <strong className="text-sm text-teal-200">{formatPercent(project.aiHealthScore)}</strong>
            </div>
            <div className="rounded-lg bg-white/[0.035] p-2">
              <span className="block text-[0.62rem] font-semibold tracking-[0.14em] text-slate-500 uppercase">Budget</span>
              <strong className="text-sm text-white">{formatMoney(project.plannedBudget)}</strong>
            </div>
            <div className="rounded-lg bg-white/[0.035] p-2">
              <span className="block text-[0.62rem] font-semibold tracking-[0.14em] text-slate-500 uppercase">Due</span>
              <strong className="text-sm text-white">{formatDate(project.plannedEndDate)}</strong>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
