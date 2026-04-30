import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type {
  AIModel,
  AIProvider,
  AISettingsResponse,
  BurnoutRiskRecord,
  Department,
  Milestone,
  NotificationItem,
  OrganizationRecord,
  Project,
  ProjectHealth,
  Task,
  User,
  WorkloadReport,
} from "./types";
import {
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  MetricRow,
  MetricTile,
  Notice,
  NotificationList,
  Panel,
  SimpleProjectCards,
  SimpleProjectList,
  StatCard,
  TaskList,
  UserTable,
  WorkloadBars,
  classNames,
  formatDate,
  formatMoney,
  formatPercent,
} from "./ui";

const projectStatuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];
const taskStatuses = ["NotStarted", "Assigned", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];
const priorities = ["Low", "Medium", "High", "Critical"];
const availabilityStatuses = ["Available", "Busy", "OnLeave", "PartiallyBusy"];

export function DashboardPage() {
  const { auth, hasRole } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.allSettled([
      api.getDashboard(auth.token),
      api.getMyTasks(auth.token),
      api.getNotifications(auth.token, true),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getOverdueTasks(auth.token) : Promise.resolve([]),
    ])
      .then(([dashboardResult, tasksResult, notificationsResult, overdueResult]) => {
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
        if (tasksResult.status === "fulfilled") setMyTasks(tasksResult.value);
        if (notificationsResult.status === "fulfilled") setUnread(notificationsResult.value);
        if (overdueResult.status === "fulfilled") setOverdue(overdueResult.value as Task[]);
        if (dashboardResult.status === "rejected") {
          setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard unavailable");
        }
      })
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <LoadingPanel label="Loading control room..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          {/* <p className="eyebrow">Mission Snapshot</p> */}
          <h3>{dashboard?.activeProjects ?? 0} active projects under watch</h3>
          <p>
            The dashboard blends project health, delay exposure, and operational load into one view so teams can move
            from signal to action without context switching.
          </p>
        </div>
        <div className="hero-band">
          <div>
            <span>Overall Health</span>
            <strong>{formatPercent(dashboard?.overallHealthScore ?? 0)}</strong>
          </div>
          <div>
            <span>Delay Risk</span>
            <strong>{formatPercent((dashboard?.overallDelayRisk ?? 0) * 100)}</strong>
          </div>
          <div>
            <span>Budget Variance</span>
            <strong>{formatMoney(dashboard?.budgetVariance ?? 0)}</strong>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Projects" value={dashboard?.totalProjects ?? 0} detail="Full portfolio volume" tone="teal" />
        <StatCard label="Tasks" value={dashboard?.totalTasks ?? 0} detail="Tracked work items" tone="rust" />
        <StatCard label="Overdue" value={dashboard?.overdueTasks ?? 0} detail="Tasks past target date" tone="ink" />
        <StatCard label="Available Members" value={dashboard?.availableMembers ?? 0} detail="Ready capacity" tone="gold" />
      </section>

      <Panel title="My Work Queue" subtitle="Priority view for the signed-in user">
        <TaskList tasks={myTasks.slice(0, 6)} />
      </Panel>

      <Panel title="Unread Notifications" subtitle="New alerts and system events">
        <NotificationList items={unread.slice(0, 6)} compact />
      </Panel>

      <Panel title="High Risk Projects" subtitle="AI and schedule pressure combined">
        <SimpleProjectList projects={dashboard?.highRiskProjects ?? []} />
      </Panel>

      <Panel title="Workload Distribution" subtitle="Team load and burnout exposure">
        <WorkloadBars items={dashboard?.workloadDistribution ?? []} />
      </Panel>

      {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
        <Panel title="Overdue Tasks" subtitle="Escalation candidates and blockers">
          <TaskList tasks={overdue.slice(0, 8)} />
        </Panel>
      ) : null}
    </div>
  );
}

export function ProjectsPage() {
  const { auth, hasRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [_message, setMessage] = useState("");
  const [form, setForm] = useState({
    projectCode: "",
    name: "",
    description: "",
    category: "Monitoring",
    plannedStartDate: "",
    plannedEndDate: "",
    plannedBudget: 25000,
    departmentId: "",
    projectManagerId: "",
    priority: "Medium",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    order: 1,
    isCritical: false,
  });

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  async function loadProjects() {
    if (!auth) return;
    const [projectData, departmentData, userData] = await Promise.all([
      api.getProjects(auth.token),
      api.getDepartments(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
    ]);
    setProjects(projectData);
    setDepartments(departmentData);
    setUsers(userData as User[]);
    if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
  }

  useEffect(() => {
    void loadProjects().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load projects."));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    Promise.allSettled([
      api.getMilestonesByProject(auth.token, selectedProjectId),
      api.getProjectInsights(auth.token, selectedProjectId),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")
        ? api.getProjectHealth(auth.token, selectedProjectId)
        : Promise.resolve(null),
    ]).then(([milestoneResult, insightResult, healthResult]) => {
      if (milestoneResult.status === "fulfilled") setMilestones(milestoneResult.value);
      if (insightResult.status === "fulfilled") setInsights(insightResult.value);
      if (healthResult.status === "fulfilled") setHealth(healthResult.value as ProjectHealth | null);
    });
  }, [auth, selectedProjectId]);

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    await api.createProject(auth.token, form);
    setMessage("Project created.");
    await loadProjects();
  }

  return (
    <div className="page-grid">
      <Panel title="Portfolio Board" subtitle="Projects, milestones, AI summaries, and budget posture">
        <div className="split">
          <div>
            <div className="section-row">
              <h4>Active Projects</h4>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <SimpleProjectCards projects={projects} onPick={setSelectedProjectId} selectedId={selectedProjectId} />
          </div>
          <div>
            {selectedProject ? (
              <div className="detail-card">
                <h4>{selectedProject.name}</h4>
                <p>{selectedProject.description || "No description provided."}</p>
                <MetricRow label="Budget" value={formatMoney(selectedProject.plannedBudget)} />
                <MetricRow label="Actual Cost" value={formatMoney(selectedProject.actualCost)} />
                <MetricRow label="Progress" value={formatPercent(selectedProject.progressPercentage)} />
                <MetricRow label="Health" value={formatPercent(selectedProject.aiHealthScore)} />
                <MetricRow label="Delay Risk" value={formatPercent(selectedProject.aiDelayRiskScore * 100)} />
                <MetricRow label="Status" value={selectedProject.status} />
                <MetricRow label="Department" value={selectedProject.departmentName || "Unknown"} />
                {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
                  <div className="inline-actions">
                    {projectStatuses.map((status) => (
                      <button
                        key={status}
                        className={classNames("ghost-button", selectedProject.status === status && "selected")}
                        onClick={async () => {
                          if (!auth) return;
                          await api.updateProjectStatus(auth.token, selectedProject.id, status);
                          await loadProjects();
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="chip-wrap">
                  {insights.map((insight) => (
                    <span className="signal-chip" key={insight}>
                      {insight}
                    </span>
                  ))}
                </div>
                {health ? (
                  <div className="health-grid">
                    <MetricTile label="Schedule" value={formatPercent(health.scheduleHealth)} />
                    <MetricTile label="Budget" value={formatPercent(health.budgetHealth)} />
                    <MetricTile label="Team" value={formatPercent(health.teamHealth)} />
                    <MetricTile label="Quality" value={formatPercent(health.qualityHealth)} />
                  </div>
                ) : null}
                <div className="file-row">
                  <input type="file" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                  <button
                    className="primary-button"
                    onClick={async () => {
                      if (!auth || !uploadFile) return;
                      await api.uploadProjectDocument(auth.token, selectedProject.id, uploadFile);
                      setMessage("Project document uploaded.");
                    }}
                  >
                    Upload Document
                  </button>
                  {hasRole("SuperAdmin") ? (
                    <button
                      className="danger-button"
                      onClick={async () => {
                        if (!auth) return;
                        await api.deleteProject(auth.token, selectedProject.id);
                        setSelectedProjectId("");
                        await loadProjects();
                      }}
                    >
                      Delete Project
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState title="No project selected" description="Choose a project to inspect milestones and AI signals." />
            )}
          </div>
        </div>
      </Panel>

      {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
        <Panel title="Create Project" subtitle="Manager-only project intake">
          <form className="form-grid" onSubmit={(event) => void handleCreateProject(event)}>
            <label><span>Project Code</span><input value={form.projectCode} onChange={(event) => setForm({ ...form, projectCode: event.target.value })} /></label>
            <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label><span>Start Date</span><input type="date" value={form.plannedStartDate} onChange={(event) => setForm({ ...form, plannedStartDate: event.target.value })} /></label>
            <label><span>End Date</span><input type="date" value={form.plannedEndDate} onChange={(event) => setForm({ ...form, plannedEndDate: event.target.value })} /></label>
            <label><span>Budget</span><input type="number" value={form.plannedBudget} onChange={(event) => setForm({ ...form, plannedBudget: Number(event.target.value) })} /></label>
            <label>
              <span>Priority</span>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                {priorities.map((priority) => (<option key={priority}>{priority}</option>))}
              </select>
            </label>
            <label>
              <span>Department</span>
              <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
                <option value="">Choose</option>
                {departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <label>
              <span>Project Manager</span>
              <select value={form.projectManagerId} onChange={(event) => setForm({ ...form, projectManagerId: event.target.value })}>
                <option value="">Choose</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
              </select>
            </label>
            <button className="primary-button wide" type="submit">Create Project</button>
          </form>
        </Panel>
      ) : null}

      {selectedProjectId && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
        <Panel title="Create Milestone" subtitle="Add milestone to selected project">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth || !selectedProjectId) return;
              void api.createMilestone(auth.token, { ...milestoneForm, projectId: selectedProjectId }).then(() => {
                setMessage("Milestone created.");
              });
            }}
          >
            <label><span>Name</span><input value={milestoneForm.name} onChange={(event) => setMilestoneForm({ ...milestoneForm, name: event.target.value })} /></label>
            <label><span>Due Date</span><input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, dueDate: event.target.value })} /></label>
            <label className="wide"><span>Description</span><textarea value={milestoneForm.description} onChange={(event) => setMilestoneForm({ ...milestoneForm, description: event.target.value })} /></label>
            <label><span>Order</span><input type="number" value={milestoneForm.order} onChange={(event) => setMilestoneForm({ ...milestoneForm, order: Number(event.target.value) })} /></label>
            <label>
              <span>Critical</span>
              <input type="checkbox" checked={milestoneForm.isCritical} onChange={(event) => setMilestoneForm({ ...milestoneForm, isCritical: event.target.checked })} />
            </label>
            <button className="primary-button wide" type="submit">Create Milestone</button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}

export function TasksPage() {
  const { auth, hasRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [delay, setDelay] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", description: "", startDate: "", dueDate: "", estimatedHours: 8, projectId: "", milestoneId: null as string | null, parentTaskId: null as string | null, assignedToUserId: "", priority: "Medium" });
  const [progressForm, setProgressForm] = useState({ progressPercentage: 50, notes: "" });
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  async function loadTasks(projectId?: string) {
    if (!auth) return;
    const [projectData, userData] = await Promise.all([
      api.getProjects(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") ? api.getAvailableUsers(auth.token) : Promise.resolve([]),
    ]);
    setProjects(projectData);
    setUsers(userData as User[]);
    const activeProjectId = projectId || selectedProjectId || projectData[0]?.id;
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
      const taskData = await api.getTasksByProject(auth.token, activeProjectId);
      setTasks(taskData);
      if (taskData[0] && !selectedTaskId) setSelectedTaskId(taskData[0].id);
    } else {
      setTasks(await api.getMyTasks(auth.token));
    }
  }

  useEffect(() => {
    void loadTasks().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load tasks."));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedTaskId || !hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead")) return;
    Promise.all([api.getTaskRecommendation(auth.token, selectedTaskId), api.getTaskDelayPrediction(auth.token, selectedTaskId)]).then(([recommendationData, delayData]) => {
      setRecommendation(recommendationData);
      setDelay(delayData);
    });
  }, [auth, selectedTaskId]);

  return <div className="page-grid"><Panel title="Task Command Center" subtitle="Assignments, progress, comments, timers, and escalation"><div className="split"><div><div className="section-row"><h4>Project Queue</h4><select value={selectedProjectId} onChange={(event) => void loadTasks(event.target.value)}>{projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}</select></div><TaskList tasks={tasks} onPick={setSelectedTaskId} selectedId={selectedTaskId} /></div><div>{selectedTask ? <div className="detail-card"><h4>{selectedTask.title}</h4><p>{selectedTask.description || "No task description yet."}</p><MetricRow label="Project" value={selectedTask.projectName || "Unlinked"} /><MetricRow label="Assignee" value={selectedTask.assignedToUserName || selectedTask.assignedToUserId || "Unassigned"} /><MetricRow label="Progress" value={formatPercent(selectedTask.progressPercentage)} /><MetricRow label="Priority" value={selectedTask.priority} /><MetricRow label="Due" value={formatDate(selectedTask.dueDate)} /><MetricRow label="Delay Risk" value={formatPercent(selectedTask.aiDelayProbability * 100)} /><div className="inline-actions">{taskStatuses.map((status) => (<button key={status} className={classNames("ghost-button", selectedTask.status === status && "selected")} onClick={async () => { if (!auth) return; await api.updateTaskStatus(auth.token, selectedTask.id, status); await loadTasks(selectedProjectId); }}>{status}</button>))}</div><form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); if (!auth || !selectedTask) return; void api.updateTaskProgress(auth.token, selectedTask.id, progressForm.progressPercentage, progressForm.notes).then(() => loadTasks(selectedProjectId)); }}><label><span>Progress</span><input type="range" min={0} max={100} value={progressForm.progressPercentage} onChange={(event) => setProgressForm({ ...progressForm, progressPercentage: Number(event.target.value) })} /></label><label className="wide"><span>Notes</span><textarea value={progressForm.notes} onChange={(event) => setProgressForm({ ...progressForm, notes: event.target.value })} /></label><button className="primary-button wide" type="submit">Update Progress</button></form><div className="inline-actions">{hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") ? <><select value={form.assignedToUserId} onChange={(event) => setForm({ ...form, assignedToUserId: event.target.value })}><option value="">Assign to...</option>{users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}</select><button className="primary-button" onClick={async () => { if (!auth || !selectedTask || !form.assignedToUserId) return; await api.assignTask(auth.token, selectedTask.id, form.assignedToUserId); await loadTasks(selectedProjectId); }}>Assign</button><button className="ghost-button" onClick={async () => { if (!auth || !selectedTask) return; await api.escalateTask(auth.token, selectedTask.id); await loadTasks(selectedProjectId); }}>Escalate</button></> : null}</div><div className="split narrow-gap"><form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); if (!auth || !selectedTask) return; void api.addTaskComment(auth.token, selectedTask.id, comment).then(() => setComment("")); }}><label className="wide"><span>Comment</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label><button className="ghost-button wide" type="submit">Add Comment</button></form><form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); if (!auth || !selectedTask) return; void api.startTaskTimer(auth.token, selectedTask.id, timerDescription).then(() => setMessage("Timer started.")); }}><label className="wide"><span>Timer Description</span><input value={timerDescription} onChange={(event) => setTimerDescription(event.target.value)} /></label><div className="inline-actions wide"><button className="ghost-button" type="submit">Start Timer</button><button className="ghost-button" type="button" onClick={async () => { if (!auth || !selectedTask) return; await api.stopTaskTimer(auth.token, selectedTask.id); setMessage("Timer stopped."); }}>Stop Timer</button></div></form></div><div className="file-row"><input type="file" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /><button className="ghost-button" onClick={async () => { if (!auth || !selectedTask || !attachment) return; await api.uploadTaskAttachment(auth.token, selectedTask.id, attachment); setMessage("Attachment uploaded."); }}>Upload Attachment</button>{hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? <button className="danger-button" onClick={async () => { if (!auth || !selectedTask) return; await api.deleteTask(auth.token, selectedTask.id); await loadTasks(selectedProjectId); }}>Delete</button> : null}</div>{recommendation || delay ? <div className="health-grid"><MetricTile label="Suggested Assignee" value={String(recommendation?.recommendedUserName ?? "Unknown")} /><MetricTile label="Confidence" value={String(recommendation ? formatPercent(recommendation.confidenceScore) : "N/A")} /><MetricTile label="Delay Risk" value={String(delay ? formatPercent(delay.delayProbability * 100) : "N/A")} /><MetricTile label="Risk Level" value={String(delay?.riskLevel ?? "N/A")} /></div> : null}</div> : <EmptyState title="No task selected" description="Pick a task to manage assignment, progress, and AI guidance." />}</div></div></Panel>{hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? <Panel title="Create Task" subtitle="Scope new work into the active project"><form className="form-grid" onSubmit={(event) => { event.preventDefault(); if (!auth) return; void api.createTask(auth.token, { ...form, projectId: selectedProjectId || form.projectId }).then(() => loadTasks(selectedProjectId || form.projectId)); }}><label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label><span>Start Date</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label><span>Due Date</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label><span>Estimate</span><input type="number" value={form.estimatedHours} onChange={(event) => setForm({ ...form, estimatedHours: Number(event.target.value) })} /></label><label><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((priority) => (<option key={priority}>{priority}</option>))}</select></label><label><span>Project</span><select value={selectedProjectId || form.projectId} onChange={(event) => setSelectedProjectId(event.target.value)}><option value="">Choose</option>{projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}</select></label><label><span>Assignee</span><select value={form.assignedToUserId} onChange={(event) => setForm({ ...form, assignedToUserId: event.target.value })}><option value="">Unassigned</option>{users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}</select></label><button className="primary-button wide" type="submit">Create Task</button></form></Panel> : null}{message ? <Notice>{message}</Notice> : null}</div>;
}

export function UsersPage() {
  const { auth, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workload, setWorkload] = useState<WorkloadReport | null>(null);
  const [message, setMessage] = useState("");
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Pmwds@123",
    jobTitle: "TeamMember",
    departmentId: "",
    role: "TeamMember",
  });
  const [skillForm, setSkillForm] = useState({ userId: "", skillId: "", proficiencyLevel: 3, experienceMonths: 12 });

  async function loadUsers() {
    if (!auth) return;
    const [userData, departmentData, workloadData] = await Promise.all([
      api.getUsers(auth.token),
      api.getDepartments(auth.token),
      api.getWorkload(auth.token),
    ]);
    setUsers(userData);
    setDepartments(departmentData);
    setWorkload(workloadData);
    if (!skillForm.userId && userData[0]) setSkillForm((current) => ({ ...current, userId: userData[0].id }));
  }

  useEffect(() => {
    void loadUsers().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load users."));
  }, [auth]);

  return (
    <div className="page-grid">
      <Panel title="People Operations" subtitle="Capacity, activation state, workload shape, and profile controls">
        <UserTable users={users} />
      </Panel>

      <Panel title="Workload View" subtitle="Availability and burnout exposure">
        <WorkloadBars items={workload?.members ?? []} />
      </Panel>

      {hasRole("SuperAdmin") ? (
        <Panel title="Register User" subtitle="Bootstrap new team members with role hints">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              void api.registerUser(auth.token, registerForm).then(() => loadUsers());
            }}
          >
            <label><span>First Name</span><input value={registerForm.firstName} onChange={(event) => setRegisterForm({ ...registerForm, firstName: event.target.value })} /></label>
            <label><span>Last Name</span><input value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} /></label>
            <label><span>Email</span><input value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} /></label>
            <label><span>Password</span><input value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} /></label>
            <label><span>Job Title</span><input value={registerForm.jobTitle} onChange={(event) => setRegisterForm({ ...registerForm, jobTitle: event.target.value })} /></label>
            <label>
              <span>Role</span>
              <select value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                <option>SuperAdmin</option><option>ProjectManager</option><option>DepartmentHead</option><option>TeamLead</option><option>TeamMember</option><option>Viewer</option>
              </select>
            </label>
            <label>
              <span>Department</span>
              <select value={registerForm.departmentId} onChange={(event) => setRegisterForm({ ...registerForm, departmentId: event.target.value })}>
                <option value="">None</option>
                {departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <button className="primary-button" type="submit">Register</button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Availability Controls" subtitle="Update readiness, add skills, or deactivate users">
        <div className="form-grid">
          <label>
            <span>User</span>
            <select value={skillForm.userId} onChange={(event) => setSkillForm({ ...skillForm, userId: event.target.value })}>
              {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
            </select>
          </label>
          <label>
            <span>Availability</span>
            <select
              onChange={(event) => {
                const user = users.find((item) => item.id === skillForm.userId);
                if (!auth || !user) return;
                void api.updateAvailability(auth.token, user.id, event.target.value, user.availabilityPercentage).then(() => loadUsers());
              }}
            >
              <option value="">Change status...</option>
              {availabilityStatuses.map((status) => (<option key={status}>{status}</option>))}
            </select>
          </label>
          <label><span>Skill Id</span><input value={skillForm.skillId} onChange={(event) => setSkillForm({ ...skillForm, skillId: event.target.value })} /></label>
          <label><span>Proficiency</span><input type="number" min={1} max={5} value={skillForm.proficiencyLevel} onChange={(event) => setSkillForm({ ...skillForm, proficiencyLevel: Number(event.target.value) })} /></label>
          <label><span>Experience Months</span><input type="number" value={skillForm.experienceMonths} onChange={(event) => setSkillForm({ ...skillForm, experienceMonths: Number(event.target.value) })} /></label>
          <div className="inline-actions wide">
            <button
              className="ghost-button"
              onClick={async () => {
                if (!auth || !skillForm.userId || !skillForm.skillId) return;
                await api.addUserSkill(auth.token, skillForm.userId, skillForm.skillId, skillForm.proficiencyLevel, skillForm.experienceMonths);
                setMessage("Skill attached to user.");
              }}
            >
              Add Skill
            </button>
            {hasRole("SuperAdmin") ? (
              <button
                className="danger-button"
                onClick={async () => {
                  if (!auth || !skillForm.userId) return;
                  await api.deactivateUser(auth.token, skillForm.userId);
                  await loadUsers();
                }}
              >
                Deactivate
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      {message ? <Notice>{message}</Notice> : null}
    </div>
  );
}

export function DepartmentsPage() {
  const { auth, hasRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    organizationId: "",
    parentDepartmentId: "",
    departmentHeadUserId: "",
    maxCapacity: 24,
  });

  async function loadDepartments() {
    if (!auth) return;
    const [data, organizationData, userData] = await Promise.all([
      api.getDepartments(auth.token),
      api.getOrganizations(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
    ]);
    setDepartments(data);
    setOrganizations(organizationData);
    setUsers(userData as User[]);
    if (!selectedId && data[0]) setSelectedId(data[0].id);
    if (!form.organizationId && organizationData[0]) {
      setForm((current) => ({ ...current, organizationId: current.organizationId || organizationData[0].id }));
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedId || !hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")) return;
    api.getDepartmentDashboard(auth.token, selectedId).then(setDashboard);
  }, [auth, selectedId]);

  const selectedDepartment = departments.find((department) => department.id === selectedId) ?? null;
  const selectedOrganization = organizations.find((organization) => organization.id === selectedDepartment?.organizationId);
  const departmentsInFormOrganization = departments.filter((department) => department.organizationId === form.organizationId);

  return (
    <div className="page-grid">
      <Panel title="Department Grid" subtitle="Structure, capacity, and delivery ownership">
        <div className="split">
          <div className="list-column">
            {departments.map((department) => (
              <button
                key={department.id}
                className={classNames("list-card", selectedId === department.id && "selected-card")}
                onClick={() => setSelectedId(department.id)}
              >
                <strong>{department.name}</strong>
                <span>{department.code}</span>
                <small>{organizations.find((org) => org.id === department.organizationId)?.name ?? "No organization"}</small>
                <small>Capacity {formatPercent(department.capacityUtilization)}</small>
              </button>
            ))}
          </div>
          <div className="detail-card">
            <h4>{dashboard?.["name"] ? String(dashboard["name"]) : "Department view"}</h4>
            <MetricRow label="Organization" value={selectedOrganization?.name ?? "Unassigned"} />
            <MetricRow label="Members" value={String(dashboard?.["teamMembers"] ?? "0")} />
            <MetricRow label="Active Projects" value={String(dashboard?.["activeProjects"] ?? "0")} />
            <MetricRow label="Completed Projects" value={String(dashboard?.["completedProjects"] ?? "0")} />
            <MetricRow label="Average Workload" value={String(Math.round(Number(dashboard?.["averageWorkload"] ?? 0)))} />
          </div>
        </div>
      </Panel>

      {hasRole("SuperAdmin") ? (
        <Panel title="Department Admin" subtitle="Create or remove organizational units">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              const payload = {
                ...form,
                organizationId: form.organizationId || null,
                parentDepartmentId: form.parentDepartmentId || null,
                departmentHeadUserId: form.departmentHeadUserId || null,
              };
              void api.createDepartment(auth.token, payload).then(() => loadDepartments());
            }}
          >
            <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label><span>Code</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>
              <span>Organization</span>
              <select value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value, parentDepartmentId: "" })}>
                <option value="">Unassigned</option>
                {organizations.map((organization) => (<option key={organization.id} value={organization.id}>{organization.name}</option>))}
              </select>
            </label>
            <label>
              <span>Parent Department</span>
              <select value={form.parentDepartmentId} onChange={(event) => setForm({ ...form, parentDepartmentId: event.target.value })}>
                <option value="">None</option>
                {departmentsInFormOrganization.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <label>
              <span>Department Head</span>
              <select value={form.departmentHeadUserId} onChange={(event) => setForm({ ...form, departmentHeadUserId: event.target.value })}>
                <option value="">Unassigned</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
              </select>
            </label>
            <label><span>Max Capacity</span><input type="number" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: Number(event.target.value) })} /></label>
            <div className="inline-actions wide">
              <button className="primary-button" type="submit">Create Department</button>
              {selectedId ? (
                <button
                  className="danger-button"
                  type="button"
                  onClick={async () => {
                    if (!auth) return;
                    await api.deleteDepartment(auth.token, selectedId);
                    await loadDepartments();
                  }}
                >
                  Delete Selected
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}

export function NotificationsPage() {
  const { auth, hasRole } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", departmentId: "", actionUrl: "" });

  async function loadNotifications() {
    if (!auth) return;
    setItems(await api.getNotifications(auth.token, unreadOnly));
  }

  useEffect(() => {
    void loadNotifications();
  }, [auth, unreadOnly]);

  return (
    <div className="page-grid">
      <Panel title="Inbox" subtitle="Alerts, AI observations, and operational signals">
        <div className="section-row">
          <label className="checkbox-row">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
            <span>Unread only</span>
          </label>
          <button className="ghost-button" onClick={() => auth && void api.markAllNotificationsRead(auth.token).then(loadNotifications)}>
            Mark All Read
          </button>
        </div>
        <NotificationList
          items={items}
          onRead={(id) => auth && api.markNotificationRead(auth.token, id).then(loadNotifications)}
          onDelete={(id) => auth && api.deleteNotification(auth.token, id).then(loadNotifications)}
        />
      </Panel>

      {hasRole("SuperAdmin") ? (
        <Panel title="Broadcast" subtitle="Push a system message to everyone or one department">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              void api.broadcastNotification(auth.token, {
                title: form.title,
                message: form.message,
                departmentId: form.departmentId || null,
                actionUrl: form.actionUrl || null,
              });
            }}
          >
            <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Department Id</span><input value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} /></label>
            <label className="wide"><span>Message</span><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
            <label className="wide"><span>Action Url</span><input value={form.actionUrl} onChange={(event) => setForm({ ...form, actionUrl: event.target.value })} /></label>
            <button className="primary-button wide" type="submit">Broadcast</button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}

export function AIPage() {
  const { auth } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [provider, setProvider] = useState("OpenAI");
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const deferredSearch = useDeferredValue(modelSearch);
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [chatPrompt, setChatPrompt] = useState("Summarize the highest operational risk in the current delivery portfolio.");
  const [chatResult, setChatResult] = useState<any>(null);
  const [burnout, setBurnout] = useState<BurnoutRiskRecord[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [delay, setDelay] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    Promise.all([api.getAiProviders(auth.token), api.getProjects(auth.token), api.getMyTasks(auth.token), api.getAiBurnoutRisk(auth.token)]).then(
      ([providerData, projectData, taskData, burnoutData]) => {
        setProviders(providerData);
        setProjects(projectData);
        setTasks(taskData);
        setBurnout(burnoutData);
        if (providerData[0]) setProvider(providerData[0].provider);
        if (projectData[0]) setSelectedProjectId(projectData[0].id);
        if (taskData[0]) setSelectedTaskId(taskData[0].id);
      },
    );
  }, [auth]);

  useEffect(() => {
    if (!auth || !provider) return;
    api.searchAiModels(auth.token, provider, deferredSearch).then((data) => {
      setModels(data);
      if (data[0]) setSelectedModel(data[0].id);
    });
  }, [auth, provider, deferredSearch]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    api.getAiProjectHealth(auth.token, selectedProjectId).then(setHealth);
  }, [auth, selectedProjectId]);

  useEffect(() => {
    if (!auth || !selectedTaskId) return;
    api.getTaskDelay(auth.token, selectedTaskId).then(setDelay);
  }, [auth, selectedTaskId]);

  return (
    <div className="page-grid">
      <Panel title="Provider Matrix" subtitle="Discover models, test providers, and steer prompt traffic">
        <div className="split">
          <div className="list-column">
            {providers.map((item) => (
              <button key={item.provider} className={classNames("list-card", provider === item.provider && "selected-card")} onClick={() => setProvider(item.provider)}>
                <strong>{item.displayName}</strong>
                <span>{item.defaultModel}</span>
                <small>{item.isConfigured ? "Configured" : "Missing key"}</small>
              </button>
            ))}
          </div>
          <div className="detail-card">
            <div className="section-row"><h4>Model Search</h4><input value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} placeholder="Search models" /></div>
            <div className="list-column">
              {models.map((item) => (
                <button key={item.id} className={classNames("model-card", selectedModel === item.id && "selected-card")} onClick={() => setSelectedModel(item.id)}>
                  <strong>{item.name}</strong>
                  <span>{item.id}</span>
                  <small>{item.contextLength ? `${item.contextLength.toLocaleString()} ctx` : "Context unknown"}</small>
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={async () => { if (!auth) return; setTestResult(await api.testAiProvider(auth.token, provider, selectedModel)); }}>Test Provider</button>
            {testResult ? <div className="detail-card nested"><MetricRow label="Provider" value={testResult.provider} /><MetricRow label="Model" value={testResult.model} /><MetricRow label="Result" value={testResult.success ? "Success" : "Failure"} /><p>{testResult.message}</p>{testResult.rawResponse ? <pre className="log-box">{testResult.rawResponse}</pre> : null}</div> : null}
          </div>
        </div>
      </Panel>

      <Panel title="AI Assistant" subtitle="Provider-aware chat against current PMWDS context">
        <div className="form-grid">
          <label className="wide"><span>Prompt</span><textarea value={chatPrompt} onChange={(event) => setChatPrompt(event.target.value)} /></label>
          <button className="primary-button" onClick={async () => { if (!auth) return; setChatResult(await api.chat(auth.token, chatPrompt, provider, selectedModel)); }}>Run Prompt</button>
          {chatResult ? <div className="wide detail-card"><MetricRow label="Intent" value={chatResult.intent} /><p>{chatResult.message}</p><div className="chip-wrap">{(chatResult.suggestedActions ?? []).map((item: string) => (<span className="signal-chip" key={item}>{item}</span>))}</div></div> : null}
        </div>
      </Panel>

      <Panel title="Predictive Signals" subtitle="Project health, burnout pressure, and task delay probability">
        <div className="split">
          <div className="detail-card">
            <label>
              <span>Project</span>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}
              </select>
            </label>
            {health ? <div className="health-grid"><MetricTile label="Overall" value={formatPercent(health.overallHealthScore)} /><MetricTile label="Schedule" value={formatPercent(health.scheduleHealth)} /><MetricTile label="Budget" value={formatPercent(health.budgetHealth)} /><MetricTile label="Team" value={formatPercent(health.teamHealth)} /></div> : null}
          </div>
          <div className="detail-card">
            <label>
              <span>Task</span>
              <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                {tasks.map((task) => (<option key={task.id} value={task.id}>{task.title}</option>))}
              </select>
            </label>
            {delay ? <><MetricRow label="Delay Probability" value={formatPercent(delay.delayProbability * 100)} /><MetricRow label="Risk Level" value={delay.riskLevel} /><MetricRow label="Predicted Completion" value={formatDate(delay.predictedCompletionDate)} /><div className="chip-wrap">{(delay.contributingFactors ?? []).map((item: string) => (<span className="signal-chip" key={item}>{item}</span>))}</div></> : null}
          </div>
        </div>
      </Panel>

      <Panel title="Burnout Risk" subtitle="AI-flagged capacity pressure across the team">
        <div className="list-column">
          {burnout.map((item, index) => (
            <div className="list-card" key={`${item["userId"]}-${index}`}>
              <strong>{String(item["fullName"] ?? "Unknown")}</strong>
              <span>Risk {formatPercent(Number(item["burnoutRisk"] ?? 0) * 100)}</span>
              <small>Workload {formatPercent(Number(item["workloadScore"] ?? 0))}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function ReportsPage() {
  const { auth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [filters, setFilters] = useState({ projectId: "", departmentId: "", startDate: "", endDate: "", status: "" });

  useEffect(() => {
    if (!auth) return;
    Promise.all([api.getProjects(auth.token), api.getDepartments(auth.token)]).then(([projectData, departmentData]) => {
      setProjects(projectData);
      setDepartments(departmentData);
      if (projectData[0]) setFilters((current) => ({ ...current, projectId: current.projectId || projectData[0].id }));
      if (departmentData[0]) setFilters((current) => ({ ...current, departmentId: current.departmentId || departmentData[0].id }));
    });
  }, [auth]);

  async function download(label: string, action: () => Promise<Blob>) {
    const blob = await action();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${label}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloads((current) => [label, ...current].slice(0, 5));
  }

  return (
    <div className="page-grid">
      <Panel title="Report Studio" subtitle="Generate portfolio, workload, delay, and budget outputs">
        <div className="form-grid">
          <label><span>Project</span><select value={filters.projectId} onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}>{projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}</select></label>
          <label><span>Department</span><select value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>{departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}</select></label>
          <label><span>Start Date</span><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
          <label><span>End Date</span><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
          <label><span>Status</span><input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} /></label>
        </div>
        <div className="report-grid">
          <button className="primary-button" onClick={() => auth && void download("project-status", () => api.downloadReport(auth.token, `reports/project-status/${filters.projectId}`))}>Project Status</button>
          <button className="primary-button" onClick={() => auth && void download("budget-variance", () => api.downloadReport(auth.token, `reports/budget-variance/${filters.projectId}`))}>Budget Variance</button>
          <button className="primary-button" onClick={() => auth && void download("task-completion", () => api.downloadReport(auth.token, "reports/task-completion", { method: "POST", body: filters }))}>Task Completion</button>
          <button className="primary-button" onClick={() => auth && void download("department-workload", () => api.downloadReport(auth.token, "reports/department-workload", { method: "POST", body: { departmentId: filters.departmentId, startDate: filters.startDate || new Date().toISOString(), endDate: filters.endDate || new Date().toISOString() } }))}>Department Workload</button>
          <button className="primary-button" onClick={() => auth && void download("delay-analysis", () => api.downloadReport(auth.token, "reports/delay-analysis", { method: "POST", body: filters }))}>Delay Analysis</button>
        </div>
      </Panel>

      <Panel title="Recent Exports" subtitle="The last report actions from this browser session">
        <div className="list-column">
          {downloads.map((item) => (
            <div className="list-card" key={item}>
              <strong>{item}</strong>
              <span>Downloaded</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("admin@pmwds.com");
  const [password, setPassword] = useState("Pmwds@123");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>PMWDS Login</h2>
        {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { logout, auth, hasRole } = useAuth();
  const [saved, setSaved] = useState("");
  const isSuperAdmin = hasRole("SuperAdmin");
  const isDev = import.meta.env.DEV;

  const [aiSettings, setAiSettings] = useState<AISettingsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState("");
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<{ [key: string]: string }>({});
  const [customResponse, setCustomResponse] = useState<{ [key: string]: string }>({});
  const [testingCustom, setTestingCustom] = useState<string | null>(null);
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; free: boolean }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin || !auth) return;
    setAiLoading(true);
    api.getAISettings(auth.token)
      .then(settings => {
        const providers = settings.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter");
        const defaultProvider = providers.some(p => p.provider === settings.defaultProvider)
          ? settings.defaultProvider
          : "OpenAI";
        setAiSettings({ ...settings, providers, defaultProvider });
        if (settings.defaultProvider === "OpenRouter" && !openRouterModels.length) {
          fetchOpenRouterModels();
        }
      })
      .catch(e => setAiError(e instanceof Error ? e.message : "Failed to load AI settings"))
      .finally(() => setAiLoading(false));
  }, [auth, isSuperAdmin]);

  useEffect(() => {
    if (aiSettings?.defaultProvider === "OpenRouter" && !openRouterModels.length) {
      fetchOpenRouterModels();
    }
  }, [aiSettings?.defaultProvider]);

  const handleSaveAI = async () => {
    if (!aiSettings || !auth) return;
    setAiSaving(true);
    setAiError("");
    try {
      const result = await api.saveAISettings(auth.token, {
        defaultProvider: aiSettings.defaultProvider,
        defaultModel: aiSettings.defaultModel,
        riskThreshold: aiSettings.riskThreshold,
        useLocalModel: aiSettings.useLocalModel,
        mlModelPath: aiSettings.mlModelPath,
        providers: aiSettings.providers
          .filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter")
          .map(p => ({
          provider: p.provider,
          displayName: p.displayName,
          enabled: p.enabled,
          baseUrl: p.baseUrl,
          apiKey: p.apiKey || "",
          defaultModel: p.defaultModel,
        })),
      });
      setSaved(result.message);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to save AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  const testProvider = async (provider: string, apiKey: string, model?: string) => {
    if (!apiKey && !(isDev && provider === "OpenRouter")) {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "API key required" } }));
      return;
    }
    setTestingProvider(provider);
    try {
      const testModel = model || aiSettings?.providers.find(p => p.provider === provider)?.defaultModel;
      const result = await api.testAiProvider(auth!.token, provider, testModel, "Hi");
      setTestResults(prev => ({ ...prev, [provider]: { success: result.success, message: result.message } }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: e instanceof Error ? e.message : "Connection failed" } }));
    } finally {
      setTestingProvider(null);
    }
  };

  const testCustomPrompt = async (provider: string, _apiKey: string, selectedModel?: string) => {
    const prompt = customPrompt[provider]?.trim();
    if (!prompt) {
      setCustomResponse(prev => ({ ...prev, [provider]: "Please enter a test prompt" }));
      return;
    }
    setTestingCustom(provider);
    try {
      const model = selectedModel || aiSettings?.providers.find(p => p.provider === provider)?.defaultModel;
      const result = await api.testAiProvider(auth!.token, provider, model, prompt);
      setCustomResponse(prev => ({ ...prev, [provider]: result.rawResponse || result.message }));
    } catch (e) {
      setCustomResponse(prev => ({ ...prev, [provider]: e instanceof Error ? e.message : "Connection failed" }));
    } finally {
      setTestingCustom(null);
    }
  };

  const fetchOpenRouterModels = async () => {
    if (!auth) return;
    setLoadingModels(true);
    try {
      const apiKey = aiSettings?.providers.find(p => p.provider === "OpenRouter")?.apiKey;
      const response = await fetch("https://openrouter.ai/api/v1/models?limit=100", {
        headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
      });
      const data = await response.json();
      const allModels = (data.data || [])
        .map((m: { id: string }) => ({ 
          id: m.id, 
          name: m.id, 
          free: m.id.toLowerCase().includes("free") || m.id.toLowerCase().includes("mini")
        }));
      const freeModels = allModels.filter((m: { free: boolean }) => m.free).slice(0, 15);
      const otherModels = allModels.filter((m: { free: boolean }) => !m.free).slice(0, 15);
      setOpenRouterModels([...freeModels, ...otherModels]);
    } catch (e) {
      console.error("Failed to fetch OpenRouter models:", e);
      setAiError("Failed to fetch models from OpenRouter");
    } finally {
      setLoadingModels(false);
    }
  };

  const updateProvider = (provider: string, field: string, value: unknown) => {
    if (!aiSettings) return;
    setAiSettings({
      ...aiSettings,
      providers: aiSettings.providers.map(p =>
        p.provider === provider ? { ...p, [field]: value } : p
      ),
    });
    setTestResults(prev => { const next = { ...prev }; delete next[provider]; return next; });
  };

  const handleSave = () => {
    setSaved("Settings saved!");
    setTimeout(() => setSaved(""), 2000);
  };

  if (!isSuperAdmin) {
    return (
      <div className="page">
        <Panel title="Settings" subtitle="Manage your preferences">
          {saved && <div style={{ color: "green", marginBottom: "1rem" }}>{saved}</div>}
          <div className="form-grid">
            <label><span>Email</span><input value={auth?.email ?? ""} disabled /></label>
            <label><span>Name</span><input value={auth?.fullName ?? ""} disabled /></label>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleSave}>Save Settings</button>
            <button onClick={logout} style={{ marginLeft: "0.5rem", background: "#dc3545" }}>Logout</button>
          </div>
        </Panel>
      </div>
    );
  }

  if (aiLoading) return <LoadingPanel label="Loading settings..." />;

  return (
    <div className="page">
      <Panel title="Settings" subtitle="Manage your preferences">
        {saved && <div style={{ color: "green", marginBottom: "1rem" }}>{saved}</div>}
        <div className="form-grid">
          <label><span>Email</span><input value={auth?.email ?? ""} disabled /></label>
          <label><span>Name</span><input value={auth?.fullName ?? ""} disabled /></label>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSave}>Save Settings</button>
          <button onClick={logout} style={{ marginLeft: "0.5rem", background: "#dc3545" }}>Logout</button>
        </div>
      </Panel>

      <Panel title="AI Configuration" subtitle="Configure AI providers (SuperAdmin only)" style={{ marginTop: "1.5rem" }}>
        {aiError && <div style={{ color: "red", marginBottom: "1rem" }}>{aiError}</div>}
        
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Default Provider</h4>
          <div className="form-grid">
            <label><span>Provider</span>
              <select
                value={aiSettings?.defaultProvider ?? "OpenAI"}
                onChange={e => setAiSettings(prev => prev ? { ...prev, defaultProvider: e.target.value } : null)}
              >
                <option value="OpenAI">OpenAI</option>
                <option value="OpenRouter">OpenRouter</option>
              </select>
            </label>
            <label><span>Model</span>
              {aiSettings?.defaultProvider === "OpenRouter" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={aiSettings?.defaultModel ?? ""}
                    onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select a model...</option>
                    {openRouterModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchOpenRouterModels}
                    disabled={loadingModels}
                    style={{ background: "#6c757d", whiteSpace: "nowrap" }}
                  >
                    {loadingModels ? "Loading..." : "Fetch Models"}
                  </button>
                </div>
              ) : (
                <input
                  value={aiSettings?.defaultModel ?? ""}
                  onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                  placeholder="e.g., gpt-4o"
                />
              )}
            </label>
            <label><span>Risk Threshold</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings?.riskThreshold ?? 0.7}
                onChange={e => setAiSettings(prev => prev ? { ...prev, riskThreshold: parseFloat(e.target.value) } : null)}
              />
            </label>
          </div>
        </div>

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>AI Providers</h4>
        {aiSettings?.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter").map(provider => (
          <div key={provider.provider} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                id={`${provider.provider}-enabled`}
                checked={provider.enabled}
                onChange={e => updateProvider(provider.provider, "enabled", e.target.checked)}
              />
              <label htmlFor={`${provider.provider}-enabled`} style={{ fontWeight: "bold" }}>
                {provider.displayName} ({provider.provider})
              </label>
            </div>
            <div className="form-grid">
              <label><span>Base URL</span>
                <input
                  value={provider.baseUrl}
                  onChange={e => updateProvider(provider.provider, "baseUrl", e.target.value)}
                  disabled={!provider.enabled}
                />
              </label>
              <label><span>API Key</span>
                <input
                  type="password"
                  value={provider.apiKey}
                  onChange={e => updateProvider(provider.provider, "apiKey", e.target.value)}
                  placeholder={isDev && provider.provider === "OpenRouter" ? "Using dev test key (sk-or-...)" : "Enter API key"}
                  disabled={!provider.enabled}
                />
              </label>
              <label><span>Model</span>
                {provider.provider === "OpenRouter" && provider.enabled ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={provider.defaultModel}
                      onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select model...</option>
                      {openRouterModels.map(m => (
                        <option key={m.id} value={m.id}>{m.free ? "[free] " : ""}{m.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={fetchOpenRouterModels}
                      disabled={loadingModels}
                      style={{ background: "#6c757d", whiteSpace: "nowrap" }}
                    >
                      {loadingModels ? "..." : "Reload"}
                    </button>
                  </div>
                ) : (
                  <input
                    value={provider.defaultModel}
                    onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                    placeholder={provider.provider === "OpenAI" ? "gpt-4o" : "openai/gpt-4o-mini"}
                    disabled={!provider.enabled}
                  />
                )}
              </label>
              <label>
                <span>&nbsp;</span>
                <button
                  onClick={() => testProvider(provider.provider, provider.apiKey, provider.defaultModel)}
                  disabled={testingProvider === provider.provider || !provider.enabled}
                  style={{ background: testResults[provider.provider]?.success ? "#28a745" : testResults[provider.provider]?.success === false ? "#dc3545" : "#6c757d" }}
                >
                  {testingProvider === provider.provider ? "Testing..." : testResults[provider.provider] ? (testResults[provider.provider].success ? "Connected" : "Failed") : "Test Connection"}
                </button>
              </label>
            </div>
            {testResults[provider.provider] && (
              <div style={{ 
                marginTop: "0.5rem", 
                padding: "0.5rem", 
                borderRadius: "4px",
                background: testResults[provider.provider].success ? "#d4edda" : "#f8d7da",
                color: testResults[provider.provider].success ? "#155724" : "#721c24"
              }}>
                {testResults[provider.provider].message}
              </div>
            )}

            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>Custom Test Prompt</label>
              <textarea
                value={customPrompt[provider.provider] || ""}
                onChange={e => setCustomPrompt(prev => ({ ...prev, [provider.provider]: e.target.value }))}
                placeholder="Enter a custom prompt to test the AI..."
                disabled={!provider.enabled}
                rows={3}
                style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem", fontFamily: "monospace" }}
              />
              <button
                onClick={() => testCustomPrompt(provider.provider, provider.apiKey, provider.defaultModel)}
                disabled={testingCustom === provider.provider || !provider.enabled || !customPrompt[provider.provider]?.trim()}
                style={{ background: "#17a2b8", marginBottom: "0.5rem" }}
              >
                {testingCustom === provider.provider ? "Testing..." : "Run Custom Prompt"}
              </button>
              {customResponse[provider.provider] && (
                <div style={{ 
                  marginTop: "0.5rem", 
                  padding: "0.5rem", 
                  borderRadius: "4px",
                  background: "#2d2d2d",
                  border: "1px solid #555",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  maxHeight: "200px",
                  overflow: "auto",
                  color: "#e0e0e0"
                }}>
                  {customResponse[provider.provider]}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSaveAI} disabled={aiSaving}>
            {aiSaving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
