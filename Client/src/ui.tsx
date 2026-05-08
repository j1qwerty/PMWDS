import type { NotificationItem, Project, Task, User } from "./types";

// ============================================================
// Grid & Panel Layout Classes
// ============================================================

export const pageGridClass = "grid gap-lg content-start";

export const panelClass = "glass-card rounded-2xl overflow-hidden bg-surface-container-lowest border-transparent border border-outline-variant shadow-sm transition-all duration-300 hover:shadow-md";

export const panelHeadClass = "flex items-start justify-between border-b border-outline-variant pb-lg mb-lg";

export const panelBodyClass = "p-0";

export const listColumnClass = "flex max-h-[420px] flex-col gap-sm overflow-y-auto pr-xs sidebar-scrollbar";

export const listCardClass = "rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md text-left transition-all duration-200 hover:border-primary hover:bg-surface-container-low hover:shadow-sm";

export const selectedCardClass = "border-primary bg-primary-fixed/30 shadow-sm";

export const detailCardClass = "rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-md";

// ============================================================
// Button Classes
// ============================================================

export const primaryButtonClass = "gradient-btn rounded-lg px-lg py-sm text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg focus-ring disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButtonClass = "rounded-lg border border-outline-variant bg-surface-container-lowest px-lg py-sm text-sm font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-on-surface hover:border-outline focus-ring disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass = "rounded-lg border border-error/30 bg-error-container px-lg py-sm text-sm font-medium text-on-error-container transition-all duration-200 hover:bg-error-container/80 focus-ring";

// ============================================================
// Form Input Classes
// ============================================================

export const inputClass = "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm text-on-surface outline-none transition-all duration-200 placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10 focus-ring";

export const labelClass = "flex flex-col gap-xs text-label-caps text-on-surface-variant";

// ============================================================
// Utility Functions
// ============================================================

export function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

// ============================================================
// Panel Component
// ============================================================

export function Panel({
  title,
  subtitle,
  children,
  style,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "glass-card rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant shadow-sm",
        className
      )}
      style={style}
    >
      <div className="px-lg py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <div>
          <h2 className="text-h2 text-on-surface">{title}</h2>
          <p className="mt-xs text-body-md text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <div className="p-lg">{children}</div>
    </section>
  );
}

// ============================================================
// StatCard Component
// ============================================================

export function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  const toneClass: Record<string, string> = {
    teal: "text-success",
    rust: "text-error",
    gold: "text-warning",
    ink: "text-on-surface",
  };

  const iconMap: Record<string, string> = {
    teal: "layers",
    rust: "checklist",
    gold: "group",
    ink: "schedule",
  };

  return (
    <article className="glass-card glass-card-hover rounded-2xl p-lg flex flex-col gap-md transition-all duration-300 group border border-outline-variant hover:border-primary">
      <div className="flex justify-between items-start">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-fixed transition-colors">
          <span
            className="material-symbols-outlined text-xl text-on-surface-variant group-hover:text-primary transition-colors"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {iconMap[tone] || "analytics"}
          </span>
        </div>
      </div>
      <strong className={classNames("text-display text-on-surface", toneClass[tone] ?? "text-on-surface")}>
        {value}
      </strong>
      <small className="text-body-md text-on-surface-variant">{detail}</small>
    </article>
  );
}

// ============================================================
// MetricRow Component
// ============================================================

export function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant py-md last:border-0">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <strong className="text-body-md font-semibold text-on-surface">{value}</strong>
    </div>
  );
}

// ============================================================
// MetricTile Component
// ============================================================

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md text-center">
      <span className="block text-label-caps text-on-surface-variant">{label}</span>
      <strong className="mt-sm block text-h2 text-on-surface">{value}</strong>
    </div>
  );
}

// ============================================================
// EmptyState Component
// ============================================================

export function EmptyState({
  title,
  description,
  compact,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-center",
        compact ? "p-md" : "p-lg"
      )}
    >
      <strong className="block text-body-md font-semibold text-on-surface">{title}</strong>
      <span className="mt-xs block text-body-md text-on-surface-variant">{description}</span>
    </div>
  );
}

// ============================================================
// LoadingPanel Component
// ============================================================

export function LoadingPanel({ label }: { label: string }) {
  return (
    <section className={panelClass}>
      <div className="p-lg">
        <EmptyState title={label} description="Loading the latest workspace data." />
      </div>
    </section>
  );
}

// ============================================================
// ErrorPanel Component
// ============================================================

export function ErrorPanel({ message }: { message: string }) {
  return (
    <section className={panelClass}>
      <div className="p-lg">
        <EmptyState title="Something failed" description={message} />
      </div>
    </section>
  );
}

// ============================================================
// Notice Component
// ============================================================

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-12 rounded-lg border border-primary/30 bg-primary-fixed/20 px-lg py-md text-body-md text-on-primary-fixed">
      {children}
    </div>
  );
}

// ============================================================
// TaskList Component
// ============================================================

export function TaskList({
  tasks,
  onPick,
  selectedId,
  showProgress,
}: {
  tasks: Task[];
  onPick?: (taskId: string) => void;
  selectedId?: string;
  showProgress?: boolean;
}) {
  if (!tasks.length)
    return (
      <EmptyState
        title="No tasks found"
        description="This area will populate as project work is added."
        compact
      />
    );

  if (showProgress) {
    const statusColors: Record<
      string,
      { bg: string; text: string; border: string }
    > = {
      NotStarted: {
        bg: "bg-surface-container-high",
        text: "text-on-surface-variant",
        border: "border-outline-variant",
      },
      Assigned: {
        bg: "bg-primary-fixed/20",
        text: "text-primary",
        border: "border-primary/30",
      },
      InProgress: {
        bg: "bg-warning-bg",
        text: "text-warning",
        border: "border-warning/30",
      },
      Completed: {
        bg: "bg-success-bg",
        text: "text-success",
        border: "border-success/30",
      },
      Delayed: {
        bg: "bg-error-container",
        text: "text-error",
        border: "border-error/30",
      },
      OnHold: {
        bg: "bg-secondary-fixed/20",
        text: "text-secondary",
        border: "border-secondary/30",
      },
      Cancelled: {
        bg: "bg-surface-container-high",
        text: "text-outline",
        border: "border-outline-variant",
      },
    };

    return (
      <div className="divide-y divide-outline-variant">
        {tasks.map((task) => {
          const taskColors = statusColors[task.status] || statusColors.NotStarted;
          const isOverdue =
            task.dueDate &&
            new Date(task.dueDate) < new Date() &&
            task.status !== "Completed";

          return (
            <div
              key={task.id}
              className="flex items-center gap-lg p-lg hover:bg-surface-container-low transition-colors group cursor-pointer"
              onClick={() => onPick?.(task.id)}
            >
              <div className="w-14 h-14 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center flex-shrink-0 group-hover:border-primary group-hover:shadow-sm transition-all">
                <span
                  className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {task.priority === "Critical"
                    ? "priority_high"
                    : task.priority === "High"
                    ? "keyboard_double_arrow_up"
                    : "task"}
                </span>
              </div>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="text-body-md font-semibold text-on-surface mb-xs">
                  {task.title}
                </span>
                <span className="text-label-caps text-on-surface-variant">
                  {task.projectName || "Standalone"} • due{" "}
                  {formatDate(task.dueDate)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-sm flex-shrink-0 w-48">
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden border border-outline-variant">
                  <div
                    className="h-full primary-gradient rounded-full"
                    style={{ width: `${task.progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between w-full items-center">
                  <span className="text-label-caps text-on-surface-variant">
                    {task.progressPercentage}% COMPLETE
                  </span>
                  {isOverdue && (
                    <span className="badge badge-error text-[10px]">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-sm flex-shrink-0">
                <span
                  className={classNames(
                    "badge text-[10px]",
                    taskColors.bg,
                    taskColors.text,
                    taskColors.border
                  )}
                >
                  {task.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={listColumnClass}>
      {tasks.map((task) => (
        <button
          key={task.id}
          className={classNames(
            listCardClass,
            selectedId === task.id && selectedCardClass
          )}
          onClick={() => onPick?.(task.id)}
        >
          <strong className="block text-body-md font-semibold text-on-surface">
            {task.title}
          </strong>
          <span className="mt-xs block text-label-caps text-primary">
            {task.status}
          </span>
          <small className="mt-xs block text-body-md text-on-surface-variant">
            {task.projectName || "Standalone"} / due{" "}
            {formatDate(task.dueDate)}
          </small>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// SimpleProjectList Component
// ============================================================

export function SimpleProjectList({
  projects,
}: {
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    progressPercentage?: number;
  }>;
}) {
  const projectList = projects ?? [];
  if (!projectList.length)
    return (
      <EmptyState
        title="No projects"
        description="No high-risk projects to display."
        compact
      />
    );

  return (
    <div className={listColumnClass}>
      {projectList.map((project) => (
        <div className={listCardClass} key={project.id}>
          <strong className="block text-body-md font-semibold text-on-surface">
            {project.name}
          </strong>
          <span className="mt-xs block text-label-caps text-primary">
            {project.status}
          </span>
          <small className="mt-xs block text-body-md text-on-surface-variant">
            {project.progressPercentage
              ? formatPercent(project.progressPercentage)
              : "Needs inspection"}
          </small>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SimpleProjectCards Component
// ============================================================

export function SimpleProjectCards({
  projects,
  selectedId,
  onPick,
}: {
  projects: Project[];
  selectedId: string;
  onPick: (projectId: string) => void;
}) {
  return (
    <div className={listColumnClass}>
      {projects.map((project) => (
        <button
          key={project.id}
          className={classNames(
            listCardClass,
            selectedId === project.id && selectedCardClass
          )}
          onClick={() => onPick(project.id)}
        >
          <strong className="block text-body-md font-semibold text-on-surface">
            {project.name}
          </strong>
          <span className="mt-xs block text-label-caps text-primary">
            {project.status} / {formatPercent(project.progressPercentage)}
          </span>
          <small className="mt-xs block text-body-md text-on-surface-variant">
            {project.totalTasks} tasks / {project.overdueTasks} overdue
          </small>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// NotificationList Component
// ============================================================

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
  if (!items.length)
    return (
      <EmptyState
        title="Nothing new"
        description="No alerts are waiting right now."
        compact
      />
    );

  return (
    <div className={listColumnClass}>
      {items.map((item) => (
        <div
          className={classNames(
            listCardClass,
            !item.isRead && selectedCardClass
          )}
          key={item.id}
        >
          <strong className="block text-body-md font-semibold text-on-surface">
            {item.title}
          </strong>
          <span className="mt-xs block text-label-caps text-primary">
            {item.priority} / {item.type}
          </span>
          <small className="mt-xs block text-body-md text-on-surface-variant">
            {compact ? item.message.slice(0, 80) : item.message}
          </small>
          {!compact ? (
            <div className="mt-md flex flex-wrap gap-sm">
              {onRead ? (
                <button
                  className={ghostButtonClass}
                  onClick={() => onRead(item.id)}
                >
                  Mark Read
                </button>
              ) : null}
              {onDelete ? (
                <button
                  className={dangerButtonClass}
                  onClick={() => onDelete(item.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// UserTable Component
// ============================================================

export function UserTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto sidebar-scrollbar">
      <table className="w-full border-collapse text-body-md">
        <thead>
          <tr className="border-b border-outline-variant text-left text-label-caps text-on-surface-variant">
            <th className="px-md py-md">Name</th>
            <th className="px-md py-md">Role</th>
            <th className="px-md py-md">Department</th>
            <th className="px-md py-md">Availability</th>
            <th className="px-md py-md">Workload</th>
            <th className="px-md py-md">Burnout</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              className="border-b border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
              key={user.id}
            >
              <td className="px-md py-md">
                <strong className="block text-on-surface">
                  {user.fullName}
                </strong>
                <div className="text-body-md text-on-surface-variant">
                  {user.email}
                </div>
              </td>
              <td className="px-md py-md">
                {user.roles.join(", ") || user.jobTitle}
              </td>
              <td className="px-md py-md">
                {user.department || "Unassigned"}
              </td>
              <td className="px-md py-md">{user.availabilityStatus}</td>
              <td className="px-md py-md">
                {formatPercent(user.aiWorkloadScore)}
              </td>
              <td className="px-md py-md">
                {formatPercent(user.aiBurnoutRiskScore * 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// WorkloadBars Component
// ============================================================

export function WorkloadBars({ items }: { items: Array<any> }) {
  if (!items.length)
    return (
      <EmptyState
        title="No workload data"
        description="Workload telemetry will appear here when users and tasks exist."
        compact
      />
    );

  return (
    <div className="flex flex-col gap-md">
      {items.map((item) => {
        const score = Number(
          item.workloadScore ?? item.aiWorkloadScore ?? 0
        );
        const burnoutRaw = Number(
          item.burnoutRisk ?? item.aiBurnoutRiskScore ?? 0
        );
        const burnout = burnoutRaw <= 1 ? burnoutRaw * 100 : burnoutRaw;

        return (
          <div
            className="grid grid-cols-[1fr_2fr_auto] items-center gap-md rounded-lg border border-outline-variant bg-surface-container-low p-md"
            key={item.userId ?? item.fullName}
          >
            <div>
              <strong className="block text-body-md text-on-surface">
                {item.fullName}
              </strong>
              <span className="text-label-caps text-on-surface-variant">
                {item.jobTitle || "Team member"}
              </span>
            </div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-high border border-outline-variant">
                <div
                  className="h-full primary-gradient rounded-full"
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              <small className="mt-xs block text-label-caps text-on-surface-variant">
                Load {formatPercent(score)}
              </small>
            </div>
            <small className="text-body-md text-on-surface-variant">
              Burnout {formatPercent(burnout)}
            </small>
          </div>
        );
      })}
    </div>
  );
}