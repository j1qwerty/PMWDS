export function WorkloadBars({
  items,
  title = "Workload",
}: {
  items: Array<any>;
  title?: string;
}) {
  if (!items.length) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[#818cf8]">bar_chart</span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-slate-500 text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            bar_chart
          </span>
          <p className="text-slate-400 text-sm">No workload data</p>
        </div>
      </div>
    );
  }

  const getBarColor = (score: number) => {
    if (score >= 100) return "bg-gradient-to-r from-rose-500 to-rose-400";
    if (score >= 80) return "bg-gradient-to-r from-amber-500 to-amber-400";
    return "bg-gradient-to-r from-[#4648d4] to-[#818cf8]";
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[#818cf8]">bar_chart</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-lg">
        {items.map((item) => {
          const score = Number(item.workloadScore ?? item.aiWorkloadScore ?? 0);
          const normalizedScore = score <= 1 ? score * 100 : score;

          return (
            <div key={item.userId ?? item.fullName} className="flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-white font-medium">{item.fullName}</span>
                  <span className="text-xs text-slate-500">{item.jobTitle || "Team member"}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <span className={`text-sm font-medium font-numeric ${normalizedScore >= 100 ? "text-rose-400" : normalizedScore >= 80 ? "text-amber-400" : "text-slate-400"}`}>
                    {Math.round(normalizedScore)}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {normalizedScore >= 100 ? "overflow" : normalizedScore >= 80 ? "critical" : "optimal"}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${getBarColor(normalizedScore)} rounded-full transition-all`} style={{ width: `${Math.min(normalizedScore, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}