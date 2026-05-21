import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { NotificationItem, Task, Department, User } from "../../types";
import { NotificationList } from "../shared/NotificationList";
import { SimpleProjectList } from "../shared/SimpleProjectList";
import { TaskList } from "../shared/TaskList";
import { WorkloadBars } from "../shared/WorkloadBars";
import type { WorkloadItem } from "../shared/WorkloadBars";
import { ActiveObjectives } from "./ActiveObjectives";
import { formatMoney, formatPercent } from "../../ui";
import { PageSkeleton } from "../shared";
import { KpiCard } from "./kpiCard";

export function DashboardPage() {
  const { auth, hasRole } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [escalatedTasks, setEscalatedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.allSettled([
      api.getDashboard(auth.token),
      api.getMyTasks(auth.token),
      api.getNotifications(auth.token, true),
      api.getDepartments(auth.token),
      api.getUsers(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getOverdueTasks(auth.token) : Promise.resolve([]),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getEscalatedTasks(auth.token) : Promise.resolve([]),
    ])
      .then(([dashboardResult, tasksResult, notificationsResult, departmentsResult, usersResult, overdueResult, escalatedResult]) => {
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
        if (tasksResult.status === "fulfilled") setMyTasks(tasksResult.value);
        if (notificationsResult.status === "fulfilled") setUnread(notificationsResult.value);
        if (departmentsResult.status === "fulfilled") setDepartments(departmentsResult.value);
        if (usersResult.status === "fulfilled") setUsers(usersResult.value);
        if (overdueResult.status === "fulfilled") setOverdue(overdueResult.value as Task[]);
        if (escalatedResult.status === "fulfilled") setEscalatedTasks(escalatedResult.value as Task[]);
        if (dashboardResult.status === "rejected") {
          setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : "Dashboard unavailable");
        }
      })
      .finally(() => setLoading(false));
  }, [auth]);

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
    <div className=" mx-4 my-2 gap-6">

      <section className="my-2 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <button className="group px-5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface hover:border-primary/50 hover:shadow-md transition-all duration-200 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Report Center
          </button>
        </div>

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
      </section>

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
              <span className="px-xs py-[2px] border border-outline rounded text-[10px] text-outline font-label-caps uppercase ml-sm">Admin Only</span>
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
  );
}
