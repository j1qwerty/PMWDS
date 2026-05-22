// components/DepartmentCards.tsx
import type { Department, Project } from "../../../types";
import { getDepartmentColor } from "../../shared";

interface DepartmentCardsProps {
  departments: Department[];
  projects: Project[];
  selectedDepartmentId: string;
  selectedOrgId: string;
  onDepartmentSelect: (departmentId: string) => void;
  onClearFilters: () => void;
}

export function DepartmentCards({
  departments,
  projects,
  selectedDepartmentId,
  selectedOrgId,
  onDepartmentSelect,
  onClearFilters,
}: DepartmentCardsProps) {
  const filteredProjects = selectedOrgId
    ? projects.filter(p => departments.some(d => d.id === p.departmentId))
    : projects;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-indigo-500">account_tree</span>
          Departments
        </h3>
        {(selectedDepartmentId || selectedOrgId) && (
          <button
            onClick={onClearFilters}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear Filters
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => onDepartmentSelect("")}
          className={`
            shrink-0 p-4 rounded-xl border transition-all duration-200 min-w-[180px]
            ${!selectedDepartmentId
              ? "border-indigo-300 bg-indigo-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm"
            }
          `}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={`material-symbols-outlined text-xl ${!selectedDepartmentId ? "text-indigo-600" : "text-slate-400"}`}>
              layers
            </span>
            <span className={`text-sm font-bold ${!selectedDepartmentId ? "text-indigo-700" : "text-slate-700"}`}>
              All Departments
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${!selectedDepartmentId ? "text-indigo-700" : "text-slate-700"}`}>
              {filteredProjects.length}
            </span>
            <span className="text-[11px] text-slate-400">projects</span>
          </div>
        </button>

        {departments.map((dept, index) => {
          const deptProjects = filteredProjects.filter(p => p.departmentId === dept.id);
          const colors = getDepartmentColor(index);
          const isSelected = selectedDepartmentId === dept.id;

          return (
            <button
              key={dept.id}
              onClick={() => onDepartmentSelect(isSelected ? "" : dept.id)}
              className={`
                shrink-0 p-4 rounded-xl border-2 transition-all duration-200 min-w-[180px]
                ${isSelected
                  ? `${colors.border} ${colors.bg} shadow-md`
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }
              `}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <span className={`text-sm font-bold ${isSelected ? colors.text : 'text-slate-700'}`}>
                  {dept.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${isSelected ? colors.text : 'text-slate-700'}`}>
                  {deptProjects.length}
                </span>
                <span className="text-[11px] text-slate-400">projects</span>
              </div>
              
              <div className="mt-3 w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${colors.dot}`}
                  style={{ width: `${deptProjects.length > 0 ? Math.min((deptProjects.length / filteredProjects.length) * 100, 100) : 0}%` }}
                />
              </div>
            </button>
          );
        })}

        {departments.length === 0 && selectedOrgId && (
          <div className="shrink-0 p-4 rounded-xl border border-slate-200 bg-slate-50 min-w-[200px] flex items-center justify-center">
            <span className="text-sm text-slate-400">No departments in this organization</span>
          </div>
        )}
      </div>
    </div>
  );
}