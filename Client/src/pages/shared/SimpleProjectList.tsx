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
      <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">folder</span>
            <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_off
          </span>
          <p className="text-on-surface-variant text-sm">No projects</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    NotStarted: { 
      bg: "bg-surface-container-high", 
      text: "text-on-surface-variant", 
      dot: "bg-outline" 
    },
    InProgress: { 
      bg: "bg-primary/10", 
      text: "text-primary", 
      dot: "bg-primary" 
    },
    OnHold: { 
      bg: "bg-amber-500/10", 
      text: "text-amber-400", 
      dot: "bg-amber-400" 
    },
    Completed: { 
      bg: "bg-emerald-500/10", 
      text: "text-emerald-400", 
      dot: "bg-emerald-400" 
    },
    Cancelled: { 
      bg: "bg-surface-container-high", 
      text: "text-outline", 
      dot: "bg-outline" 
    },
    Delayed: { 
      bg: "bg-error-container", 
      text: "text-error", 
      dot: "bg-error" 
    },
  };

  const getHealthIcon = (project: { status: string; progressPercentage?: number }) => {
    if (project.status === 'Delayed') return 'report';
    if (project.status === 'OnHold') return 'warning';
    if (project.progressPercentage !== undefined && project.progressPercentage < 30) return 'error';
    return 'schedule';
  };

  const getHealthColor = (project: { status: string; progressPercentage?: number }) => {
    if (project.status === 'Delayed') return 'text-error';
    if (project.status === 'OnHold') return 'text-[#F59E0B]';
    if (project.progressPercentage !== undefined && project.progressPercentage < 30) return 'text-error';
    return 'text-outline';
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-error">priority_high</span>
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
        </div>
        <button className="text-primary font-label-caps text-label-caps hover:underline">Full Audit</button>
      </div>
      <div className="flex flex-col gap-xs">
        {projectList.map((project) => {
          const config = statusConfig[project.status] || statusConfig.NotStarted;
          const healthIcon = getHealthIcon(project);
          const healthColor = getHealthColor(project);
          
          return (
            <div 
              key={project.id} 
              className="flex items-center justify-between py-md px-sm rounded-lg hover:bg-surface-container-low transition-colors group"
            >
              <div className="flex flex-col w-1/4">
                <span className="font-label-caps text-[10px] text-outline uppercase">{project.id}</span>
                <a className="font-body-lg font-semibold text-on-surface hover:text-primary transition-colors" href="#">
                  {project.name}
                </a>
              </div>
              <div className="w-1/4 flex justify-center">
                <span className={`px-sm py-[2px] rounded-full text-[11px] font-medium flex items-center gap-xs ${config.bg} ${config.text}`}>
                  <span className={`w-1 h-1 rounded-full ${config.dot}`}></span> {project.status}
                </span>
              </div>
              <div className="w-1/4 px-md">
                <div className="flex flex-col gap-xs">
                  <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div 
                      className="h-full primary-gradient" 
                      style={{ width: `${project.progressPercentage || 0}%` }} 
                    />
                  </div>
                  <span className="text-[11px] font-numeric text-on-surface-variant text-right">
                    {project.progressPercentage || 0}% Complete
                  </span>
                </div>
              </div>
              <div className="w-1/4 flex items-center justify-end gap-xl">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-surface-container-lowest flex items-center justify-center">
                    <span className="text-[10px] text-primary font-semibold">JD</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-surface-variant border-2 border-surface-container-lowest flex items-center justify-center text-[10px] text-on-surface-variant">+2</div>
                </div>
                <span 
                  className={`material-symbols-outlined ${healthColor} text-[20px] fill-icon`} 
                  title={
                    project.status === 'Delayed' 
                      ? 'Critical Health' 
                      : project.status === 'OnHold' 
                      ? 'At Risk' 
                      : 'On Track'
                  }
                >
                  {healthIcon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}