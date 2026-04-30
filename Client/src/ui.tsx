import type { NotificationItem, Project, Task, User } from "./types";

export const pageGridClass = "grid grid-cols-12 gap-4 content-start";
export const panelClass = "col-span-12 overflow-hidden rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface)]/92 shadow-[var(--pmwds-shadow)] backdrop-blur";
export const panelHeadClass = "flex items-start justify-between border-b border-[var(--pmwds-border)] px-5 py-4";
export const panelBodyClass = "p-5";
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
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className={panelClass} style={style}>
      <div className={panelHeadClass}>
        <div>
          <p className="mb-1 text-[0.64rem] font-semibold tracking-[0.2em] text-sky-300/80 uppercase">PMWDS</p>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className={panelBodyClass}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  const toneClass: Record<string, string> = {
    teal: "text-teal-200",
    rust: "text-rose-200",
    gold: "text-amber-200",
    ink: "text-slate-200",
  };

  return (
    <article className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface)]/88 p-5 shadow-xl shadow-black/15">
      <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</span>
      <strong className={classNames("mt-2 block text-3xl font-semibold", toneClass[tone] ?? "text-white")}>{value}</strong>
      <small className="mt-1 block text-xs text-slate-400">{detail}</small>
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

export function TaskList({ tasks, onPick, selectedId }: { tasks: Task[]; onPick?: (taskId: string) => void; selectedId?: string }) {
  if (!tasks.length) return <EmptyState title="No tasks found" description="This area will populate as project work is added." compact />;

  return (
    <div className={listColumnClass}>
      {tasks.map((task) => (
        <button key={task.id} className={classNames(listCardClass, selectedId === task.id && selectedCardClass)} onClick={() => onPick?.(task.id)}>
          <strong className="block text-sm font-semibold text-white">{task.title}</strong>
          <span className="mt-1 block text-xs font-medium text-sky-300">{task.status}</span>
          <small className="mt-1 block text-xs text-slate-400">
            {task.projectName || "Standalone"} / due {formatDate(task.dueDate)}
          </small>
        </button>
      ))}
    </div>
  );
}

export function SimpleProjectList({ projects }: { projects?: Array<{ id: string; name: string; status: string; progressPercentage?: number }> }) {
  const projectList = projects ?? [];
  if (!projectList.length) return <EmptyState title="No projects" description="No high-risk projects to display." compact />;

  return (
    <div className={listColumnClass}>
      {projectList.map((project) => (
        <div className={listCardClass} key={project.id}>
          <strong className="block text-sm font-semibold text-white">{project.name}</strong>
          <span className="mt-1 block text-xs font-medium text-sky-300">{project.status}</span>
          <small className="mt-1 block text-xs text-slate-400">{project.progressPercentage ? formatPercent(project.progressPercentage) : "Needs inspection"}</small>
        </div>
      ))}
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

  return (
    <div className={listColumnClass}>
      {items.map((item) => (
        <div className={classNames(listCardClass, !item.isRead && selectedCardClass)} key={item.id}>
          <strong className="block text-sm font-semibold text-white">{item.title}</strong>
          <span className="mt-1 block text-xs font-medium text-sky-300">
            {item.priority} / {item.type}
          </span>
          <small className="mt-1 block text-xs text-slate-400">{compact ? item.message.slice(0, 80) : item.message}</small>
          {!compact ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRead ? <button className={ghostButtonClass} onClick={() => onRead(item.id)}>Mark Read</button> : null}
              {onDelete ? <button className={dangerButtonClass} onClick={() => onDelete(item.id)}>Delete</button> : null}
            </div>
          ) : null}
        </div>
      ))}
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
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const score = Number(item.workloadScore ?? item.aiWorkloadScore ?? 0);
        const burnoutRaw = Number(item.burnoutRisk ?? item.aiBurnoutRiskScore ?? 0);
        const burnout = burnoutRaw <= 1 ? burnoutRaw * 100 : burnoutRaw;

        return (
          <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-4 rounded-md border border-white/8 bg-white/[0.025] p-3" key={item.userId ?? item.fullName}>
            <div>
              <strong className="block text-sm text-white">{item.fullName}</strong>
              <span className="text-xs text-slate-400">{item.jobTitle || "Team member"}</span>
            </div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-sky-300 transition-all" style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
              <small className="mt-1 block text-xs text-slate-500">Load {formatPercent(score)}</small>
            </div>
            <small className="text-xs text-slate-400">Burnout {formatPercent(burnout)}</small>
          </div>
        );
      })}
    </div>
  );
}
