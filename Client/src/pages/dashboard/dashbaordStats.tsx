import { KpiCard } from "./kpiCard";

interface DashboardStatsProps {
  dashboard?: {
    totalProjects?: number;
    activeProjects?: number;
    totalTasks?: number;
    overallHealthScore?: number;
    budgetVariance?: number;
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardStats({ dashboard }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 py-2 rounded-xl">
      {/* Total Projects */}
      <KpiCard
        title="Total projects"
        value={dashboard?.totalProjects ?? 0}
        icon="folder_open"
        iconBgColor="bg-primary/10"
        iconColor="text-primary"
      />

      {/* Active Projects */}
      <KpiCard
        title="Active"
        value={dashboard?.activeProjects ?? 0}
        icon="play_circle"
        iconBgColor="bg-emerald-500/10"
        iconColor="text-emerald-600"
        trend={{
          value: "12%",
          positive: true,
          bgColor: "bg-emerald-500/10",
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

      {/* Budget Variance */}
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
  );
}