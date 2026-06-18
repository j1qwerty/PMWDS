import { HiOutlineFlag, HiOutlineClipboardList, HiOutlineInformationCircle } from "react-icons/hi";

export type WorkspaceView = "milestones" | "tasks" | "details";

interface ViewTabsProps {
  active: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
}

const iconClass = "h-[clamp(16px,2vw,18px)] w-[clamp(16px,2vw,18px)] shrink-0";

const tabs: { id: WorkspaceView; label: string; icon: React.ReactNode }[] = [
  { id: "details", label: "Details", icon: <HiOutlineInformationCircle className={iconClass} /> },
  { id: "milestones", label: "Milestones", icon: <HiOutlineFlag className={iconClass} /> },
  { id: "tasks", label: "Tasks", icon: <HiOutlineClipboardList className={iconClass} /> },
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 border border-slate-200 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
