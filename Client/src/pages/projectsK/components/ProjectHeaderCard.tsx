import type { Project } from "../../../types";
import { formatDate, formatMoney } from "../../../ui";
import { GlassCard, getStatusColor } from "../../shared";

interface ProjectHeaderCardProps {
  project: Project;
  canManage: boolean;
  onViewProject?: (project: Project) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  /** Render without outer GlassCard wrapper (e.g. inside a modal) */
  bare?: boolean;
}

const statusOptions = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];

export function ProjectHeaderCard({ project, canManage, onViewProject, onEdit, onDelete, onStatusChange, bare }: ProjectHeaderCardProps) {
  const statusColors = getStatusColor(project.status);

  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{project.projectCode}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
              {project.status}
            </span>
            <span className="text-xs text-slate-500">{project.priority} priority</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onViewProject && (
            <button
              title="View project"
              className="p-1.5 text-slate-400 hover:text-cyan-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); onViewProject(project); }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {canManage && onEdit && (
            <button
              title="Edit project"
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {canManage && onDelete && (
            <button type="button" onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete project">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{project.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Info label="Start" value={formatDate(project.plannedStartDate)} />
        <Info label="End" value={formatDate(project.plannedEndDate)} />
        <Info label="Budget" value={formatMoney(project.plannedBudget)} />
        <Info label="Manager" value={project.projectManagerName ?? "—"} />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-700">{Math.round(project.progressPercentage || 0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
            style={{ width: `${Math.min(project.progressPercentage || 0, 100)}%` }}
          />
        </div>
      </div>

      {canManage && onStatusChange && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          {statusOptions.map((status) => {
            const st = getStatusColor(status);
            const isActive = project.status === status;
            const hoverMap: Record<string, string> = {
              NotStarted: "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600",
              InProgress: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600",
              OnHold: "hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600",
              Completed: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600",
              Cancelled: "hover:bg-red-50 hover:border-red-200 hover:text-red-700",
              Delayed: "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700",
            };
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(status)}
                disabled={isActive}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? `${st.bg} ${st.border} ${st.text} cursor-default shadow-sm`
                    : `border-slate-200 text-slate-500 ${hoverMap[status] ?? "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600"}`
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (bare) return <div className="p-5">{content}</div>;
  return <GlassCard className="p-5">{content}</GlassCard>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{value}</p>
    </div>
  );
}
