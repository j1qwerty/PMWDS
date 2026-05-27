import { AvatarStack } from "../shared";

export function ActiveObjectives({
  objectives,
  title = "Active Objectives",
}: {
  objectives?: Array<{
    id: string;
    category: string;
    title: string;
    progressPercentage: number;
    assignees?: Array<{ id?: string; userId?: string; fullName?: string; name?: string; profilePictureUrl?: string | null }>;
  }>;
  title?: string;
}) {
  const objectiveList = objectives ?? [];

  if (!objectiveList.length) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow ">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">track_changes</span>
            <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          </div>
          <button className="text-primary font-label-caps text-label-caps hover:underline">View All</button>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span
            className="material-symbols-outlined text-outline text-4xl mb-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            track_changes
          </span>
          <p className="text-on-surface-variant text-sm">No active objectives</p>
        </div>
      </div>
    );
  }

  // Map category names to colors exactly as in the reference
  const getCategoryMeta = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("infrastructure") || lower.includes("q4")) {
      return {
        textColor: "text-primary",
        barClass: "primary-gradient",
      };
    }
    if (lower.includes("product") || lower.includes("excellence") || lower.includes("design")) {
      return {
        textColor: "text-secondary",
        barClass: "bg-secondary",
      };
    }
    if (lower.includes("security") || lower.includes("ops")) {
      return {
        textColor: "text-error",
        barClass: "bg-error",
      };
    }
    // default fallback
    return {
      textColor: "text-primary",
      barClass: "primary-gradient",
    };
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">track_changes</span>
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
        </div>
        <button className="text-primary font-label-caps text-label-caps hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {objectiveList.map((obj) => {
          const meta = getCategoryMeta(obj.category);

          return (
            <div
              key={obj.id}
              className="p-md rounded-lg bg-surface-container-low border border-surface-variant/30"
            >
              <div className="flex justify-between items-start mb-sm">
                <div className="flex flex-col">
                  <span className={`font-label-caps text-[10px] uppercase ${meta.textColor}`}>
                    {obj.category}
                  </span>
                </div>
                <div className="flex items-center gap-sm">
                  {obj.assignees && obj.assignees.length > 0 && (
                    <span className="mr-1">
                      <AvatarStack people={obj.assignees} limit={2} size="xs" />
                    </span>
                  )}
                  <span className="text-numeric text-[12px] text-on-surface-variant">
                    {obj.progressPercentage}%
                  </span>
                </div>
              </div>

              <h3 className="font-body-md font-bold text-on-surface mb-2">{obj.title}</h3>

              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                <div
                  className={`h-full ${meta.barClass}`}
                  style={{ width: `${obj.progressPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
