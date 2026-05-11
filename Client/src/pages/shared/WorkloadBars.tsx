export function WorkloadBars({
  items,
  title = "Workload Distribution",
}: {
  items: Array<any>;
  title?: string;
}) {
  if (!items.length) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary transition-colors">more_horiz</span>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            monitoring
          </span>
          <p className="text-on-surface-variant text-sm">No workload data</p>
        </div>
      </div>
    );
  }

  const getCapacityInfo = (score: number) => {
    if (score >= 100) {
      return {
        label: "Overflow",
        textColor: "text-error font-bold",
        barColor: "bg-error",
      };
    }
    if (score >= 80) {
      return {
        label: "Capacity",
        textColor: "text-primary",
        barColor: "bg-primary",
      };
    }
    return {
      label: "Capacity",
      textColor: "text-on-surface-variant",
      barColor: "bg-secondary-container",
    };
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
        <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary transition-colors">more_horiz</span>
      </div>
      <div className="flex flex-col gap-lg mt-md">
        {items.map((item) => {
          const score = Number(item.workloadScore ?? item.aiWorkloadScore ?? 0);
          const normalizedScore = score <= 1 ? score * 100 : score;
          const capacity = getCapacityInfo(normalizedScore);

          return (
            <div key={item.userId ?? item.fullName} className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[13px]">
                <span className="font-medium text-on-surface">{item.fullName}</span>
                <span className={`font-numeric ${capacity.textColor}`}>
                  {Math.round(normalizedScore)}% {capacity.label}
                </span>
              </div>
              <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div 
                  className={`h-full ${capacity.barColor} rounded-full`} 
                  style={{ width: `${Math.min(normalizedScore, 100)}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}