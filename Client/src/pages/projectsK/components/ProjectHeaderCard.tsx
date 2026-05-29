import type { Project } from "../../../types";
import { formatDate, formatMoney } from "../../../ui";
import { GlassCard, getStatusColor } from "../../shared";

interface ProjectHeaderCardProps {
  project: Project;
  canManage: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  /** Render without outer GlassCard wrapper (e.g. inside a modal) */
  bare?: boolean;
}

const statusOptions = ["Planning", "Active", "OnHold", "Completed", "Cancelled"];

export function ProjectHeaderCard({ project, canManage, onEdit, onDelete, onStatusChange, bare }: ProjectHeaderCardProps) {
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
        {canManage && (
          <div className="flex gap-2">
            {onEdit && (
              <button type="button" onClick={onEdit} className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50">
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50">
                Delete
              </button>
            )}
          </div>
        )}
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
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              disabled={project.status === status}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                project.status === status
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-indigo-200"
              }`}
            >
              {status}
            </button>
          ))}
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
