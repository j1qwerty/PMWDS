import type { Project, ProjectHealth, Role } from "../../../types";
import { StatusButtons } from "../../shared";

interface ProjectDetailPaneProps {
  project: Project | null;
  health: ProjectHealth | null;
  insights: string[];
  hasRole: (...roles: Role[]) => boolean;
  canUpdateProject: () => void;
  onStatusChange: (status: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  formatMoney: (amount: number) => string;
  children?: React.ReactNode;
}

export function ProjectDetailPane({
  project,
  health,
  insights,
  hasRole,
  onStatusChange,
  onEdit,
  onDelete,
  formatMoney,
  children,
}: ProjectDetailPaneProps) {
  if (!project) {
    return (
      <section className="flex-1 glass-card rounded-xl p-lg flex items-center justify-center">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_open
          </span>
          <p className="text-on-surface-variant">No project selected</p>
          <p className="text-sm text-outline mt-1">Choose a project to inspect milestones and AI signals.</p>
        </div>
      </section>
    );
  }

  const healthScore = project.aiHealthScore != null ? Math.round(project.aiHealthScore * 100) : null;
  const progress = project.progressPercentage || 0;
  const delayRisk = project.aiDelayRiskScore != null ? Math.round(project.aiDelayRiskScore * 100) : null;

  return (
    <section className="flex-1 glass-card rounded-xl p-lg flex flex-col gap-lg overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-bold tracking-widest text-primary bg-primary-fixed px-2 py-0.5 rounded">{project.id}</span>
            <span className="text-sm font-medium text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">history</span>
              Updated 2h ago
            </span>
          </div>
          <h1 className="text-h1 text-on-surface font-bold">{project.name}</h1>
          <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
            {project.description || "No description provided."}
          </p>
        </div>
        <div className="flex gap-2">
          {hasRole("SuperAdmin") && onDelete && (
            <>
              <button
                onClick={onDelete}
                className="size-10 rounded-lg flex items-center justify-center bg-white border border-outline-variant/30 hover:bg-surface-container transition-colors text-error"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="size-10 rounded-lg flex items-center justify-center bg-white border border-outline-variant/30 hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">edit</span>
            </button>
          )}
        </div>
      </div>

      <StatusButtons 
        currentStatus={project.status} 
        hasRole={hasRole} 
        onStatusChange={onStatusChange}
      />

      <MetricsGrid 
        project={project} 
        healthScore={healthScore}
        delayRisk={delayRisk}
        formatMoney={formatMoney}
      />

      <OverallProgress 
        progress={progress} 
        project={project}
        delayRisk={delayRisk}
        formatMoney={formatMoney}
      />

      <AIInsights insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <ProjectHealthMatrix health={health} project={project} />
        <RecentActivity />
      </div>

{children}
    </section>
  );
}

function MetricsGrid({ 
  project, 
  healthScore, 
  delayRisk,
  formatMoney 
}: { 
  project: Project;
  healthScore: number | null;
  delayRisk: number | null;
  formatMoney: (amount: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
      <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Budget</span>
        <span className="text-lg font-bold text-on-surface">{formatMoney(project.plannedBudget)}</span>
        <div className="w-full h-1 bg-surface-container rounded-full mt-2 overflow-hidden">
          <div className="bg-primary w-[65%] h-full"></div>
        </div>
      </div>
      <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Actual Cost</span>
        <span className="text-lg font-bold text-on-surface">{formatMoney(project.actualCost)}</span>
        {project.actualCost != null && project.plannedBudget != null && (
          <span className="text-[10px] text-green-600 font-bold mt-1">
            {Math.round((project.actualCost / project.plannedBudget) * 100)}% of budget
          </span>
        )}
      </div>
      <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Delay Risk</span>
        <span className={`text-lg font-bold ${delayRisk && delayRisk > 50 ? 'text-orange-600' : 'text-green-600'}`}>
          {delayRisk != null ? `${delayRisk}%` : "—"}
        </span>
        <span className="text-[10px] text-on-surface-variant font-medium mt-1">Buffer: —</span>
      </div>
      <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Progress Health</span>
        <span className="text-lg font-bold text-on-surface">{healthScore ?? "—"}</span>
        <span className="text-[10px] text-primary font-bold mt-1">AI assessed</span>
      </div>
    </div>
  );
}

function OverallProgress({ 
  progress, 
  project, 
  delayRisk,
  formatMoney 
}: { 
  progress: number;
  project: Project;
  delayRisk: number | null;
  formatMoney: (amount: number) => string;
}) {
  return (
    <div className="w-full">
      <div className="glass-card rounded-xl p-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <span className="inline-flex items-center space-x-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-1 rounded-full text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            <span>AI Insight: On Pace</span>
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-center">
          <div className="flex justify-center items-center flex-col">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progress}, 100`} strokeWidth="3" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-h1 text-h1 text-on-surface">{progress}%</span>
              </div>
            </div>
            <span className="text-sm text-outline mt-2 font-medium">Overall Completion</span>
          </div>
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="bg-surface/50 p-md rounded-lg border border-surface-variant/50">
              <div className="text-sm text-outline mb-1 font-label-caps">Budget Utilized</div>
              <div className="font-h2 text-h2 text-on-surface mb-2">
                {formatMoney(project.actualCost)}
                <span className="text-sm text-outline font-normal"> / {formatMoney(project.plannedBudget)}</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${project.plannedBudget ? Math.min((project.actualCost ?? 0) / project.plannedBudget * 100, 100) : 0}%` }} />
              </div>
            </div>
            <div className="bg-surface/50 p-md rounded-lg border border-surface-variant/50">
              <div className="text-sm text-outline mb-1 font-label-caps">Delay Risk</div>
              <div className="font-h2 text-h2 text-on-surface mb-2">{delayRisk != null ? `${delayRisk}%` : "—"}</div>
              <div className="text-xs text-green-600 flex items-center">
                <span className="material-symbols-outlined text-[14px] mr-1">trending_down</span>
                {delayRisk && delayRisk < 30 ? 'Low risk' : 'Moderate risk'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInsights({ insights }: { insights: string[] }) {
  return (
    <>
      {insights.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {insights.map((insight, idx) => (
            <div key={idx} className="px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
              <span className="text-xs font-bold text-primary tracking-wide uppercase">{insight}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
            <span className="text-xs font-bold text-primary tracking-wide uppercase">AI Insight: Optimized Path</span>
          </div>
          <div className="px-3 py-1.5 bg-secondary/5 border border-secondary/20 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
            <span className="text-xs font-bold text-secondary tracking-wide uppercase">Resource Efficiency High</span>
          </div>
          <div className="px-3 py-1.5 bg-tertiary/5 border border-tertiary/20 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">auto_awesome</span>
            <span className="text-xs font-bold text-tertiary tracking-wide uppercase">AI Insight: On Pace</span>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectHealthMatrix({ health, project }: { health: ProjectHealth | null; project: Project }) {
  const calculateDummyHealth = () => {
    const progress = project.progressPercentage || 0;
    const delayRisk = project.aiDelayRiskScore || 0;
    const budgetRatio = project.plannedBudget
      ? (project.actualCost || 0) / project.plannedBudget
      : 0;

    const scheduleScore = Math.max(0, Math.min(1,
      (progress / 100) * 0.7 + (1 - delayRisk) * 0.3
    ));

    const budgetScore = Math.max(0, Math.min(1,
      budgetRatio <= 1 ? 1 - (budgetRatio * 0.5) : Math.max(0, 1.5 - budgetRatio)
    ));

    const teamScore = 0.75;

    const qualityScore = Math.max(0, Math.min(1,
      progress > 0 ? 0.5 + (progress / 200) : 0.5
    ));

    return [
      { label: "Schedule", value: scheduleScore },
      { label: "Budget", value: budgetScore },
      { label: "Team", value: teamScore },
      { label: "Quality", value: qualityScore },
    ];
  };

  const healthMetrics = health
    ? [
        { label: "Schedule", value: health.scheduleHealth },
        { label: "Budget", value: health.budgetHealth },
        { label: "Team", value: health.teamHealth },
        { label: "Quality", value: health.qualityHealth },
      ]
    : calculateDummyHealth();

  const getHealthColor = (value: number) => {
    if (value >= 0.8) return { dot: 'bg-green-500', text: 'text-green-700', label: 'Good' };
    if (value >= 0.6) return { dot: 'bg-yellow-400', text: 'text-yellow-700', label: 'Fair' };
    return { dot: 'bg-red-500', text: 'text-red-700', label: 'Poor' };
  };

  return (
    <div className="flex flex-col gap-md">
      <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">health_metrics</span>
        Project Health Matrix
      </h3>
      <div className="grid grid-cols-2 gap-sm">
        {healthMetrics.map((item, index) => {
          const healthColor = getHealthColor(item.value);

          return (
            <div
              key={item.label}
              className="p-md bg-white rounded-lg border border-outline-variant/10 flex flex-col gap-2 relative"
            >
              {!health && index === 0 && (
                <div className="absolute -top-2 -right-2">
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    Estimated
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-on-surface-variant">{item.label}</span>
                <div className={`size-2 rounded-full ${healthColor.dot} status-beacon on-track`} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">{Math.round(item.value * 100)}%</span>
                <span className={`text-[10px] font-medium ${healthColor.text}`}>
                  {healthColor.label}
                </span>
              </div>
              <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${item.value >= 0.8 ? 'bg-green-500' : item.value >= 0.6 ? 'bg-yellow-400' : 'bg-red-500'}`}
                  style={{ width: `${item.value * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!health && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
          <span className="material-symbols-outlined text-amber-600 text-[16px]">auto_awesome</span>
          <p className="text-[11px] text-amber-700">
            <span className="font-semibold">AI Health Metrics Coming Soon</span> — Currently showing estimates based on project progress, budget, and timeline data.
          </p>
        </div>
      )}
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="flex flex-col gap-md">
      <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">timeline</span>
        Recent Activity
      </h3>
      <div className="flex flex-col gap-sm">
        <div className="flex gap-3">
          <div className="h-10 w-1 bg-primary rounded-full"></div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-on-surface">Infrastructure blueprint approved by architecture lead.</p>
            <span className="text-[10px] text-outline">Yesterday, 4:30 PM • Ishani Gupta</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-1 bg-surface-container-highest rounded-full"></div>
          <div className="flex flex-col opacity-60">
            <p className="text-sm font-medium text-on-surface">Database migration script finalized for staging.</p>
            <span className="text-[10px] text-outline">Oct 24, 11:20 AM • Aarav Sharma</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-1 bg-surface-container-highest rounded-full"></div>
          <div className="flex flex-col opacity-40">
            <p className="text-sm font-medium text-on-surface">Initial security audit completed for cloud infrastructure.</p>
            <span className="text-[10px] text-outline">Oct 22, 3:15 PM • Vihaan Malhotra</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestonesSection({ projectId }: { projectId: string }) {
  return (
    <div className="p-4">
      <MilestonesTabPlaceholder projectId={projectId} />
    </div>
  );
}

function MilestonesTabPlaceholder({ projectId }: { projectId: string }) {
  return (
    <div className="border-t border-outline-variant pt-4">
      <div className="text-sm text-on-surface-variant">Milestones section placeholder</div>
      <div className="text-[10px] text-outline mt-1">Project ID: {projectId}</div>
    </div>
  );
}
