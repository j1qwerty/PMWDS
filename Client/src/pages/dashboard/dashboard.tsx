import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { NotificationItem, Task, Department, User, Project, Milestone } from "../../types";
import { NotificationList } from "../shared/NotificationList";
import { SimpleProjectList } from "../shared/SimpleProjectList";
import { TaskList } from "../shared/TaskList";
import { WorkloadBars } from "../shared/WorkloadBars";
import type { WorkloadItem } from "../shared/WorkloadBars";
import { ActiveObjectives } from "./ActiveObjectives";
import { formatMoney, formatPercent } from "../../ui";
import { ModalOverlay, PageSkeleton, useNavHeader } from "../shared";
import { KpiCard } from "./kpiCard";
import TaskStats from "../shared/dashboard/TaskStats";
import TaskPerformanceTable from "../shared/dashboard/TaskPerformanceTable";
import TaskProgressBoards2 from "../shared/dashboard/TaskProgressBoards2";
import { TaskDetail } from "../tasks/TaskDetail";
import { TaskFormModal } from "../tasks/TaskFormModal";
import TaskProgressBoards from "../shared/dashboard/TaskProgressBoard";
import TaskPerformance from "../shared/dashboard/TaskPerformance";

export function DashboardPage() {
  const { auth, hasRole, hasPermission } = useAuth();
  const { setNavHeader } = useNavHeader();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escalatedTasks, setEscalatedTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setNavHeader({
      title: "Dashboard",
      description: "Overview of projects, tasks, and key metrics",
      action: {
        label: "Reports",
        onClick: () => navigate("/reports"),
        icon: "assessment",
      },
    });
  }, [setNavHeader, navigate]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.allSettled([
      api.getDashboard(auth.token),
      api.getMyTasks(auth.token),
      api.getNotifications(auth.token, true),
      api.getDepartments(auth.token),
      api.getUsers(auth.token),
      api.getProjects(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getOverdueTasks(auth.token) : Promise.resolve([]),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
    ])
      .then(([dashboardResult, tasksResult, notificationsResult, departmentsResult, usersResult, projectsResult, overdueResult, escalatedResult]) => {
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
        if (tasksResult.status === "fulfilled") setMyTasks(tasksResult.value);
        if (notificationsResult.status === "fulfilled") setUnread(Array.isArray(notificationsResult.value) ? notificationsResult.value : []);
        if (departmentsResult.status === "fulfilled") setDepartments(departmentsResult.value);
        if (usersResult.status === "fulfilled") setUsers(usersResult.value);
        if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
        if (overdueResult.status === "fulfilled") setOverdue(overdueResult.value as Task[]);
        if (escalatedResult.status === "fulfilled") setEscalatedTasks(escalatedResult.value as Task[]);
        if (dashboardResult.status === "rejected") {
          setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard unavailable");
        }
      })
      .finally(() => setLoading(false));
  }, [auth]);

  const canEditTasks = hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead") ||
    hasPermission("TASK_EDIT", "TASK_CREATE", "TASK_ASSIGN");

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

  if (loading) return <PageSkeleton />;
  if (error) return <div className="mx-4 my-2"><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div></div>;

  return (
    <div>

      <section>
        <TaskStats tasks={myTasks} />

        <div className="flex">
          {/* left */}
          <div className="w-2/3">

          </div>

          {/* right panel */}
          <div className="w-1/3 py-6">
            <NotificationList items={unread.slice(0, 6)} title="Notifications" />
          </div>

        </div>

        <TaskProgressBoards/>

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
              hasRole={hasRole}
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


      <div>
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4   py-2 rounded-xl">
          {/* Total Projects */}

          <KpiCard
            title="Total projects"
            value={dashboard?.totalProjects ?? 0}
            icon="folder_open"
            iconBgColor="bg-primary/10"
            iconColor="text-primary"
          />

          {/* Active Projects – trend badge uses same colors */}
          <KpiCard
            title="Active"
            value={dashboard?.activeProjects ?? 0}
            icon="play_circle"
            iconBgColor="bg-emerald-500/10"
            iconColor="text-emerald-600"
            trend={{
              value: "12%",
              positive: true,
              bgColor: "bg-emerald-500/10",   // matches icon background
              textColor: "text-emerald-600",
            }}
          />

          {/* Pending Tasks */}
          <KpiCard
            title="Pending tasks"
            value={dashboard?.totalTasks ?? 0}
            icon="task"
            iconBgColor="bg-amber-500/10"
            iconColor="text-amber-600"
          />

          {/* AI Health */}
          <KpiCard
            title="AI health"
            value={formatPercent(dashboard?.overallHealthScore ?? 0)}
            icon="bolt"
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-600"
          />

          {/* Budget Variance – Rupee symbol */}
          <KpiCard
            title="Budget variance"
            value={(() => {
              const raw = formatMoney(Math.abs(dashboard?.budgetVariance ?? 0));
              return raw.replace('$', '₹');
            })()}
            icon="account_balance_wallet"
            iconBgColor="bg-teal-500/10"
            iconColor="text-teal-600"
            valueClassName={(dashboard?.budgetVariance ?? 0) <= 0 ? "text-emerald-600" : "text-rose-500"}
            subtext={(dashboard?.budgetVariance ?? 0) <= 0 ? "On track" : "Over budget"}
          />
        </div>

        <div className="col-span-12 flex flex-col gap-lg ">
          {/* Active Objectives - Full Width */}
          <div className="">
            <ActiveObjectives
              objectives={myTasks.slice(0, 3).map((task) => {
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
              title="Active Objectives"
            />
          </div>
          <div className="col-span-12 flex flex-col gap-lg ">
            {/* Row 1: High Risk Projects + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              <div className="lg:col-span-2">
                <SimpleProjectList projects={dashboard?.highRiskProjects ?? []} title="High Risk Projects" />
              </div>
              <div className="lg:col-span-1">

                <NotificationList items={unread.slice(0, 6)} title="Notifications" />



              </div>
            </div>

            {/* Row 2: High-Risk Interventions + Urgent Escalations */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              <div className="lg:col-span-2 flex flex-col gap-sm">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-error">warning</span>
                  <h2 className="font-h2 text-h2 text-on-surface">High-Risk Interventions</h2>
                  {escalatedTasks.length > 0 && (
                    <span className="px-xs py-[2px] rounded-full bg-red-100 text-red-600 text-[10px] font-bold">{escalatedTasks.length} escalated</span>
                  )}
                  {/* <span className="px-xs py-[2px] border border-outline rounded text-[10px] text-outline font-label-caps uppercase ml-sm">Admin Only</span> */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {/* Escalated Tasks */}
                  {escalatedTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="glass-panel p-md rounded-xl border border-error-container bg-error-container-10 relative overflow-hidden">
                      <div className="absolute top-md right-md w-2 h-2 rounded-full bg-error status-pulse"></div>
                      <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-xs truncate">{t.title}</h3>
                      <p className="font-body-md text-on-surface-variant text-[13px] mb-md">
                        Escalation level {t.escalationLevel}{t.projectName ? ` • ${t.projectName}` : ""}{t.assignedToUserName ? ` • ${t.assignedToUserName}` : ""}
                      </p>
                      <div className="flex gap-sm">
                        <span className="px-sm py-xs rounded text-[11px] font-bold uppercase bg-red-100 text-red-700">Level {t.escalationLevel}</span>
                        {t.priority && (
                          <span className="px-sm py-xs rounded text-[11px] font-bold uppercase border border-outline-variant text-on-surface">{t.priority}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Critical Card - Static */}
                  <div className="glass-panel p-md rounded-xl border border-error-container bg-error-container-10 relative overflow-hidden">
                    <div className="absolute top-md right-md w-2 h-2 rounded-full bg-error status-pulse"></div>
                    <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-xs">API Gateway Timeout</h3>
                    <p className="font-body-md text-on-surface-variant text-[13px] mb-md">SLA violation risk critical. 45ms latency spike detected in US-East region.</p>
                    <div className="flex gap-sm">
                      <button className="px-sm py-xs bg-error text-on-error rounded font-label-caps text-[11px] hover:bg-on-error-container transition-colors">Intervene</button>
                      <button className="px-sm py-xs border border-outline-variant rounded font-label-caps text-[11px] text-on-surface hover:bg-surface-variant transition-colors">Details</button>
                    </div>
                  </div>

                  {/* Warning Card - Static */}
                  <div className="glass-panel p-md rounded-xl border-[#F59E0B]/30 bg-warning-light-20 relative overflow-hidden">
                    <div className="absolute top-md right-md w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                    <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-xs">Resource Bottleneck</h3>
                    <p className="font-body-md text-on-surface-variant text-[13px] mb-md">Design team allocation exceeding 110% capacity for current sprint.</p>
                    <div className="flex gap-sm">
                      <button className="px-sm py-xs bg-[#F59E0B] text-white rounded font-label-caps text-[11px] hover:bg-[#D97706] transition-colors">Reallocate</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Escalations Panel */}
              <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow flex flex-col h-full">
                <div className="flex items-center gap-sm mb-md pb-sm border-b border-surface-variant">
                  <span className="material-symbols-outlined text-error">bolt</span>
                  <h2 className="font-h2 text-h2 text-on-surface">Urgent Escalations</h2>
                </div>
                <div className="flex flex-col gap-sm flex-1">
                  {escalatedTasks.length > 0 ? escalatedTasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="p-sm rounded-lg bg-error-container-10 border-l-4 border-error flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-body-md font-bold text-error text-[13px] truncate">{t.title}</span>
                        <span className="text-[10px] text-outline shrink-0 ml-2">{t.escalatedDate ? new Date(t.escalatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant leading-tight">
                        Level {t.escalationLevel}{t.projectName ? ` • ${t.projectName}` : ""}{t.assignedToUserName ? ` • Assigned: ${t.assignedToUserName}` : ""}
                      </p>
                    </div>
                  )) : (
                    <>
                      {/* Danger Alert - Static */}
                      <div className="p-sm rounded-lg bg-error-container-10 border-l-4 border-error flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          <span className="font-body-md font-bold text-error text-[13px]">Server Downtime Risk</span>
                          <span className="text-[10px] text-outline">5m ago</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant leading-tight">Database migration failed on production cluster #4. Data integrity check required.</p>
                        <button className="mt-2 w-full py-1 bg-error text-on-error rounded text-[10px] font-bold uppercase tracking-wider hover:bg-on-error-container transition-colors">Execute Recovery</button>
                      </div>

                      {/* Warning Alert - Static */}
                      <div className="p-sm rounded-lg bg-[#FEF3C7]/20 border-l-4 border-[#F59E0B] flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          <span className="font-body-md font-bold text-[#D97706] text-[13px]">Security Policy Breach</span>
                          <span className="text-[10px] text-outline">18m ago</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant leading-tight">Unauthorized access attempt detected from unknown IP in 'Staging'.</p>
                        <div className="flex gap-2 mt-2">
                          <button className="flex-1 py-1 border border-[#F59E0B] text-[#D97706] rounded text-[10px] font-bold uppercase hover:bg-[#F59E0B]/10 transition-colors">Investigate</button>
                          <button className="flex-1 py-1 bg-[#F59E0B] text-white rounded text-[10px] font-bold uppercase hover:bg-[#D97706] transition-colors">Block IP</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Row 3: My Work Queue + Workload Distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
              <TaskList tasks={myTasks.slice(0, 6)} title="Work Queue" subtitle={`${myTasks.length} Tasks Pending`} />
              <WorkloadBars
                items={departmentWorkload}
                title="Workload Distribution"
                isDepartment={true}
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
