import { priorities } from "../../constants";

import type { Department } from "../../../types";

interface ProjectDetailsStepProps {
  name: string;
  description: string;
  priority: string;
  budget: number;
  startDate: string;
  endDate: string;
  onChange: (field: string, value: string | number) => void;
  primaryDepartmentId?: string;
  departments?: Department[];
  onPrimaryDepartmentChange?: (id: string) => void;
}

export function ProjectDetailsStep({ name, description, priority, budget, startDate, endDate, onChange, primaryDepartmentId, departments, onPrimaryDepartmentChange }: ProjectDetailsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter project name"
          className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          required
        />
      </div>

        {departments && onPrimaryDepartmentChange && (
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Primary Department <span className="text-slate-300 font-normal">(creator)</span>
          </label>
          <select
            value={primaryDepartmentId ?? ""}
            onChange={(e) => onPrimaryDepartmentChange(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="">-- None --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Brief description of the project"
          rows={3}
          className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => onChange("priority", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Budget ($)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => onChange("budget", Number(e.target.value))}
            placeholder="0"
            min={0}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

    
    </div>
  );
}
