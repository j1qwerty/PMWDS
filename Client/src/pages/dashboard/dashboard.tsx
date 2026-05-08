import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { NotificationItem, Task } from "../../types";
import { NotificationList } from "../shared/NotificationList";
import { SimpleProjectList } from "../shared/SimpleProjectList";
import { TaskList } from "../shared/TaskList";
import { WorkloadBars } from "../shared/WorkloadBars";
import { KpiCard } from "./kpicard";
import { formatMoney, formatPercent, ErrorPanel, LoadingPanel } from "../../ui";

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
    <div className=" mx-4 my-4 gap-6">

      <section className="my-6 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <span className="text-sm font-semibold text-primary/80 uppercase tracking-wider">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      <div className="col-span-12 grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 flex flex-col gap-10">
          <section className="glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-black text-black  tracking-wide">Active Objectives</h2>
              <button className="text-primary-light hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:underline underline-offset-4">View Full Ledger</button>
            </div>
            <TaskList tasks={myTasks.slice(0, 5)} title="Active Objectives" />
          </section>

          {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") && (dashboard?.highRiskProjects ?? []).length > 0 && (
            <section className="flex flex-col gap-6">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                High-Risk Interventions Required
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(dashboard?.highRiskProjects ?? []).slice(0, 2).map((project: any, index: number) => (
                  <div key={project.id} className={`glass-card p-8 rounded-2xl flex flex-col gap-5 relative overflow-hidden group border ${index === 0 ? 'border-rose-500/30 hover:border-rose-500/60' : 'border-amber-500/30 hover:border-amber-500/60'} transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)]`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l ${index === 0 ? 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'}`} />
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-black text-white tracking-wide">{project.name}</h3>
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded border tracking-widest ${index === 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                        {index === 0 ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">AI predicts significant delay risk based on current velocity and resource allocation.</p>
                    <div className="flex items-center justify-between mt-4 pt-6 border-t border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Delay Est.</span>
                        <span className={`text-lg font-black ${index === 0 ? 'text-rose-400' : 'text-white'}`}>
                          {project.delayRisk ? `${Math.round(project.delayRisk * 100)} Days` : 'Review needed'}
                        </span>
                      </div>
                      <button className={`text-xs font-black px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-2 transition-all border ${index === 0 ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'}`}>
                        {index === 0 ? 'ACTION PLAN' : 'REVIEW'} 
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-10">
          <section className="glass-card border-primary/30 rounded-2xl p-8 relative overflow-hidden hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-shadow duration-500">
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-xs font-black text-primary-light uppercase tracking-[0.25em] flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-lg text-primary-light drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" style={{fontVariationSettings: 'FILL 1'}}>auto_awesome</span>
              AI Intelligence
            </h2>
            <div className="flex flex-col gap-6">
              {unread.slice(0, 3).map((notification) => {
                const type = notification.priority === "Critical" ? "critical" : notification.priority === "High" ? "warning" : "info";
                const typeStyles = {
                  critical: { dot: "bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]", hover: "group-hover:text-rose-400" },
                  warning: { dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]", hover: "group-hover:text-amber-400" },
                  info: { dot: "bg-primary-light shadow-[0_0_12px_rgba(129,140,248,0.8)]", hover: "group-hover:text-primary-light" },
                };
                const styles = typeStyles[type];
                return (
                  <div key={notification.id} className="flex gap-5 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group cursor-pointer">
                    <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${styles.dot}`} />
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-sm font-bold text-white tracking-wide transition-colors ${styles.hover}`}>{notification.title}</span>
                      <p className="text-xs text-slate-400 leading-relaxed">{notification.message.slice(0, 80)}</p>
                    </div>
                  </div>
                );
              })}
              {(dashboard?.workloadDistribution ?? []).some((w: any) => (w.aiBurnoutRiskScore ?? 0) > 0.6) && (
                <div className="flex gap-5 p-4 rounded-xl bg-white/[0.02] border border-amber-500/20 hover:bg-white/[0.04] transition-all group cursor-pointer">
                  <div className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-white tracking-wide group-hover:text-amber-400 transition-colors">Burnout Alert</span>
                    <p className="text-xs text-slate-400 leading-relaxed">Some team members are approaching capacity limits.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-card rounded-2xl my-4 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xs font-black  uppercase tracking-[0.2em]">Escalations</h2>
              <span className="bg-rose-500/10 text-rose-400 text-[10px] font-black px-2.5 py-1 rounded border border-rose-500/20 tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                {overdue.length} PENDING
              </span>
            </div>
            <div className="flex flex-col gap-5">
              {overdue.slice(0, 2).map((task) => (
                <div key={task.id} className="p-5 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-4 group hover:border-white/20 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-white tracking-wide">{task.title}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overdue</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">Task is overdue. Current status: {task.status}.</p>
                  <div className="flex justify-end gap-4 pt-3 border-t border-white/5">
                    <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors tracking-widest">DISMISS</button>
                    <button className="text-xs font-black text-white bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors tracking-widest">REVIEW</button>
                  </div>
                </div>
              ))}
              {overdue.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">No escalations pending</div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="my-4 col-span-12 grid grid-cols-1 xl:grid-cols-2 gap-10">
          <SimpleProjectList projects={dashboard?.highRiskProjects ?? []} title="High Risk Projects" />
          <NotificationList items={unread.slice(0, 6)} title="Recent Notifications" />
        </div>

        <div className="col-span-12 grid grid-cols-1 xl:grid-cols-2 gap-10">
          <TaskList tasks={myTasks.slice(0, 6)} title="My Work Queue" subtitle="Priority tasks" />
          <WorkloadBars items={dashboard?.workloadDistribution ?? []} title="Workload Distribution" />
        </div>
    </div>
  );
}