import { InfoTip } from "../../shared";
import { DASHBOARD_OVERVIEW_CARD_HEIGHT } from "../../constants";

interface ProjectOverviewProps {
  newProjects?: number;
  pendingProjects?: number;
  doneProjects?: number;
  /**
   * Whether to show the "?" explainer in the corner.
   *
   * Hidden on the dashboard at the owner's request. The copy is untouched and still
   * rendered wherever the prop is left on, so this is a display switch rather than a
   * removal.
   */
  showInfoTip?: boolean;
}

export function ProjectOverview({
  newProjects = 0,
  pendingProjects = 0,
  doneProjects = 0,
  showInfoTip = true
}: ProjectOverviewProps) {
  const total = newProjects + pendingProjects + doneProjects;
  
  // Calculate stroke dasharray values based on proportions
  const circumference = 2 * Math.PI * 70; // 2πr where r=70
  const newDash = total > 0 ? (newProjects / total) * circumference : 0;
  const pendingDash = total > 0 ? (pendingProjects / total) * circumference : 0;
  const doneDash = total > 0 ? (doneProjects / total) * circumference : 0;
  
  // Calculate stroke dashoffset for each segment
  const pendingOffset = -newDash;
  const doneOffset = -(newDash + pendingDash);

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-md border border-slate-100 ${DASHBOARD_OVERVIEW_CARD_HEIGHT} flex flex-col overflow-hidden`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Project Overview</h3>
        {showInfoTip && (
          <InfoTip
            title="Project Overview"
            summary="A split of every project in your workspace by where it sits in its lifecycle."
            points={[
              "New: planned or not yet started.",
              "Pending: started but unfinished - this includes on hold and delayed projects.",
              "Done: finished, or with all tasks complete.",
            ]}
            note="Each slice is sized by its share of the total, so a workspace with no projects shows an empty ring rather than a misleading full one."
          />
        )}
      </div>
      
      {/* flex-1 so the donut is centred in whatever height the card has, rather
          than sitting at the top with a gap beneath it. */}
      <div className="flex-1 flex items-center justify-center mb-4 min-h-0">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Background circle */}
          <circle 
            cx="90" 
            cy="90" 
            r="70" 
            fill="none" 
            stroke="#e2e8f0" 
            strokeWidth="20"
          />
          
          {/* New Projects segment */}
          {newProjects > 0 && (
            <circle 
              cx="90" 
              cy="90" 
              r="70" 
              fill="none" 
              stroke="#06b6d4" 
              strokeWidth="20" 
              strokeDasharray={`${newDash} ${circumference - newDash}`}
              strokeLinecap="round" 
              transform="rotate(-90 90 90)"
            />
          )}
          
          {/* Pending Projects segment */}
          {pendingProjects > 0 && (
            <circle 
              cx="90" 
              cy="90" 
              r="70" 
              fill="none" 
              stroke="#f59e0b" 
              strokeWidth="20" 
              strokeDasharray={`${pendingDash} ${circumference - pendingDash}`}
              strokeDashoffset={pendingOffset}
              strokeLinecap="round" 
              transform="rotate(-90 90 90)"
            />
          )}
          
          {/* Done Projects segment */}
          {doneProjects > 0 && (
            <circle 
              cx="90" 
              cy="90" 
              r="70" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="20" 
              strokeDasharray={`${doneDash} ${circumference - doneDash}`}
              strokeDashoffset={doneOffset}
              strokeLinecap="round" 
              transform="rotate(-90 90 90)"
            />
          )}
        </svg>
      </div>
      
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
          <span className="text-slate-500">New ({newProjects})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="text-slate-500">Pending ({pendingProjects})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-slate-500">Done  ({doneProjects})</span>
        </div>
      </div>
    </div>
  );
}