import { useCallback, useEffect, useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { NotificationItem, Task, Department, OrganizationRecord, User, Project, Milestone, ActivityLogRecord } from "../../types";
import { NotificationList } from "../shared/NotificationList";
import { WorkloadBars } from "../shared/WorkloadBars";
import type { WorkloadItem } from "../shared/WorkloadBars";
import { ActiveObjectives } from "./ActiveObjectives";
import { PageSkeleton, useNavHeader, useToast, ModalOverlay } from "../shared";
import { PERMISSION_GROUPS, usePermission } from "../shared";
import { notificationTarget } from "../shared/notificationLinks";
import { useUserOrganization } from "../shared/useUserOrganization";
import { NewProjectPage } from "../NewProject/NewProjectPage";
import TaskStats from "../shared/dash/TaskStats";
import type { TaskStatBucket, TaskStatFilter, TaskStatKind } from "../shared/dash/TaskStats";
import TaskPerformanceTable, { type TaskPerformanceQuery } from "../shared/dash/TaskPerformanceTable";
import { TaskEditModal } from "../shared/modals/TaskEditModal";
import { HighRiskInterventions } from "../shared/dash/HighRiskInterventions";
import DashboardStats from "./dashboardStats";
import { ProjectOverview } from "../shared/dash/ProjectOverviewChart";
import { Activity } from "../shared/dash/Activity";
import { ProjectFormModal, type ProjectFormState } from "../projectsK/components";

// Temporarily hidden dashboard widgets. Kept behind flags (not deleted) so
// they can be restored by flipping these back to true.
//   SHOW_MY_TASKS          - "My Tasks" (Active Objectives) card
//   SHOW_WORKLOAD_DISTRIBUTION - "Workload Distribution" card
//   SHOW_ACTIVITY_FILTER   - "All Tasks / My Tasks / Team Tasks" dropdown on the Activity card
const SHOW_MY_TASKS = false;
const SHOW_WORKLOAD_DISTRIBUTION = false;
const SHOW_ACTIVITY_FILTER = false;

/**
 * How many tasks each stat card's hover list fetches.
 *
 * Small on purpose: the card value is the server's exact filtered totalCount,
 * and the hover list only needs a representative handful to scroll through.
 * Pulling every task just to count them client-side meant the number was capped
 * at whatever page was fetched.
 */
const TASK_POPUP_PAGE_SIZE = 10;

const emptyProjectForm = (): ProjectFormState => ({
  projectCode: "",
  name: "",
  description: "",
  category: "Monitoring",
  plannedStartDate: new Date().toISOString().split("T")[0],
  plannedEndDate: "",
  plannedBudget: 0,
  organizationId: "",
  departmentId: "",
  departmentIds: [],
  projectManagerId: "",
  priority: "Medium",
});

export function DashboardPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const navigate = useNavigate();
  const { setNavHeader } = useNavHeader();
  const { refresh: refreshAppData } = useAppData();
  const { addToast } = useToast();
  const canManageProjects = perm.has(PERMISSION_GROUPS.project.manage);
  const canViewTasks = perm.has(PERMISSION_GROUPS.task.view);
  // Per-status buckets behind the task stat cards. Each holds the server's
  // exact total for that status plus a short list for its hover panel.
  //
  // Deliberately NOT /tasks/my-tasks: that endpoint returns every task in scope
  // for a superadmin, but for anyone else only their own tasks with Completed
  // and Cancelled filtered out, so the Completed card could never be non-zero.
  // These buckets are the same population the Task Performance table below
  // shows, so the cards and the table cannot disagree.
  const [taskBuckets, setTaskBuckets] = useState<Partial<Record<TaskStatKind, TaskStatBucket>>>({});
  const [taskBucketsLoading, setTaskBucketsLoading] = useState(true);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  // Flat task list for the two widgets still behind feature flags. Fetched
  // lazily and only when one of those flags is actually on - the stat cards no
  // longer hold a full list, and handing a 10-row page to the workload
  // calculation would just produce wrong numbers.
  const [breakdownTasks, setBreakdownTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Milestones for the task the detail modal has open, so it can show which
  // milestone the task sits under. Loaded on demand rather than for every
  // project, since only one modal is ever open at a time.
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escalatedTasks, setEscalatedTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [taskPerformanceTasks, setTaskPerformanceTasks] = useState<Task[]>([]);
  const [taskPerformancePage, setTaskPerformancePage] = useState(1);
  const [taskPerformancePageSize, setTaskPerformancePageSize] = useState(10);
  const [taskPerformanceTotalCount, setTaskPerformanceTotalCount] = useState(0);
  const [taskPerformanceTotalPages, setTaskPerformanceTotalPages] = useState(1);
  const [taskPerformanceLoading, setTaskPerformanceLoading] = useState(false);
  const [lastTaskPerformanceQuery, setLastTaskPerformanceQuery] = useState<TaskPerformanceQuery | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedActivityFilter, setSelectedActivityFilter] = useState("All Tasks");
  // Filter seeded into the task performance table by a TaskStats click.
  // A filter object rather than a status string because the Delayed card needs
  // "past due", which no status value expresses.
  const [taskTableFilter, setTaskTableFilter] = useState<TaskStatFilter>({});


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());
  const [newProjectWizardOpen, setNewProjectWizardOpen] = useState(false);
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  useEffect(() => {
    setNavHeader({
      title: "Dashboard",
      description: "Overview of projects, tasks, and key metrics",
      action: canManageProjects ? {
        label: "New Project",
        onClick: () => setNewProjectWizardOpen(true),
        icon: "add_circle",
      } : undefined,
    });
  }, [setNavHeader, canManageProjects, shouldFilterByOrg, userOrganizationId]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    try {
      await api.createProject(auth.token, projectForm);
      setShowCreateModal(false);
      setProjectForm(emptyProjectForm());
      addToast("Project created");
      await refreshAppData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create project", "error");
    }
  };

  // One query per card. Each is filtered server-side and ordered so the short
  // page the hover list gets is the most useful slice: soonest due date first
  // for open work, most recently due first for finished work.
  const loadTaskBuckets = useCallback(async () => {
    if (!auth || !canViewTasks) {
      setTaskBuckets({});
      setTaskBucketsLoading(false);
      return;
    }

    setTaskBucketsLoading(true);

    const statusQueries: Array<[TaskStatKind, Promise<{ items: Task[]; totalCount: number }>]> = [
      ["Total", api.getTasks(auth.token, { page: 1, pageSize: TASK_POPUP_PAGE_SIZE, sortBy: "dueDate", sortDirection: "asc" })],
      ["InProgress", api.getTasks(auth.token, { page: 1, pageSize: TASK_POPUP_PAGE_SIZE, statuses: "InProgress", sortBy: "dueDate", sortDirection: "asc" })],
      ["OnHold", api.getTasks(auth.token, { page: 1, pageSize: TASK_POPUP_PAGE_SIZE, statuses: "OnHold", sortBy: "dueDate", sortDirection: "asc" })],
      ["Completed", api.getTasks(auth.token, { page: 1, pageSize: TASK_POPUP_PAGE_SIZE, statuses: "Completed", sortBy: "dueDate", sortDirection: "desc" })],
      // Delayed is past-due-and-unfinished of any status. It must come from this
      // same endpoint rather than tasks/overdue: that endpoint does not exclude
      // subtasks, so it reported 77 against this one's 20 for the same
      // workspace, and the card would still have disagreed with the list its own
      // click opens. Every other card already counts top-level tasks only.
      ["Delayed", api.getTasks(auth.token, { page: 1, pageSize: TASK_POPUP_PAGE_SIZE, overdue: true, sortBy: "dueDate", sortDirection: "asc" })],
    ];

    const settled = await Promise.allSettled(statusQueries.map(([, promise]) => promise));

    const next: Partial<Record<TaskStatKind, TaskStatBucket>> = {};
    settled.forEach((result, index) => {
      const kind = statusQueries[index][0];
      next[kind] =
        result.status === "fulfilled"
          ? { total: result.value.totalCount, items: result.value.items }
          : { total: 0, items: [] };
    });

    setTaskBuckets(next);
    setTaskBucketsLoading(false);
  }, [auth, canViewTasks]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    // Every card on this page is counted from the project and task lists, so
    // the dashboard aggregate endpoint is no longer requested. It reported
    // different totals from the same data (and had no project collection at
    // all), which is what left the Project Overview donut permanently empty.
    Promise.allSettled([
      loadTaskBuckets(),
      api.getNotifications(auth.token, true),
      api.getDepartments(auth.token),
      api.getOrganizations(auth.token),
      api.getUsers(auth.token),
      api.getProjects(auth.token),
      canViewTasks ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
      api.getTeamActivityLogs(auth.token, 200),
    ])
      .then(([, notificationsResult, departmentsResult, organizationsResult, usersResult, projectsResult, escalatedResult, activityResult]) => {
        if (notificationsResult.status === "fulfilled") setUnread(Array.isArray(notificationsResult.value) ? notificationsResult.value : []);
        if (departmentsResult.status === "fulfilled") setDepartments(departmentsResult.value);
        if (organizationsResult.status === "fulfilled") setOrganizations(organizationsResult.value as OrganizationRecord[]);
        if (usersResult.status === "fulfilled") setUsers(usersResult.value);
        if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
        if (escalatedResult.status === "fulfilled") setEscalatedTasks(escalatedResult.value as Task[]);
        if (activityResult.status === "fulfilled") setActivityLogs(Array.isArray(activityResult.value) ? activityResult.value : []);

        // Only the project list is load-bearing now: without it every card reads
        // zero. Surface that rather than rendering an empty dashboard.
        if (projectsResult.status === "rejected") {
          setError(
            projectsResult.reason instanceof Error
              ? projectsResult.reason.message
              : "Projects could not be loaded."
          );
        }
      })
      .finally(() => setLoading(false));
  }, [auth, canViewTasks, loadTaskBuckets]);

  // Only fetched when a widget behind SHOW_MY_TASKS / SHOW_WORKLOAD_DISTRIBUTION
  // is enabled. Both are off, so this costs nothing today.
  useEffect(() => {
    if (!auth) return;
    if (!SHOW_MY_TASKS && !SHOW_WORKLOAD_DISTRIBUTION) return;
    api
      .getTasks(auth.token, { page: 1, pageSize: 200 })
      .then((response) => setBreakdownTasks(response.items))
      .catch(() => setBreakdownTasks([]));
  }, [auth]);

  const canEditTasks = perm.hasAny(
    PERMISSION_GROUPS.task.edit,
    PERMISSION_GROUPS.task.create,
    PERMISSION_GROUPS.task.assign,
  );

  const loadTaskPerformance = useCallback(async (query: TaskPerformanceQuery) => {
    if (!auth) return;

    setLastTaskPerformanceQuery(query);
    setTaskPerformanceLoading(true);
    try {
      const response = await api.getTasks(auth.token, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        projectId: query.projectId,
        departmentId: query.departmentId,
        statuses: query.statuses?.join(","),
        priorities: query.priorities?.join(","),
        overdue: query.overdueOnly || undefined,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      });
      setTaskPerformanceTasks(response.items);
      setTaskPerformancePage(response.page);
      setTaskPerformancePageSize(response.pageSize);
      setTaskPerformanceTotalCount(response.totalCount);
      setTaskPerformanceTotalPages(response.totalPages);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load task performance data", "error");
      setTaskPerformanceTasks([]);
      setTaskPerformanceTotalCount(0);
      setTaskPerformanceTotalPages(1);
    } finally {
      setTaskPerformanceLoading(false);
    }
  }, [auth, addToast]);

  const openTaskDetails = async (task: Task) => {
    if (!auth) return;
    try {
      const freshTask = await api.getTask(auth.token, task.id);
      setSelectedTask(freshTask);
      // The modal shows the milestone name, so fetch the project's milestones
      // for the same task. A failure here is not worth blocking the modal for -
      // it falls back to the name on the task itself.
      const rows = await api.getMilestonesByProject(auth.token, freshTask.projectId);
      setMilestones(rows);
    } catch {
      setSelectedTask(task);
    }
  };

  const openTaskEditor = async (task: Task) => {
    if (!auth) return;
    setSelectedTask(task);
  };

  /**
   * Escalation rows carry the task's projectId and milestoneId, so a click can
   * go straight to the task inside its project rather than to a list the user
   * then has to search.
   */
  const openEscalatedTask = (task: Task) => {
    if (task.projectId) {
      navigate(`/projects/${task.projectId}/tasks?task=${task.id}`);
    } else {
      navigate("/projects");
    }
  };

  /**
   * Opening a notification from the dashboard settles its read state before
   * navigating, so the badge count drops as soon as the user has acted on it.
   */
  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead && auth) {
      try {
        await api.markNotificationRead(auth.token, item.id);
        setUnread((current) => current.filter((n) => n.id !== item.id));
        await refreshAppData();
      } catch {
        // Read state is not worth blocking navigation over.
      }
    }
    navigate(notificationTarget(item));
  };

  const handleTaskStatsSelect = (filter: TaskStatFilter) => {
    setTaskTableFilter(filter);
  };


  const refreshTaskLists = async () => {
    if (!auth) return;
    // Re-pull the same buckets the cards summarise, so an edit or an escalate is
    // reflected in the counts without a full page reload.
    const [, escalated] = await Promise.all([
      loadTaskBuckets(),
      canEditTasks ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
    ]);
    setEscalatedTasks(escalated);
    if (lastTaskPerformanceQuery) {
      await loadTaskPerformance(lastTaskPerformanceQuery);
    }
    if (selectedTask) {
      setSelectedTask(await api.getTask(auth.token, selectedTask.id));
    }
  };

  const departmentWorkload: WorkloadItem[] = useMemo(() => {
    return departments.map((dept) => {
      const deptUsers = users.filter((u) => u.departmentId === dept.id);
      const deptTasks = breakdownTasks.filter((t) => {
        const assignee = users.find((u) => u.id === t.assignedToUserId);
        return assignee?.departmentId === dept.id;
      });

      const totalTasks = deptTasks.length;
      const completedTasks = deptTasks.filter((t) => t.status === "Completed" || t.progressPercentage === 100).length;
      const activeTasks = totalTasks - completedTasks;

      const memberCount = deptUsers.length;
      const avgWorkload = memberCount > 0
        ? deptUsers.reduce((sum, u) => sum + u.aiWorkloadScore, 0) / memberCount
        : 0;

      const workloadScore = memberCount > 0
        ? (totalTasks / memberCount) * 10 + avgWorkload
        : totalTasks * 10;

      return {
        id: dept.id,
        name: dept.name,
        score: Math.min(workloadScore, 150),
        activeTasks,
        memberCount,
        workloadScore: Math.round(workloadScore),
      };
    });
  }, [departments, users, breakdownTasks]);

  // Real activity: bucket the team's activity log (task created/updated/commented,
// project and milestone events, ...) by calendar day over the last 7 days. Labels carry
  // the actual date, so a spike always means something happened that day - unlike the old
  // weekday buckets, which lumped every event ever created on e.g. a Saturday into one bar.
  const activityData = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({ key, label: `${dayNames[d.getDay()]} ${d.getDate()}`, value: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));

    const sourceLogs =
      selectedActivityFilter === "My Tasks" && auth
        ? activityLogs.filter((log) => log.userId === auth.userId)
        : activityLogs;

    // Counted over the same logs and the same window as the chart, so the hover
    // panel can never report a different total than the line above it.
    const byType = new Map<string, number>();

    sourceLogs.forEach((log) => {
      const at = new Date(log.timestamp);
      if (Number.isNaN(at.getTime())) return;
      const key = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
      const bucket = byKey.get(key);
      if (!bucket) return;

      bucket.value++;
      const label = (log.activityType || "Other").trim() || "Other";
      byType.set(label, (byType.get(label) ?? 0) + 1);
    });

    return {
      points: days.map(({ label, value }) => ({ day: label, value })),
      breakdown: [...byType.entries()]
        .map(([label, count]) => ({ label, count }))
        // Busiest types first; cap the list so the hover panel stays short.
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  }, [activityLogs, selectedActivityFilter, auth]);

  if (loading) return <PageSkeleton />;
  if (error) return <div className="mx-4 my-2"><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div></div>;

  return (
    <div>

      <DashboardStats projects={projects} />
      <section>

        {/* Dashboard Overview Section */}
        <section className="my-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* High Risk Interventions  */}
            <HighRiskInterventions tasks={escalatedTasks} onSelectTask={openEscalatedTask} />

            {/* Project Overview - counted from the loaded project list, which
                is the same source the stat cards use. The dashboard endpoint
                has no project collection, so reading it here always yielded 0. */}
            <ProjectOverview
              newProjects={projects.filter((p) => p.status === "Planned" || p.status === "NotStarted").length}
              pendingProjects={projects.filter((p) => p.status === "InProgress" || p.status === "OnHold" || p.status === "Delayed").length}
              doneProjects={projects.filter((p) => p.status === "Completed" || p.progressPercentage === 100).length}
              // The "?" explainer is hidden here at the owner's request. The copy stays
              // in ProjectOverview, so passing true again brings it back.
              showInfoTip={false}
            />

            {/* Activity Chart - the task filter dropdown is hidden via SHOW_ACTIVITY_FILTER */}
            <Activity
              data={activityData.points}
              breakdown={activityData.breakdown}
              isFiltered={selectedActivityFilter === "My Tasks"}
              filterLabel={selectedActivityFilter === "My Tasks" ? "Your activity" : undefined}
              title="Activity"
              filterOptions={SHOW_ACTIVITY_FILTER ? ["All Tasks", "My Tasks", "Team Tasks"] : []}
              selectedFilter={selectedActivityFilter}
              onFilterChange={setSelectedActivityFilter}
            />

            <NotificationList items={unread} title="Notifications" onOpen={openNotification} />
          </div>
        </section>


        {/* Active Objectives , Workload Distribution, Notifications
            "My Tasks" and "Workload Distribution" are currently hidden via the
            SHOW_MY_TASKS / SHOW_WORKLOAD_DISTRIBUTION flags above. */}
        {(SHOW_MY_TASKS || SHOW_WORKLOAD_DISTRIBUTION) && (
        <section className="flex gap-4">
          {/* left - Active Objectives */}
          {SHOW_MY_TASKS && (
          <div className="flex-1 py-4">
            <ActiveObjectives
              objectives={breakdownTasks.slice(0, 6).map((task) => {
                const assignedUser = task.assignedToUserId ? users.find((user) => user.id === task.assignedToUserId) : null;

                return {
                  id: task.id,
                  category: task.projectName || "General",
                  title: task.title,
                  progressPercentage: task.progressPercentage,
                  assignees: assignedUser
                    ? [assignedUser]
                    : task.assignedToUserName
                      ? [{ fullName: task.assignedToUserName }]
                      : [],
                };
              })}
              title="My Tasks"
              subtitle={`${breakdownTasks.length} tasks`}
            />
          </div>
          )}

          {/* middle - Workload Distribution */}
          {SHOW_WORKLOAD_DISTRIBUTION && (
          <div className="flex-1 py-4">
            <WorkloadBars
              items={departmentWorkload}
              title="Workload Distribution"
              isDepartment={true}
            />
          </div>
          )}

          {/* right - Notifications */}
          <div className="flex-1 py-4">
            <NotificationList items={unread} title="Notifications" onOpen={openNotification} />
          </div>
        </section>
        )}

        <div className="py-4">
          <TaskStats
            buckets={taskBuckets}
            loading={taskBucketsLoading}
            onSelectFilter={handleTaskStatsSelect}
            // The "?" explainer is hidden here at the owner's request. The hover
            // panel on each card still works and still uses the same copy.
            showInfoTip={false}
          />
        </div>

        <TaskPerformanceTable
          tasks={taskPerformanceTasks}
          projects={projects}
          departments={departments}
          totalCount={taskPerformanceTotalCount}
          totalPages={taskPerformanceTotalPages}
          page={taskPerformancePage}
          pageSize={taskPerformancePageSize}
          loading={taskPerformanceLoading}
          onQueryChange={loadTaskPerformance}
          onViewTask={openTaskDetails}
          onEditTask={openTaskEditor}
          canEdit={canEditTasks}
          initialFilter={taskTableFilter}
        />

      </section>

      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          users={users}
          project={projects.find(p => p.id === selectedTask.projectId) ?? null}
          milestone={milestones.find(m => m.id === selectedTask.milestoneId) ?? null}
          mayEdit={canEditTasks}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (taskId, data) => {
            if (!auth) return;
            try {
              if (data.status !== selectedTask.status) {
                await api.updateTaskStatus(auth.token, taskId, data.status);
              }
              if (data.progress !== Math.round(selectedTask.progressPercentage || 0)) {
                await api.updateTaskProgress(auth.token, taskId, data.progress);
              }
              if (data.priority !== (selectedTask.priority || "Medium")) {
                await api.updateTask(auth.token, taskId, {
                  title: selectedTask.title,
                  description: selectedTask.description ?? "",
                  priority: data.priority,
                  startDate: selectedTask.startDate,
                  dueDate: selectedTask.dueDate,
                  estimatedHours: selectedTask.estimatedHours ?? 0,
                  milestoneId: selectedTask.milestoneId,
                });
              }
              const freshTask = await api.getTask(auth.token, taskId);
              setSelectedTask(freshTask);
              // The edit may have changed the task's status, which moves it
              // between buckets. Re-fetch rather than patching one list.
              void loadTaskBuckets();
            } catch (e) {
              addToast(e instanceof Error ? e.message : "Failed to update task", "error");
              throw e;
            }
          }}
          onAddComment={async (taskId, text) => {
            if (!auth) return;
            await api.addTaskComment(auth.token, taskId, text);
            await refreshTaskLists();
          }}
          onDelete={async (taskId) => {
            if (!auth) return;
            await api.deleteTask(auth.token, taskId);
            setSelectedTask(null);
            // refreshTaskLists re-pulls the buckets, so the deleted task leaves
            // whichever card it was counted in.
            await refreshTaskLists();
          }}
          onEscalate={async () => {
            if (!auth) return;
            await api.escalateTask(auth.token, selectedTask.id);
            addToast("Task escalated.");
            await refreshTaskLists();
          }}
          onRefresh={refreshTaskLists}
        />
      )}

      <ProjectFormModal
        open={showCreateModal}
        title="Create Project"
        submitLabel="Create"
        form={projectForm}
        setForm={setProjectForm}
        departments={perm.isSuperAdmin ? departments : departments.filter((d) => !shouldFilterByOrg || d.organizationId === userOrganizationId)}
        organizations={organizations}
        showOrganizationFilter={perm.isSuperAdmin}
        users={users}
        onSubmit={handleCreateProject}
        onClose={() => {
          setShowCreateModal(false);
          setProjectForm(emptyProjectForm());
        }}
      />

      {newProjectWizardOpen && (
        <ModalOverlay onClose={() => setNewProjectWizardOpen(false)} widthClassName="max-w-4xl">
          <NewProjectPage onClose={() => setNewProjectWizardOpen(false)} />
        </ModalOverlay>
      )}

    </div>
  );
}
