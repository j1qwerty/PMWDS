import { GlassCard } from "../shared";

interface ReportGeneratorProps {
  filters: {
    projectId: string;
    departmentId: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  onDownloadProjectStatus: () => void;
  onDownloadBudgetVariance: () => void;
  onDownloadTaskCompletion: () => void;
  onDownloadDepartmentWorkload: () => void;
  onDownloadDelayAnalysis: () => void;
}

const REPORT_TYPES = [
  {
    id: "project-status",
    title: "Project Status",
    description: "Overall project health, progress, and milestone tracking",
    icon: "monitoring",
    color: "indigo",
    onClick: "onDownloadProjectStatus" as const,
    requiresProject: true,
  },
  {
    id: "budget-variance",
    title: "Budget Variance",
    description: "Budget allocation, spending analysis, and variance tracking",
    icon: "account_balance",
    color: "emerald",
    onClick: "onDownloadBudgetVariance" as const,
    requiresProject: true,
  },
  {
    id: "task-completion",
    title: "Task Completion",
    description: "Task progress, completion rates, and productivity metrics",
    icon: "task_alt",
    color: "violet",
    onClick: "onDownloadTaskCompletion" as const,
    requiresProject: false,
  },
  {
    id: "department-workload",
    title: "Department Workload",
    description: "Team capacity, workload distribution, and resource allocation",
    icon: "groups",
    color: "amber",
    onClick: "onDownloadDepartmentWorkload" as const,
    requiresProject: false,
  },
  {
    id: "delay-analysis",
    title: "Delay Analysis",
    description: "Task delays, bottleneck identification, and timeline impact",
    icon: "speed",
    color: "red",
    onClick: "onDownloadDelayAnalysis" as const,
    requiresProject: false,
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", hover: "hover:bg-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", hover: "hover:bg-emerald-100" },
  violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200", hover: "hover:bg-violet-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", hover: "hover:bg-amber-100" },
  red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", hover: "hover:bg-red-100" },
};

export function ReportGenerator({ filters, ...handlers }: ReportGeneratorProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">description</span>
        Generate Reports
      </h3>
      <p className="text-xs text-slate-500 mb-5">
        Select a report type to generate and download. Some reports require a project to be selected.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TYPES.map((report) => {
          const colors = colorMap[report.color];
          const isDisabled = report.requiresProject && !filters.projectId;
          const handler = handlers[report.onClick];

          return (
            <button
              key={report.id}
              onClick={handler}
              disabled={isDisabled}
              className={`
                p-4 rounded-xl border text-left transition-all duration-200
                ${isDisabled 
                  ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed" 
                  : `${colors.bg} ${colors.border} ${colors.hover} cursor-pointer hover:shadow-sm`
                }
              `}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                isDisabled ? "bg-slate-200" : colors.bg
              }`}>
                <span className={`material-symbols-outlined text-xl ${
                  isDisabled ? "text-slate-400" : colors.text
                }`}>
                  {report.icon}
                </span>
              </div>
              <h4 className={`text-sm font-bold mb-1 ${isDisabled ? "text-slate-400" : "text-slate-800"}`}>
                {report.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {report.description}
              </p>
              {isDisabled && (
                <p className="text-[10px] text-amber-500 mt-2 font-medium">
                  Requires project selection
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-3">
                <span className={`material-symbols-outlined text-sm ${isDisabled ? "text-slate-400" : colors.text}`}>
                  download
                </span>
                <span className={`text-xs font-semibold ${isDisabled ? "text-slate-400" : colors.text}`}>
                  Download PDF
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}