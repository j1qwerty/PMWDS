import { OverallProgressRing } from "../../shared";
import type { Project, User } from "../../../types";
import { formatMoney } from "../../../ui";
import { useEffect, useState } from "react";

interface AIInsightsSectionProps {
  project: Project;
  progress: number;
  healthScore: number | null;
  delayRisk: number | null;
  manager: User | undefined;
  formatMoney: (amount: number) => string;
}

export function AIInsightsSection({
  project,
  progress,
  healthScore,
  delayRisk,
  formatMoney,
}: AIInsightsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-600 text-lg">auto_awesome</span>
        <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
        <span className="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Powered by AI</span>
      </div>


    

      {/* Progress Ring & Key Metrics */}
      <div className="flex items-start gap-4">
        <OverallProgressRing progress={progress} project={project} delayRisk={delayRisk} healthScore={healthScore} />
      </div>
        {/* <KeyMetrics project={project} delayRisk={delayRisk} healthScore={healthScore} /> */}

      {/* Health Matrix */}
        
      <ProjectHealthMatrix project={project} />
    </div>
  );
}

function AIInsightBadges() {
  const badges = [
    { label: "Optimized Path", icon: "bolt", color: "indigo" },
    { label: "Resource Efficiency High", icon: "verified", color: "emerald" },
    { label: "On Pace", icon: "auto_awesome", color: "amber" },
  ];

  const [visibleBadges, setVisibleBadges] = useState<number[]>([]);

  useEffect(() => {
    badges.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleBadges(prev => [...prev, idx]);
      }, idx * 150);
    });
  }, []);

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, idx) => (
        <div
          key={idx}
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 
            ${colorMap[badge.color]}
            transition-all duration-500 ease-out
            ${visibleBadges.includes(idx) 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-2 scale-95'
            }`}
        >
          <span className="material-symbols-outlined text-[18px] animate-pulse">{badge.icon}</span>
          <span className="text-xs font-bold tracking-wide uppercase">
            <span className="text-[10px] font-normal text-slate-500 mr-1">AI Insight:</span>
            {badge.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function KeyMetrics({
  project,
  delayRisk,
  healthScore,
}: {
  project: Project;
  delayRisk: number | null;
  healthScore: number | null;
}) {
  const [animatedValues, setAnimatedValues] = useState({
    budgetUsage: 0,
    delayRisk: 0,
    healthScore: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        budgetUsage: project.plannedBudget 
          ? Math.round((project.actualCost / project.plannedBudget) * 100) 
          : 0,
        delayRisk: delayRisk || 0,
        healthScore: healthScore || 0,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [project.actualCost, project.plannedBudget, delayRisk, healthScore]);

  const metrics = [
    {
      label: "Budget Usage",
      value: animatedValues.budgetUsage,
      suffix: "%",
      color: animatedValues.budgetUsage > 80 ? "text-amber-600" : "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
      icon: "account_balance",
    },
    {
      label: "Delay Risk",
      value: animatedValues.delayRisk,
      suffix: "%",
      color: (delayRisk && delayRisk > 50) ? "text-orange-600" : "text-emerald-600",
      bg: "bg-orange-50 border-orange-100",
      icon: "schedule",
    },
    {
      label: "Health Score",
      value: animatedValues.healthScore,
      suffix: "%",
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
      icon: "monitoring",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 flex-1">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-xl border ${metric.bg} transition-all duration-500 hover:shadow-sm`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">{metric.icon}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{metric.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${metric.color} transition-all duration-1000`}>
              {metric.value}
            </span>
            <span className="text-xs text-slate-400">{metric.suffix}</span>
          </div>
          <div className="w-full h-1 bg-slate-200/50 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${metric.color.replace('text', 'bg')}`}
              style={{ width: `${Math.min(metric.value, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectHealthMatrix({ project }: { project: Project }) {
  const calculateDummyHealth = () => {
    const pct = project.progressPercentage || 0;
    const risk = project.aiDelayRiskScore || 0;
    const budgetRatio = project.plannedBudget
      ? (project.actualCost || 0) / project.plannedBudget
      : 0;

    return [
      {
        label: "Schedule",
        value: Math.max(0, Math.min(1, (pct / 100) * 0.7 + (1 - risk) * 0.3)),
        icon: "event_available",
      },
      {
        label: "Budget",
        value: Math.max(0, Math.min(1, budgetRatio <= 1 ? 1 - budgetRatio * 0.5 : Math.max(0, 1.5 - budgetRatio))),
        icon: "payments",
      },
      { 
        label: "Team", 
        value: 0.75,
        icon: "groups",
      },
      {
        label: "Quality",
        value: Math.max(0, Math.min(1, pct > 0 ? 0.5 + pct / 200 : 0.5)),
        icon: "verified",
      },
    ];
  };

  const metrics = calculateDummyHealth();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getHealthColor = (value: number) => {
    if (value >= 0.8) return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-500", label: "Good", glow: "shadow-emerald-200" };
    if (value >= 0.6) return { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-400", label: "Fair", glow: "shadow-amber-200" };
    return { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-500", label: "At Risk", glow: "shadow-red-200" };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-600 text-[18px]">health_metrics</span>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Health Matrix</span>
        <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Estimated</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((item, idx) => {
          const healthColor = getHealthColor(item.value);
          return (
            <div
              key={item.label}
              className={`p-4 bg-white rounded-xl border border-slate-100 transition-all duration-500 hover:shadow-lg ${healthColor.glow}
                ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">{item.icon}</span>
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                </div>
                <div className={`size-2 rounded-full ${healthColor.dot} animate-pulse`} />
              </div>
              
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-slate-800 transition-all duration-1000">
                  {animated ? Math.round(item.value * 100) : 0}%
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${healthColor.bg} ${healthColor.text}`}>
                  {healthColor.label}
                </span>
              </div>
              
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${healthColor.bg}`}
                  style={{ width: animated ? `${item.value * 100}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Disclaimer */}

<AIInsightBadges />

      <div className="flex items-start gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
        <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">auto_awesome</span>
        <div>
          <p className="text-xs font-semibold text-amber-800 mb-0.5">AI Health Metrics Coming Soon</p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            Currently showing estimates based on project progress, budget, and timeline data.
          </p>
        </div>
      </div>
    </div>
  );
}