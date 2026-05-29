export type WorkspaceView = "milestones" | "tasks";

interface ViewTabsProps {
  active: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
}

const tabs: { id: WorkspaceView; label: string; icon: string }[] = [
  { id: "milestones", label: "Milestones", icon: "flag" },
  { id: "tasks", label: "Tasks", icon: "view_kanban" },
];

export function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div className="flex gap-2 px-1 rounded-xl bg-slate-100/80 w-fit">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 border border-slate-200 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
