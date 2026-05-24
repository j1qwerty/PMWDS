import { useMemo, useState } from "react";
import { FiCheck, FiChevronDown, FiEye, FiMoreHorizontal, FiPlus, FiSearch, FiSliders, FiX } from "react-icons/fi";
import type {
  ColorAssignments,
  Department,
  Filters,
  Milestone,
  Organization,
  Project,
  Task,
  User,
} from "./types";
import { classNames, formatDate, initials, palette, statuses, taskChildren } from "./utils";

export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="title-actions">{actions}</div>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button className="add-btn" onClick={onClick}>
      <FiPlus />
      {label}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  return <span className={`priority-badge priority-${(priority ?? "medium").toLowerCase()}`}>{priority ?? "Medium"}</span>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress-bar">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function MetricCard({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: string }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="color-menu" aria-label="Color tag picker">
      <button
        className="color-trigger"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        title="Set color"
      >
        <span style={{ background: value }} />
      </button>
      {open ? (
        <div className="color-popover">
          {palette.map((color) => (
            <button
              key={color}
              className={classNames("color-dot", value === color && "selected")}
              style={{ background: color }}
              onClick={(event) => {
                event.stopPropagation();
                onChange(color);
                setOpen(false);
              }}
              title={color}
              type="button"
            >
              {value === color ? <FiCheck /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UserAvatar({ user, fallback }: { user?: User | null; fallback?: string | null }) {
  return (
    <span className="avatar small" title={user?.fullName ?? fallback ?? "Unassigned"}>
      {initials(user?.fullName ?? fallback ?? "NA")}
    </span>
  );
}

function AvatarStack({
  users,
  fallbacks,
}: {
  users?: Array<User | undefined | null>;
  fallbacks?: Array<string | undefined | null>;
}) {
  const people = [...(users ?? []), ...(fallbacks ?? []).map((name) => (name ? ({ fullName: name } as User) : null))]
    .filter(Boolean)
    .slice(0, 4) as User[];
  if (!people.length) return <span className="avatar-empty">Unassigned</span>;
  return (
    <span className="avatar-stack">
      {people.map((user, index) => (
        <UserAvatar key={`${user.id ?? user.fullName}-${index}`} user={user} />
      ))}
    </span>
  );
}

export function HierarchyFilters({
  organizations,
  departments,
  projects,
  milestones,
  tasks,
  users,
  filters,
  onChange,
  showOrganization,
}: {
  organizations: Organization[];
  departments: Department[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  users: User[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  showOrganization: boolean;
}) {
  const effectiveDepartments = useMemo(
    () =>
      filters.organizationId
        ? departments.filter((department) => department.organizationId === filters.organizationId)
        : departments,
    [departments, filters.organizationId],
  );
  const effectiveDepartmentIds = new Set(effectiveDepartments.map((department) => department.id));
  const effectiveProjects = projects.filter((project) => {
    if (filters.departmentId) return project.departmentId === filters.departmentId;
    return effectiveDepartmentIds.has(project.departmentId);
  });
  const effectiveProjectIds = new Set(effectiveProjects.map((project) => project.id));
  const effectiveMilestones = milestones.filter((milestone) => {
    if (filters.projectId) return milestone.projectId === filters.projectId;
    return effectiveProjectIds.has(milestone.projectId);
  });
  const effectiveMilestoneIds = new Set(effectiveMilestones.map((milestone) => milestone.id));
  const effectiveTasks = tasks.filter((task) => {
    if (filters.milestoneId) return task.milestoneId === filters.milestoneId;
    if (filters.projectId) return task.projectId === filters.projectId;
    return effectiveProjectIds.has(task.projectId) || (task.milestoneId ? effectiveMilestoneIds.has(task.milestoneId) : false);
  });

  return (
    <section className="filter-panel">
      <div className="filter-header">
        <FiSliders />
        <strong>Filters</strong>
        <span>{users.length} users in scope</span>
      </div>
      <div className="filter-grid">
        {showOrganization ? (
          <Select
            label="Organization"
            value={filters.organizationId}
            onChange={(organizationId) =>
              onChange({ organizationId, departmentId: "", projectId: "", milestoneId: "", taskId: "" })
            }
            options={organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
          />
        ) : null}
        <Select
          label="Department"
          value={filters.departmentId}
          onChange={(departmentId) => onChange({ departmentId, projectId: "", milestoneId: "", taskId: "" })}
          options={effectiveDepartments.map((department) => ({ value: department.id, label: department.name }))}
        />
        <Select
          label="Project"
          value={filters.projectId}
          onChange={(projectId) => onChange({ projectId, milestoneId: "", taskId: "" })}
          options={effectiveProjects.map((project) => ({ value: project.id, label: project.name }))}
        />
        <Select
          label="Milestone"
          value={filters.milestoneId}
          onChange={(milestoneId) => onChange({ milestoneId, taskId: "" })}
          options={effectiveMilestones.map((milestone) => ({ value: milestone.id, label: milestone.name }))}
        />
        <Select
          label="Task"
          value={filters.taskId}
          onChange={(taskId) => onChange({ taskId })}
          options={effectiveTasks.map((task) => ({ value: task.id, label: task.title }))}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(status) => onChange({ status })}
          options={statuses.map((status) => ({ value: status, label: status }))}
        />
        <Select
          label="Sort"
          value={filters.sortBy}
          onChange={(sortBy) => onChange({ sortBy: sortBy as Filters["sortBy"] })}
          options={[
            { value: "name", label: "Name" },
            { value: "progress", label: "Progress" },
            { value: "dueDate", label: "Time" },
            { value: "status", label: "Status" },
          ]}
          allLabel=""
        />
        <label className="search-field">
          <span>Search</span>
          <div>
            <FiSearch />
            <input
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Search projects, milestones, tasks..."
            />
          </div>
        </label>
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WorkHierarchy({
  projects,
  milestones,
  tasks,
  users,
  departments,
  colors,
  onColor,
  onProgress,
  onComment,
  onStatus,
  onView,
  density = "comfortable",
}: {
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  users: User[];
  departments: Department[];
  colors: ColorAssignments;
  onColor: (id: string, color: string) => void;
  onProgress: (taskId: string, progress: number, notes?: string) => void;
  onComment: (taskId: string, content: string) => void;
  onStatus: (taskId: string, status: string) => void;
  onView: (item: Project | Milestone | Task, type: "project" | "milestone" | "task" | "subtask") => void;
  density?: "compact" | "comfortable";
}) {
  const projectMilestones = (projectId: string) => milestones.filter((milestone) => milestone.projectId === projectId);
  const milestoneTasks = (milestoneId: string) => tasks.filter((task) => task.milestoneId === milestoneId);

  return (
    <div className={`hierarchy-list density-${density}`}>
      {projects.map((project) => (
        <ExpandableProject
          key={project.id}
          project={project}
          department={departments.find((department) => department.id === project.departmentId)}
          users={users}
          color={colors[project.id] ?? "#6366f1"}
          onColor={(color) => onColor(project.id, color)}
          onView={() => onView(project, "project")}
        >
          {projectMilestones(project.id).map((milestone) => (
            <ExpandableMilestone
              key={milestone.id}
              milestone={milestone}
              color={colors[milestone.id] ?? colors[project.id] ?? "#6366f1"}
              onColor={(color) => onColor(milestone.id, color)}
              onView={() => onView(milestone, "milestone")}
            >
              {milestoneTasks(milestone.id).map((task) => (
                <ExpandableTask
                  key={task.id}
                  task={task}
                  users={users}
                  color={colors[task.id] ?? colors[milestone.id] ?? "#6366f1"}
                  onColor={(color) => onColor(task.id, color)}
                  onProgress={onProgress}
                  onComment={onComment}
                  onStatus={onStatus}
                  onView={(selected, type) => onView(selected, type)}
                />
              ))}
            </ExpandableMilestone>
          ))}
        </ExpandableProject>
      ))}
    </div>
  );
}

function ExpandableProject({
  project,
  department,
  users,
  color,
  onColor,
  onView,
  children,
}: {
  project: Project;
  department?: Department;
  users: User[];
  color: string;
  onColor: (color: string) => void;
  onView: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const projectManager = users.find((user) => user.id === project.projectManagerId);
  const departmentHead = users.find((user) => user.id === department?.departmentHeadUserId);
  return (
    <article className="tracker-card project-card" style={{ borderLeftColor: color }}>
      <div className="tracker-head project-head" onClick={() => setOpen((current) => !current)}>
        <button className="chevron-btn" type="button" aria-label="Expand project">
          <FiChevronDown className={open ? "rotated" : ""} />
        </button>
        <div>
          <strong>{project.name}</strong>
          <span>
            {project.projectCode} / {department?.name ?? "No department"} / {project.projectManagerName ?? "No manager"}
          </span>
        </div>
        <AvatarStack users={[projectManager, departmentHead]} fallbacks={[project.projectManagerName]} />
        <StatusBadge status={project.status} />
        <span className="tracker-percent">{project.progressPercentage}%</span>
        <ProgressBar value={project.progressPercentage} color={color} />
        <ColorPicker value={color} onChange={onColor} />
        <button className="view-btn" type="button" onClick={(event) => { event.stopPropagation(); onView(); }} title="View details">
          <FiEye />
        </button>
      </div>
      {open ? (
        <div className="tracker-body">
          {children}
        </div>
      ) : null}
    </article>
  );
}

function ExpandableMilestone({
  milestone,
  color,
  onColor,
  onView,
  children,
}: {
  milestone: Milestone;
  color: string;
  onColor: (color: string) => void;
  onView: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="tracker-card milestone-card" style={{ borderLeftColor: color }}>
      <div className="tracker-head milestone-head" onClick={() => setOpen((current) => !current)}>
        <button className="milestone-icon" type="button" style={{ color, background: `${color}22` }}>
          {milestone.status === "Completed" ? <FiCheck /> : <FiMoreHorizontal />}
        </button>
        <div>
          <strong>{milestone.name}</strong>
          <span>{milestone.isCritical ? "Critical" : "Standard"} / due {formatDate(milestone.dueDate)}</span>
        </div>
        <span className="tracker-percent">{milestone.progressPercentage}%</span>
        <ProgressBar value={milestone.progressPercentage} color={color} />
        <StatusBadge status={milestone.status} />
        <ColorPicker value={color} onChange={onColor} />
        <button className="view-btn" type="button" onClick={(event) => { event.stopPropagation(); onView(); }} title="View details">
          <FiEye />
        </button>
        <button className="chevron-btn" type="button" aria-label="Expand milestone">
          <FiChevronDown className={open ? "rotated" : ""} />
        </button>
      </div>
      {open ? (
        <div className="task-list open">
          {children}
        </div>
      ) : null}
    </article>
  );
}

function ExpandableTask({
  task,
  users,
  color,
  onColor,
  onProgress,
  onComment,
  onStatus,
  onView,
}: {
  task: Task;
  users: User[];
  color: string;
  onColor: (color: string) => void;
  onProgress: (taskId: string, progress: number, notes?: string) => void;
  onComment: (taskId: string, content: string) => void;
  onStatus: (taskId: string, status: string) => void;
  onView: (task: Task, type: "task" | "subtask") => void;
}) {
  const [open, setOpen] = useState(false);
  const subtasks = taskChildren(task);
  const assignedUsers = task.assignees?.map((assignee) => users.find((user) => user.id === assignee.userId)).filter(Boolean) as User[] | undefined;
  const primaryAssignee = users.find((user) => user.id === task.assignedToUserId);
  const done = task.status === "Completed" || task.progressPercentage >= 100;
  return (
    <article className="task-row-card" style={{ borderLeftColor: color }}>
      <div className="task-row-head">
        <button
          className={classNames("task-checkbox", done && "checked")}
          type="button"
          onClick={() => onStatus(task.id, done ? "InProgress" : "Completed")}
          aria-label={done ? "Mark task in progress" : "Mark task complete"}
        >
          {done ? <FiCheck /> : null}
        </button>
        <div>
          <strong className={done ? "done-text" : ""}>{task.title}</strong>
          <span>{task.assignedToUserName ?? "Unassigned"} / due {formatDate(task.dueDate)}</span>
        </div>
        <AvatarStack users={assignedUsers?.length ? assignedUsers : [primaryAssignee]} fallbacks={[task.assignedToUserName]} />
        <span className={classNames("due", task.isOverdue && "overdue")}>{formatDate(task.dueDate)}</span>
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <ColorPicker value={color} onChange={onColor} />
        <button className="view-btn" type="button" onClick={() => onView(task, "task")} title="View details">
          <FiEye />
        </button>
        <button className="view-btn" type="button" onClick={() => setOpen((current) => !current)} title="Expand task">
          <FiChevronDown className={open ? "rotated" : ""} />
        </button>
      </div>
      {open ? (
        <div className="task-expand open">
          <ProgressEditor task={task} onProgress={onProgress} onStatus={onStatus} />
          <Comments task={task} users={users} onComment={onComment} />
          {subtasks.length ? (
            <div className="subtask-stack">
              {subtasks.map((subtask) => (
                <ExpandableSubtask
                  key={subtask.id}
                  subtask={subtask}
                  users={users}
                  color={color}
                  onProgress={onProgress}
                  onComment={onComment}
                  onStatus={onStatus}
                  onView={() => onView(subtask, "subtask")}
                />
              ))}
            </div>
          ) : (
            <div className="empty-line">No subtasks yet.</div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ExpandableSubtask({
  subtask,
  users,
  color,
  onProgress,
  onComment,
  onStatus,
  onView,
}: {
  subtask: Task;
  users: User[];
  color: string;
  onProgress: (taskId: string, progress: number, notes?: string) => void;
  onComment: (taskId: string, content: string) => void;
  onStatus: (taskId: string, status: string) => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const done = subtask.status === "Completed" || subtask.progressPercentage >= 100;
  return (
    <article className="subtask-row">
      <button
        className={classNames("sub-dot-check", done && "checked")}
        type="button"
        style={{ borderColor: color, background: done ? color : undefined }}
        onClick={() => onStatus(subtask.id, done ? "InProgress" : "Completed")}
      />
      <button className="subtask-main" type="button" onClick={() => setOpen((current) => !current)}>
        <span className={done ? "done-text" : ""}>{subtask.title}</span>
      </button>
      <span className="subtask-progress">{subtask.progressPercentage}%</span>
      <AvatarStack users={[users.find((user) => user.id === subtask.assignedToUserId)]} fallbacks={[subtask.assignedToUserName]} />
      <div className="subtask-actions">
        <StatusBadge status={subtask.status} />
        <button className="view-btn" type="button" onClick={onView} title="View details">
          <FiEye />
        </button>
      </div>
      {open ? (
        <div className="subtask-expand">
          <ProgressEditor task={subtask} onProgress={onProgress} onStatus={onStatus} />
          <Comments task={subtask} users={users} onComment={onComment} />
        </div>
      ) : null}
    </article>
  );
}

function ControlBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="control-block">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

function ProgressEditor({
  task,
  onProgress,
  onStatus,
}: {
  task: Task;
  onProgress: (taskId: string, progress: number, notes?: string) => void;
  onStatus: (taskId: string, status: string) => void;
}) {
  const [progress, setProgress] = useState(task.progressPercentage);
  const [notes, setNotes] = useState("");
  return (
    <div className="progress-editor">
      <label>
        <span>{progress}%</span>
        <input type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} />
      </label>
      <div className="inline-form">
        <select value={task.status} onChange={(event) => onStatus(task.id, event.target.value)}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Progress note" />
        <button onClick={() => onProgress(task.id, progress, notes)}>Update</button>
      </div>
    </div>
  );
}

function Comments({ task, users, onComment }: { task: Task; users: User[]; onComment: (taskId: string, content: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <section className="comments">
      <strong>Comments</strong>
      {(task.comments ?? []).map((comment) => {
        const user = users.find((item) => item.id === comment.userId);
        return (
          <div className="comment" key={comment.id}>
            <div className="avatar small">{initials(user?.fullName ?? comment.userId)}</div>
            <div>
              <span>{user?.fullName ?? comment.userId}</span>
              <small>{formatDate(comment.createdDate)}</small>
              <p>{comment.content}</p>
            </div>
          </div>
        );
      })}
      <div className="comment-form">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add comment" />
        <button
          onClick={() => {
            onComment(task.id, draft);
            setDraft("");
          }}
        >
          Comment
        </button>
      </div>
    </section>
  );
}

export function KanbanBoard({
  tasks,
  projects,
  users,
  onView,
}: {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onView: (task: Task) => void;
}) {
  return (
    <section className="kanban-grid">
      {statuses.slice(0, 5).map((status) => {
        const statusTasks = tasks.filter((task) => task.status === status);
        return (
          <div className="kanban-col" key={status}>
            <div className="kanban-head">
              <strong>{status}</strong>
              <span>{statusTasks.length}</span>
            </div>
            {statusTasks.map((task) => {
              const project = projects.find((item) => item.id === task.projectId);
              const user = users.find((item) => item.id === task.assignedToUserId);
              return (
                <button className="kanban-card" key={task.id} onClick={() => onView(task)}>
                  <strong>{task.title}</strong>
                  <p>{project?.name ?? task.projectName ?? "No project"}</p>
                  <div>
                    <PriorityBadge priority={task.priority} />
                    <span className="avatar small">{initials(user?.fullName ?? task.assignedToUserName)}</span>
                  </div>
                  <ProgressBar value={task.progressPercentage} />
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

export function DetailModal({
  item,
  type,
  onClose,
}: {
  item: Project | Milestone | Task | null;
  type: "project" | "milestone" | "task" | "subtask";
  onClose: () => void;
}) {
  if (!item) return null;
  const title = "title" in item ? item.title : item.name;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="detail-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close detail modal">
          <FiX />
        </button>
        <span className="eyebrow">{type}</span>
        <h3>{title}</h3>
        <div className="modal-meta">
          {"status" in item ? <StatusBadge status={item.status} /> : null}
          {"priority" in item ? <PriorityBadge priority={item.priority} /> : null}
          {"progressPercentage" in item ? <span>{item.progressPercentage}% complete</span> : null}
        </div>
        {"description" in item && item.description ? <p>{item.description}</p> : <p>No description recorded.</p>}
        <dl>
          {Object.entries(item)
            .filter(([key]) => ["id", "projectCode", "departmentId", "projectId", "milestoneId", "dueDate", "plannedEndDate", "assignedToUserName"].includes(key))
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value ?? "None")}</dd>
              </div>
            ))}
        </dl>
      </section>
    </div>
  );
}
