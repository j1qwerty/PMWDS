import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { NotificationItem, Task, Department, OrganizationRecord, User, Project, Milestone } from "../../types";
import { NotificationList } from "../shared/NotificationList";
import { SimpleProjectList } from "../shared/SimpleProjectList";
import { TaskList } from "../shared/TaskList";
import { WorkloadBars } from "../shared/WorkloadBars";
import type { WorkloadItem } from "../shared/WorkloadBars";
import { ActiveObjectives } from "./ActiveObjectives";
import { formatMoney, formatPercent } from "../../ui";
import { ModalOverlay, PageSkeleton, priorityColorPalette, statusColorPalette, useNavHeader, useToast } from "../shared";
import { Permission, useRoleAccess } from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import { KpiCard } from "./kpiCard";
import TaskStats from "../shared/dash/TaskStats";
import TaskPerformanceTable from "../shared/dash/TaskPerformanceTable";
import TaskProgressBoards2 from "../shared/dash/TaskProgressBoards2";
import { TaskDetail } from "../tasks/TaskDetail";
import { TaskFormModal } from "../tasks/TaskFormModal";
import TaskProgressBoards from "../shared/dash/TaskProgressBoard";
import TaskPerformance from "../shared/dash/TaskPerformance";
import { HighRiskInterventionsCompact } from "../shared/dash/HighRiskInterventionsCompact";
import { HighRiskInterventions } from "../shared/dash/HighRiskInterventions";
import { DashboardStats } from "./dashbaordStats";
import { ProjectOverview } from "../shared/dash/ProjectOverviewChart";
import { Activity } from "../shared/dash/Activity";
import { ActivityCompact } from "../shared/dash/ActivityCompact";
import Timer from "../shared/dash/Timer";
import { TimelinePredictions } from "../ai/TimelinePredictions";
import { ProjectFormModal, type ProjectFormState } from "../projectsK/components";

const emptyProjectForm = (): ProjectFormState => ({
  projectCode: "",
  name: "",
  description: "",
  category: "Monitoring",
  plannedStartDate: "",
  plannedEndDate: "",
  plannedBudget: 25000,
  organizationId: "",
  departmentId: "",
  departmentIds: [],
  projectManagerId: "",
  priority: "Medium",
});

export function DashboardPage() {
  const { auth } = useAuth();
  const access = useRoleAccess();
  const { setNavHeader } = useNavHeader();
  const navigate = useNavigate();
  const { refresh: refreshAppData } = useAppData();
  const { addToast } = useToast();
  const [dashboard, setDashboard] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escalatedTasks, setEscalatedTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedActivityFilter, setSelectedActivityFilter] = useState("All Tasks");


   const [showCreateModal, setShowCreateModal] = useState(false);
   const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());
   const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  useEffect(() => {
    setNavHeader({
      title: "Dashboard",
      description: "Overview of projects, tasks, and key metrics",
     action: access.canManageProjects ? {
        label: "New Project",
        onClick: () => {
          setProjectForm({
            ...emptyProjectForm(),
            organizationId: shouldFilterByOrg && userOrganizationId ? userOrganizationId : "",
          });
          setShowCreateModal(true);
        },
        icon: "add_circle",
      } : undefined,
    });
  }, [setNavHeader, navigate, access.canManageProjects, shouldFilterByOrg, userOrganizationId]);

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

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.allSettled([
      api.getDashboard(auth.token),
      api.getMyTasks(auth.token),
      api.getNotifications(auth.token, true),
      api.getDepartments(auth.token),
      api.getOrganizations(auth.token),
      api.getUsers(auth.token),
      api.getProjects(auth.token),
      access.can(Permission.TaskView) ? api.getOverdueTasks(auth.token) : Promise.resolve([]),
      access.can(Permission.TaskView) ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
    ])
      .then(([dashboardResult, tasksResult, notificationsResult, departmentsResult, organizationsResult, usersResult, projectsResult, overdueResult, escalatedResult]) => {
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
        if (tasksResult.status === "fulfilled") setMyTasks(tasksResult.value);
        if (notificationsResult.status === "fulfilled") setUnread(Array.isArray(notificationsResult.value) ? notificationsResult.value : []);
        if (departmentsResult.status === "fulfilled") setDepartments(departmentsResult.value);
        if (organizationsResult.status === "fulfilled") setOrganizations(organizationsResult.value as OrganizationRecord[]);
        if (usersResult.status === "fulfilled") setUsers(usersResult.value);
        if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
        if (overdueResult.status === "fulfilled") setOverdue(overdueResult.value as Task[]);
        if (escalatedResult.status === "fulfilled") setEscalatedTasks(escalatedResult.value as Task[]);
        if (dashboardResult.status === "rejected") {
          setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard unavailable");
        }
      })
      .finally(() => setLoading(false));
  }, [auth, access]);

  const canEditTasks = access.can(Permission.TaskEdit, Permission.TaskCreate, "TASK_ASSIGN");

  const openTaskDetails = async (task: Task) => {
    if (!auth) return;
    try {
      const freshTask = await api.getTask(auth.token, task.id);
      setSelectedTask(freshTask);
    } catch {
      setSelectedTask(task);
    }
  };

  const openTaskEditor = async (task: Task) => {
    if (!auth) return;
    setEditingTask(task);
    if (task.projectId) {
      try {
        setMilestones(await api.getMilestonesByProject(auth.token, task.projectId));
      } catch {
        setMilestones([]);
      }
    }
  };


  const refreshTaskLists = async () => {
    if (!auth) return;
    const [tasks, escalated] = await Promise.all([
      api.getMyTasks(auth.token),
      canEditTasks ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
    ]);
    setMyTasks(tasks);
    setEscalatedTasks(escalated);
    if (selectedTask) {
      setSelectedTask(await api.getTask(auth.token, selectedTask.id));
    }
  };

  const updateSelectedTask = (patch: Partial<Task>) => {
    setSelectedTask(current => current ? { ...current, ...patch } : current);
    setMyTasks(current => current.map(task => task.id === selectedTask?.id ? { ...task, ...patch } : task));
  };

  const departmentWorkload: WorkloadItem[] = useMemo(() => {
    return departments.map((dept) => {
      const deptUsers = users.filter((u) => u.departmentId === dept.id);
      const deptTasks = myTasks.filter((t) => {
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
  }, [departments, users, myTasks]);

  const activityData = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    const allTasks = [...myTasks, ...overdue, ...escalatedTasks].filter(
      (task, index, list) => list.findIndex(t => t.id === task.id) === index
    );

    const sourceTasks = selectedActivityFilter === "My Tasks"
      ? myTasks
      : selectedActivityFilter === "Team Tasks"
        ? allTasks
        : allTasks;

    sourceTasks.forEach(task => {
      const date = new Date(task.createdDate);
      const dayOfWeek = date.getDay();
      dayCounts[dayOfWeek]++;
    });

    return dayNames.map((day, i) => ({ day, value: dayCounts[i] }));
  }, [myTasks, overdue, escalatedTasks, selectedActivityFilter]);

  if (loading) return <PageSkeleton />;
  if (error) return <div className="mx-4 my-2"><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div></div>;

  return (
    <div>

      <section>
        <TaskStats tasks={myTasks} />
        {/* Dashboard Overview Section */}
        <section className="my-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* High Risk Interventions  */}
            <HighRiskInterventions tasks={escalatedTasks} />

            {/* Version 2 - Department-based colors (Alternative design) */}
            {/* <HighRiskInterventionsCompact tasks={escalatedTasks} /> */}

            {/* Project Overview*/}
            <ProjectOverview
              newProjects={(dashboard?.totalProjects ?? 0) - (dashboard?.activeProjects ?? 0) - ((dashboard?.projects as Project[])?.filter(p => p.status === 'Completed').length ?? 0)}
              pendingProjects={dashboard?.activeProjects ?? 0}
              doneProjects={(dashboard?.projects as Project[])?.filter(p => p.status === 'Completed').length ?? 0}
            />

            {/* Activity Chart */}
            <Activity
              data={activityData}
              title="Activity"
              filterOptions={["All Tasks", "My Tasks", "Team Tasks"]}
              selectedFilter={selectedActivityFilter}
              onFilterChange={setSelectedActivityFilter}
            />

            {/* Timer */}
            <Timer tasks={myTasks} token={auth?.token ?? ''} />
          </div>
        </section>


        {/* Active Objectives , Workload Distribution, Notifications */}
        <section className="flex gap-4">
          {/* left - Active Objectives */}
          <div className="flex-1 py-4">
            <ActiveObjectives
              objectives={myTasks.slice(0, 6).map((task) => {
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
              subtitle={`${myTasks.length} tasks`}
            />
          </div>

          {/* middle - Workload Distribution */}
          <div className="flex-1 py-4">
            <WorkloadBars
              items={departmentWorkload}
              title="Workload Distribution"
              isDepartment={true}
            />
          </div>

          {/* right - Notifications */}
          <div className="flex-1 py-4">
            <NotificationList items={unread.slice(0, 6)} title="Notifications" />
          </div>
          {/* <TimelinePredictions/> */}
        </section>






        {/* <TaskProgressBoards /> */}

        <DashboardStats dashboard={dashboard} />

        <TaskProgressBoards2
          tasks={[...myTasks, ...overdue, ...escalatedTasks].filter((task, index, list) => list.findIndex(item => item.id === task.id) === index)}
          onViewTask={openTaskDetails}
          onEditTask={openTaskEditor}
          canEdit={canEditTasks}
        />

        {/* <TaskPerformance/> */}

        <TaskPerformanceTable
          tasks={[...myTasks, ...overdue, ...escalatedTasks].filter((task, index, list) => list.findIndex(item => item.id === task.id) === index)}
          onViewTask={openTaskDetails}
          onEditTask={openTaskEditor}
          canEdit={canEditTasks}
        />

      </section>

      {selectedTask && (
        <ModalOverlay onClose={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl p-6 w-[980px] max-w-[95vw] max-h-[92vh] overflow-hidden shadow-xl border border-slate-200">
            <TaskDetail
              task={selectedTask}
              users={users}
              allTasks={myTasks}
              project={projects.find(project => project.id === selectedTask.projectId) ?? null}
              milestone={milestones.find(milestone => milestone.id === selectedTask.milestoneId) ?? null}
              isAdmin={canEditTasks}
              onStatusChange={async (status) => {
                if (!auth) return;
                await api.updateTaskStatus(auth.token, selectedTask.id, status);
                updateSelectedTask({ status });
              }}
              onEdit={() => openTaskEditor(selectedTask)}
              onUpdateProgress={async (progressPercentage, notes) => {
                if (!auth) return;
                const updated = await api.updateTaskProgress(auth.token, selectedTask.id, progressPercentage, notes);
                setSelectedTask(updated);
                setMyTasks(current => current.map(task => task.id === updated.id ? updated : task));
              }}
              onAddComment={async (comment) => {
                if (!auth) return;
                await api.addTaskComment(auth.token, selectedTask.id, comment);
                await refreshTaskLists();
              }}
              onStartTimer={async (description) => {
                if (!auth) return;
                await api.startTaskTimer(auth.token, selectedTask.id, description);
              }}
              onRefresh={refreshTaskLists}
            />
          </div>
        </ModalOverlay>
      )}

      {editingTask && (
        <TaskFormModal
          open
          initialData={editingTask}
          projects={projects}
          departments={departments}
          milestones={milestones}
          users={users}
          onClose={() => setEditingTask(null)}
          onSubmit={async (payload) => {
            if (!auth) return;
            const updated = await api.updateTask(auth.token, editingTask.id, payload);
            setMyTasks(current => current.map(task => task.id === updated.id ? updated : task));
            setSelectedTask(current => current?.id === updated.id ? updated : current);
            setEditingTask(null);
          }}
        />
      )}

      <ProjectFormModal
        open={showCreateModal}
        title="Create Project"
        submitLabel="Create"
        form={projectForm}
        setForm={setProjectForm}
        departments={access.isAdmin ? departments : departments.filter((d) => !shouldFilterByOrg || d.organizationId === userOrganizationId)}
        organizations={organizations}
        showOrganizationFilter={access.isAdmin}
        users={users}
        onSubmit={handleCreateProject}
        onClose={() => {
          setShowCreateModal(false);
          setProjectForm(emptyProjectForm());
        }}
      />

    </div>
  );
}
