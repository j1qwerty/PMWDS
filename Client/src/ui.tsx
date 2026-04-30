import type { NotificationItem, Project, Task, User } from "./types";

export const pageGridClass = "grid grid-cols-12 gap-4 content-start";
export const panelClass = "glass-card col-span-12 overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-white/10";
export const panelHeadClass = "flex items-start justify-between border-b border-white/5 pb-4 mb-6";
export const panelBodyClass = "p-0";

export const glassCardClass = "glass-card rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 hover:bg-white/[0.02]";
export const glassCardHoverClass = "glass-card glass-card-hover rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 border border-white/5 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]";
export const listColumnClass = "flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1";
export const listCardClass = "rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]";
export const selectedCardClass = "border-sky-300/60 bg-sky-300/10";
export const detailCardClass = "rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15";
export const primaryButtonClass = "rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50";
export const ghostButtonClass = "rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButtonClass = "rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20";
export const inputClass = "w-full rounded-md border border-[var(--pmwds-border)] bg-[#0a0f18] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/10";
export const labelClass = "flex flex-col gap-1.5 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase";

export function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatPercent(value: number) {
  return `${Math.round(value ?? 0)}%`;
}

export function classNames(...values: Array<string | false | undefined | null>) {
  return values.filter(Boolean).join(" ");
}

export function Panel({
  title,
  subtitle,
  children,
  style,
  actions,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-2xl border border-white/5 bg-black/40 overflow-hidden" style={style}>
      <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div>
          <h2 className="font-semibold text-lg text-white tracking-wide">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, detail, tone, trend, trendValue }: { label: string; value: number; detail: string; tone: string; trend?: "up" | "down" | "neutral"; trendValue?: string }) {
  const toneClass: Record<string, string> = {
    teal: "text-teal-200",
    rust: "text-rose-200",
    gold: "text-amber-200",
    ink: "text-slate-200",
    primary: "text-indigo-300",
  };

  const iconMap: Record<string, string> = {
    teal: "layers",
    rust: "checklist",
    gold: "group",
    ink: "schedule",
    primary: "auto_awesome",
  };

  return (
    <article className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col gap-3 transition-all duration-300 group border border-white/5 hover:border-white/15">
      <div className="flex justify-between items-start">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tone === 'primary' ? 'bg-primary/10' : 'bg-white/5'}`}>
          <span className={`material-symbols-outlined text-lg ${toneClass[tone] ?? 'text-slate-400'}`} style={{fontVariationSettings: 'FILL 1'}}>{iconMap[tone] || 'analytics'}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <strong className={classNames("text-4xl font-black text-white tracking-tight", toneClass[tone] ?? "text-white")}>{value}</strong>
        {trend && trendValue && (
          <span className={classNames("text-xs font-bold flex items-center px-2 py-1 rounded-md border", 
            trend === "up" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : 
            trend === "down" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : 
            "text-slate-400 bg-white/5 border-white/10")}>
            {trend === "up" && <span className="material-symbols-outlined text-sm mr-1" style={{fontVariationSettings: 'FILL 1'}}>arrow_upward</span>}
            {trend === "down" && <span className="material-symbols-outlined text-sm mr-1" style={{fontVariationSettings: 'FILL 1'}}>arrow_downward</span>}
            {trendValue}
          </span>
        )}
      </div>
      <small className="text-xs text-slate-500 font-medium">{detail}</small>
    </article>
  );
}

export function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <strong className="text-sm font-semibold text-white">{value}</strong>
    </div>
  );
}

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/[0.035] p-3 text-center">
      <span className="block text-xs text-slate-400">{label}</span>
      <strong className="mt-1 block text-lg font-semibold text-white">{value}</strong>
    </div>
  );
}

export function EmptyState({ title, description, compact }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={classNames("rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] text-center", compact ? "p-4" : "p-8")}>
      <strong className="block text-sm font-semibold text-white">{title}</strong>
      <span className="mt-1 block text-sm text-slate-400">{description}</span>
    </div>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <section className={panelClass}>
      <div className="p-8">
        <EmptyState title={label} description="Loading the latest workspace data." />
      </div>
    </section>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <section className={panelClass}>
      <div className="p-8">
        <EmptyState title="Something failed" description={message} />
      </div>
    </section>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="col-span-12 rounded-md border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">{children}</div>;
}

export function TaskList({ tasks, onPick, showProgress }: { tasks: Task[]; onPick?: (taskId: string) => void; selectedId?: string; showProgress?: boolean }) {
  if (!tasks.length) return <EmptyState title="No tasks found" description="This area will populate as project work is added." compact />;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    NotStarted: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
    Assigned: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    InProgress: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    Completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Delayed: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    OnHold: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    Cancelled: { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/20" },
  };

  return (
    <div className="divide-y divide-white/5">
      {tasks.map((task) => {
        const taskColors = statusColors[task.status] || statusColors.NotStarted;
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed";
        
        return (
          <div key={task.id} className="flex items-center gap-6 p-5 hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => onPick?.(task.id)}>
            <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
              <span className="material-symbols-outlined text-slate-400 text-xl group-hover:text-primary-light transition-colors" style={{fontVariationSettings: 'FILL 1'}}>
                {task.priority === "Critical" ? "priority_high" : task.priority === "High" ? "keyboard_double_arrow_up" : "task"}
              </span>
            </div>
            <div className="flex flex-col flex-grow min-w-0">
              <span className="text-sm font-bold text-white mb-1 tracking-wide">{task.title}</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide">{task.projectName || "Standalone"} • due {formatDate(task.dueDate)}</span>
            </div>
            {showProgress && (
              <div className="flex flex-col items-end gap-2 w-40 flex-shrink-0">
                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progressPercentage}%` }} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 tracking-wider">{task.progressPercentage}% COMPLETE</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={classNames("px-2.5 py-1 text-[10px] font-bold uppercase rounded border tracking-widest", taskColors.bg, taskColors.text, taskColors.border)}>
                {task.status}
              </span>
              {isOverdue && (
                <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase rounded border border-rose-500/20 tracking-widest">
                  Overdue
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SimpleProjectList({ projects, onClick }: { projects?: Array<{ id: string; name: string; status: string; progressPercentage?: number; delayRisk?: number; departmentName?: string }>; onClick?: (id: string) => void }) {
  const projectList = projects ?? [];
  if (!projectList.length) return <EmptyState title="No projects" description="No high-risk projects to display." compact />;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    NotStarted: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
    InProgress: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    OnHold: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    Completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Cancelled: { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/20" },
    Delayed: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  };

  return (
    <div className="divide-y divide-white/5">
      {projectList.map((project) => {
        const delayRisk = project.delayRisk ? project.delayRisk * 100 : 0;
        const isHighRisk = delayRisk > 20;
        const colors = statusColors[project.status] || statusColors.InProgress;
        
        return (
          <div key={project.id} className="flex items-center gap-6 p-5 hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => onClick?.(project.id)}>
            <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
              <span className="material-symbols-outlined text-slate-400 text-xl group-hover:text-primary-light transition-colors" style={{fontVariationSettings: 'FILL 1'}}>folder</span>
            </div>
            <div className="flex flex-col flex-grow min-w-0">
              <span className="text-sm font-bold text-white mb-1 tracking-wide">{project.name}</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide">{project.departmentName || "No department"}</span>
            </div>
            <div className="flex flex-col items-end gap-2 w-40 flex-shrink-0">
              <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div className={classNames("h-full rounded-full transition-all", isHighRisk ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-primary")} style={{ width: `${project.progressPercentage || 0}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 tracking-wider">{project.progressPercentage ? formatPercent(project.progressPercentage) : "0%"} COMPLETE</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={classNames("px-2.5 py-1 text-[10px] font-bold uppercase rounded border tracking-widest", colors.bg, colors.text, colors.border)}>
                {project.status}
              </span>
              {isHighRisk && (
                <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase rounded border border-rose-500/20 tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                  High Risk
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SimpleProjectCards({ projects, selectedId, onPick }: { projects: Project[]; selectedId: string; onPick: (projectId: string) => void }) {
  return (
    <div className={listColumnClass}>
      {projects.map((project) => (
        <button key={project.id} className={classNames(listCardClass, selectedId === project.id && selectedCardClass)} onClick={() => onPick(project.id)}>
          <strong className="block text-sm font-semibold text-white">{project.name}</strong>
          <span className="mt-1 block text-xs font-medium text-sky-300">
            {project.status} / {formatPercent(project.progressPercentage)}
          </span>
          <small className="mt-1 block text-xs text-slate-400">
            {project.totalTasks} tasks / {project.overdueTasks} overdue
          </small>
        </button>
      ))}
    </div>
  );
}

export function NotificationList({
  items,
  compact,
  onRead,
  onDelete,
}: {
  items: NotificationItem[];
  compact?: boolean;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (!items.length) return <EmptyState title="Nothing new" description="No alerts are waiting right now." compact />;

  const priorityColors: Record<string, { dot: string; border: string }> = {
    Critical: { dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]", border: "border-rose-500/30" },
    High: { dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]", border: "border-amber-500/30" },
    Medium: { dot: "bg-blue-500", border: "border-blue-500/30" },
    Low: { dot: "bg-slate-500", border: "border-slate-500/30" },
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const colors = priorityColors[item.priority] || priorityColors.Low;
        
        return (
          <div key={item.id} className={classNames("p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group", !item.isRead && colors.border)}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={classNames("w-2.5 h-2.5 rounded-full flex-shrink-0", colors.dot)} />
                <strong className="text-sm font-bold text-white tracking-wide group-hover:text-primary-light transition-colors">{item.title}</strong>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.priority}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{compact ? item.message.slice(0, 80) : item.message}</p>
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <span className="text-[10px] text-slate-500 font-medium">{item.type}</span>
              <div className="flex gap-2">
                {onRead && !item.isRead && (
                  <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors tracking-widest" onClick={() => onRead(item.id)}>MARK READ</button>
                )}
                {onDelete && (
                  <button className="text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors tracking-widest" onClick={() => onDelete(item.id)}>DELETE</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UserTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--pmwds-border)] text-left text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Availability</th>
            <th className="px-4 py-3">Workload</th>
            <th className="px-4 py-3">Burnout</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr className="border-b border-white/8 text-slate-300" key={user.id}>
              <td className="px-4 py-3">
                <strong className="block text-white">{user.fullName}</strong>
                <div className="text-xs text-slate-500">{user.email}</div>
              </td>
              <td className="px-4 py-3">{user.roles.join(", ") || user.jobTitle}</td>
              <td className="px-4 py-3">{user.department || "Unassigned"}</td>
              <td className="px-4 py-3">{user.availabilityStatus}</td>
              <td className="px-4 py-3">{formatPercent(user.aiWorkloadScore)}</td>
              <td className="px-4 py-3">{formatPercent(user.aiBurnoutRiskScore * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkloadBars({ items }: { items: Array<any> }) {
  if (!items.length) return <EmptyState title="No workload data" description="Workload telemetry will appear here when users and tasks exist." compact />;

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const score = Number(item.workloadScore ?? item.aiWorkloadScore ?? 0);
        const burnoutRaw = Number(item.burnoutRisk ?? item.aiBurnoutRiskScore ?? 0);
        const burnout = burnoutRaw <= 1 ? burnoutRaw * 100 : burnoutRaw;

        const isOverloaded = score > 90;
        const isHighBurnout = burnout > 60;
        const barColor = isOverloaded ? "bg-rose-500" : isHighBurnout ? "bg-amber-500" : "bg-primary";

        return (
          <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all group" key={item.userId ?? item.fullName}>
            <div className="min-w-0">
              <strong className="block text-sm font-bold text-white truncate">{item.fullName}</strong>
              <span className="text-xs text-slate-400">{item.jobTitle || "Team member"}</span>
            </div>
            <div className="w-full">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/50 border border-white/5">
                <div className={classNames("h-full rounded-full transition-all duration-500", barColor, isOverloaded && "shadow-[0_0_10px_rgba(244,63,94,0.5)]")} style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                <small className="text-xs text-slate-500">Load {formatPercent(score)}</small>
                <small className={classNames("text-xs font-bold", isHighBurnout ? "text-rose-400" : "text-slate-400")}>Burnout {formatPercent(burnout)}</small>
              </div>
            </div>
            <div className={classNames("w-16 h-8 rounded-lg flex items-center justify-center text-xs font-bold border",
              isOverloaded ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
              isHighBurnout ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
              "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}>
              {formatPercent(score)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeroPanel({ 
  title, 
  subtitle, 
  actions 
}: { 
  title: string; 
  subtitle: string; 
  actions?: React.ReactNode 
}) {
  return (
    <section className="glass-card rounded-2xl p-10 relative overflow-hidden flex flex-col justify-end min-h-[220px]">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="text-left">
          <h1 className="text-4xl font-black tracking-tight text-white mb-3">{title}</h1>
          <p className="text-slate-400 text-base max-w-xl leading-relaxed">{subtitle}</p>
        </div>
        {actions && <div className="flex gap-4">{actions}</div>}
      </div>
    </section>
  );
}

export function InsightCard({ 
  type, 
  title, 
  message 
}: { 
  type: "critical" | "warning" | "info"; 
  title: string; 
  message: string 
}) {
  const typeStyles = {
    critical: { dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]", border: "border-rose-500/20", hover: "hover:border-rose-500/40" },
    warning: { dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]", border: "border-amber-500/20", hover: "hover:border-amber-500/40" },
    info: { dot: "bg-primary-light shadow-[0_0_12px_rgba(129,140,248,0.8)]", border: "border-primary/20", hover: "hover:border-primary/40" },
  };
  
  const styles = typeStyles[type];

  return (
    <div className={classNames("flex gap-5 p-4 rounded-xl bg-white/[0.02] border transition-all group cursor-pointer", styles.border, styles.hover)}>
      <div className={classNames("mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0", styles.dot)} />
      <div className="flex flex-col gap-1.5">
        <span className={classNames("text-sm font-bold text-white tracking-wide group-hover:text-primary-light transition-colors", 
          type === "critical" && "group-hover:text-rose-400",
          type === "warning" && "group-hover:text-amber-400")}>{title}</span>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

export function EscalationCard({ 
  title, 
  timeAgo, 
  description, 
  actions 
}: { 
  title: string; 
  timeAgo: string; 
  description: string; 
  actions?: React.ReactNode 
}) {
  return (
    <div className="p-5 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-4 group hover:border-white/20 transition-all">
      <div className="flex justify-between items-start">
        <span className="text-sm font-bold text-white tracking-wide">{title}</span>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{timeAgo}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      {actions && <div className="flex justify-end gap-4 pt-3 border-t border-white/5">{actions}</div>}
    </div>
  );
}

export function RiskCard({ 
  title, 
  type, 
  description, 
  metric, 
  metricLabel, 
  actionLabel, 
  onAction 
}: { 
  title: string; 
  type: "critical" | "warning"; 
  description: string; 
  metric: string; 
  metricLabel: string; 
  actionLabel: string; 
  onAction?: () => void 
}) {
  const typeStyles = {
    critical: { border: "border-rose-500/30 hover:border-rose-500/60", bg: "bg-rose-500", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.8)]", bgButton: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20" },
    warning: { border: "border-amber-500/30 hover:border-amber-500/60", bg: "bg-amber-500", shadow: "shadow-[0_0_15px_rgba(245,158,11,0.8)]", bgButton: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" },
  };
  
  const styles = typeStyles[type];

  return (
    <div className={classNames("glass-card p-8 rounded-2xl flex flex-col gap-5 relative overflow-hidden group border transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)]", styles.border)}>
      <div className={classNames("absolute top-0 left-0 w-1.5 h-full rounded-l", styles.bg, styles.shadow)} />
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
        <span className={classNames("px-2.5 py-1 text-[10px] font-black uppercase rounded border tracking-widest",
          type === "critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30")}>
          {type === "critical" ? "CRITICAL" : "WARNING"}
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      <div className="flex items-center justify-between mt-4 pt-6 border-t border-white/10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{metricLabel}</span>
          <span className={classNames("text-lg font-black", type === "critical" ? "text-rose-400" : "text-white")}>{metric}</span>
        </div>
        <button className={classNames("text-xs font-black px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-2 transition-all border", styles.bgButton)} onClick={onAction}>
          {actionLabel} <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, icon }: { children: React.ReactNode; onClick?: () => void; icon?: string }) {
  return (
    <button className="bg-primary text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary-light transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] group" onClick={onClick}>
      {icon && <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform" style={{fontVariationSettings: 'FILL 1'}}>{icon}</span>}
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, icon }: { children: React.ReactNode; onClick?: () => void; icon?: string }) {
  return (
    <button className="glass-card text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 group border border-white/10" onClick={onClick}>
      {icon && <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform" style={{fontVariationSettings: 'FILL 1'}}>{icon}</span>}
      {children}
    </button>
  );
}
