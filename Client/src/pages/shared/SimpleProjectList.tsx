export function SimpleProjectList({
  projects,
  title = "Projects",
}: {
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    progressPercentage?: number;
  }>;
  title?: string;
}) {
  const projectList = projects ?? [];

  if (!projectList.length) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[#818cf8]">folder</span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-slate-500 text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_off
          </span>
          <p className="text-slate-400 text-sm">No projects</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    NotStarted: { bg: "bg-slate-700/30", text: "text-slate-400", dot: "bg-slate-500" },
    InProgress: { bg: "bg-[#4648d4]/20", text: "text-[#818cf8]", dot: "bg-[#818cf8]" },
    OnHold: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
    Completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
    Cancelled: { bg: "bg-slate-700/30", text: "text-slate-500", dot: "bg-slate-500" },
    Delayed: { bg: "bg-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[#818cf8]">folder</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-sm">
        {projectList.map((project) => {
          const colors = statusColors[project.status] || statusColors.NotStarted;
          return (
            <div key={project.id} className="flex items-center justify-between p-md rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-[#4648d4]/30 hover:bg-[#4648d4]/5 transition-all">
              <div className="flex flex-col min-w-0">
                <span className="text-white font-medium truncate">{project.name}</span>
                <span className="text-xs text-slate-400">{project.progressPercentage ? `${project.progressPercentage}% Complete` : "Needs inspection"}</span>
              </div>
              <div className="flex items-center gap-md">
                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4648d4] to-[#818cf8] rounded-full" style={{ width: `${project.progressPercentage || 0}%` }} />
                </div>
                <div className={`flex items-center gap-xs px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {project.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}