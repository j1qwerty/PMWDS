import type { NotificationItem, Project, Task, User } from "./types";

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

export function classNames(...values: Array<string | false | undefined>) {
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
    <section className="panel" style={style}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

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
  return (
    <article className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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
    <div className={classNames("empty-state", compact && "compact-empty")}>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <section className="panel">
      <div className="empty-state">
        <strong>{label}</strong>
      </div>
    </section>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="panel">
      <div className="empty-state">
        <strong>Something failed</strong>
        <span>{message}</span>
      </div>
    </section>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}

export function TaskList({
  tasks,
  onPick,
  selectedId,
}: {
  tasks: Task[];
  onPick?: (taskId: string) => void;
  selectedId?: string;
}) {
  if (!tasks.length) {
    return <EmptyState title="No tasks found" description="This area will populate as project work is added." compact />;
  }

  return (
    <div className="list-column">
      {tasks.map((task) => (
        <button
          key={task.id}
          className={classNames("list-card", selectedId === task.id && "selected-card")}
          onClick={() => onPick?.(task.id)}
        >
          <strong>{task.title}</strong>
          <span>{task.status}</span>
          <small>
            {task.projectName || "Standalone"} · due {formatDate(task.dueDate)}
          </small>
        </button>
      ))}
    </div>
  );
}

export function SimpleProjectList({
  projects,
}: {
  projects?: Array<{ id: string; name: string; status: string; progressPercentage?: number }>;
}) {
  const projectList = projects ?? [];
  if (!projectList.length) {
    return <EmptyState title="No projects" description="No high-risk projects to display." compact />;
  }
  return (
    <div className="list-column">
      {projectList.map((project) => (
        <div className="list-card" key={project.id}>
          <strong>{project.name}</strong>
          <span>{project.status}</span>
          <small>{project.progressPercentage ? formatPercent(project.progressPercentage) : "Needs inspection"}</small>
        </div>
      ))}
    </div>
  );
}

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
    <div className="list-column">
      {projects.map((project) => (
        <button
          key={project.id}
          className={classNames("list-card", selectedId === project.id && "selected-card")}
          onClick={() => onPick(project.id)}
        >
          <strong>{project.name}</strong>
          <span>
            {project.status} · {formatPercent(project.progressPercentage)}
          </span>
          <small>
            {project.totalTasks} tasks · {project.overdueTasks} overdue
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
  if (!items.length) {
    return <EmptyState title="Nothing new" description="No alerts are waiting right now." compact />;
  }

  return (
    <div className="list-column">
      {items.map((item) => (
        <div className={classNames("list-card", !item.isRead && "selected-card")} key={item.id}>
          <strong>{item.title}</strong>
          <span>
            {item.priority} · {item.type}
          </span>
          <small>{compact ? item.message.slice(0, 80) : item.message}</small>
          {!compact ? (
            <div className="inline-actions">
              {onRead ? (
                <button className="ghost-button" onClick={() => onRead(item.id)}>
                  Mark Read
                </button>
              ) : null}
              {onDelete ? (
                <button className="danger-button" onClick={() => onDelete(item.id)}>
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

export function UserTable({ users }: { users: User[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Department</th>
            <th>Availability</th>
            <th>Workload</th>
            <th>Burnout</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.fullName}</strong>
                <div className="table-sub">{user.email}</div>
              </td>
              <td>{user.roles.join(", ") || user.jobTitle}</td>
              <td>{user.department || "Unassigned"}</td>
              <td>{user.availabilityStatus}</td>
              <td>{formatPercent(user.aiWorkloadScore)}</td>
              <td>{formatPercent(user.aiBurnoutRiskScore * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkloadBars({ items }: { items: Array<any> }) {
  if (!items.length) {
    return <EmptyState title="No workload data" description="Workload telemetry will appear here when users and tasks exist." compact />;
  }

  return (
    <div className="workload-list">
      {items.map((item) => {
        const score = Number(item.workloadScore ?? item.aiWorkloadScore ?? 0);
        const burnoutRaw = Number(item.burnoutRisk ?? item.aiBurnoutRiskScore ?? 0);
        const burnout = burnoutRaw <= 1 ? burnoutRaw * 100 : burnoutRaw;

        return (
          <div className="workload-row" key={item.userId ?? item.fullName}>
            <div>
              <strong>{item.fullName}</strong>
              <span>{item.jobTitle || "Team member"}</span>
            </div>
            <div className="bar-cluster">
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
              <small>Load {formatPercent(score)}</small>
            </div>
            <small>Burnout {formatPercent(burnout)}</small>
          </div>
        );
      })}
    </div>
  );
}
