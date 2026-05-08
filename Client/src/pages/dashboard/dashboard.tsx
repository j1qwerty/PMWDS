import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { NotificationItem, Task } from "../../types";
import {
  ErrorPanel,
  LoadingPanel,
  NotificationList,
  Panel,
  SimpleProjectList,
  TaskList,
  WorkloadBars,
  formatMoney,
  formatPercent,
} from "../../ui";

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
      <section className=" my-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-primary font-semibold uppercase tracking-wider">Overview • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors text-[12px] font-semibold flex items-center gap-2">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Report Center
          </button>
        </div>
      </section>

      <section className="my-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl ambient-glow flex flex-col justify-between h-[120px] border border-outline-variant/30">
          <div className="flex justify-between items-start">
            <span className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">TOTAL</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <svg className="w-[20px] h-[20px] text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
          <span className="text-h1 text-h1 text-on-surface">{dashboard?.totalProjects ?? 0}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl ambient-glow flex flex-col justify-between h-[120px] border border-outline-variant/30">
          <div className="flex justify-between items-start">
            <span className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">ACTIVE</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <svg className="w-[20px] h-[20px] text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-h1 text-h1 text-on-surface">{dashboard?.activeProjects ?? 0}</span>
            <span className="text-[12px] text-[#10B981] flex items-center bg-[#10B981]/10 px-2 py-1 rounded-full font-semibold">
              <svg className="w-[14px] h-[14px] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              12%
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl ambient-glow flex flex-col justify-between h-[120px] border border-outline-variant/30">
          <div className="flex justify-between items-start">
            <span className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">PENDING</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <svg className="w-[20px] h-[20px] text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 text-h1 text-on-surface">{dashboard?.totalTasks ?? 0}</span>
            {(dashboard?.overdueTasks ?? 0) > 0 && (
              <span className="text-[10px] text-error bg-error-container font-bold px-2 py-1 rounded-full">{(dashboard?.overdueTasks ?? 0)} URGENT</span>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl ambient-glow flex flex-col justify-between h-[120px] border border-outline-variant/30">
          <div className="flex justify-between items-start">
            <span className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">AI HEALTH</span>
            <div className="w-8 h-8 rounded-full primary-gradient flex items-center justify-center shadow-sm shadow-primary/40">
              <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-h1 text-h1 text-on-surface">{formatPercent(dashboard?.overallHealthScore ?? 0)}</span>
            <svg className="w-[20px] h-[20px] text-outline/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.543-.214-.877-.597-1.124l-.547-.547a3.374 3.374 0 01-.516-1.778m-3.485 3.116l-.543-.547a3 3 0 012.828-2.828" />
            </svg>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl ambient-glow flex flex-col justify-between h-[120px] border border-outline-variant/30">
          <div className="flex justify-between items-start">
            <span className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">BUDGET</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <svg className="w-[20px] h-[20px] text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-h1 text-h1 text-[#10B981]">{formatMoney(Math.abs(dashboard?.budgetVariance ?? 0))}</span>
            <span className="text-[10px] text-on-surface-variant opacity-70 tracking-wider uppercase">{(dashboard?.budgetVariance ?? 0) <= 0 ? 'ON TRACK' : 'OVER'}</span>
          </div>
        </div>
      </section>

      <div className="col-span-12 grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 flex flex-col gap-10">
          <section className="glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-black text-black  tracking-wide">Active Objectives</h2>
              <button className="text-primary-light hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:underline underline-offset-4">View Full Ledger</button>
            </div>
            <TaskList tasks={myTasks.slice(0, 5)} showProgress />
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
        <Panel title="High Risk Projects" subtitle="AI and schedule pressure combined">
          <SimpleProjectList projects={dashboard?.highRiskProjects ?? []} />
        </Panel>

        <Panel title="Unread Notifications" subtitle="New alerts and system events">
          <NotificationList items={unread.slice(0, 6)} compact />
        </Panel>
      </div>

      <div className="col-span-12 grid grid-cols-1 xl:grid-cols-2 gap-10">
        <Panel title="My Work Queue" subtitle="Priority view for the signed-in user">
          <TaskList tasks={myTasks.slice(0, 6)} />
        </Panel>

        <Panel title="Workload Distribution" subtitle="Team load and burnout exposure">
          <WorkloadBars items={dashboard?.workloadDistribution ?? []} />
        </Panel>
      </div>
    </div>
  );
}