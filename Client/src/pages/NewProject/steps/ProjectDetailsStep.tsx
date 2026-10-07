import { useState } from "react";
import { priorities } from "../../constants";

import type { Department } from "../../../types";
import { BUDGET_INPUT_LABEL, formatRupees, lakhsToRupees } from "../../../ui";

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
  /** Files to attach to the project once it exists. */
  projectDocuments?: File[];
  onProjectDocumentsChange?: (files: File[]) => void;
  /** Whether the caller holds the project-level document upload permission. */
  canUploadProjectDocuments?: boolean;
}

export function ProjectDetailsStep({
  name,
  description,
  priority,
  budget,
  startDate,
  endDate,
  onChange,
  primaryDepartmentId,
  departments,
  onPrimaryDepartmentChange,
  projectDocuments = [],
  onProjectDocumentsChange,
  canUploadProjectDocuments = false,
}: ProjectDetailsStepProps) {
  // The budget is typed in lakhs. Holding the raw text locally keeps typing natural: with a
  // controlled value of 0 the browser edits "0" as a string, so typing 20 lands as "020".
  const [budgetLakhs, setBudgetLakhs] = useState(budget > 0 ? String(budget) : "");

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
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            {BUDGET_INPUT_LABEL}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
            <input
              type="number"
              value={budgetLakhs}
              onChange={(e) => {
                const text = e.target.value;
                setBudgetLakhs(text);
                onChange("budget", text === "" ? 0 : Number(text));
              }}
              placeholder="0"
              min={0}
              step={0.5}
              title="Enter the project budget in lakhs (1 lakh = ₹1,00,000)"
              className="w-full p-3 pl-7 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Enter amount in lakhs (1 lakh = ₹1,00,000)
            {budget > 0 && <> &middot; {formatRupees(lakhsToRupees(budget))}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChange("endDate", e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          {startDate && endDate && endDate < startDate && (
            <p className="text-[10px] text-red-600 mt-1">End date must be on or after the start date</p>
          )}
        </div>
      </div>

      {/* Project-level documents.
          Offered on this step only, and only for a caller holding the project-level
          upload permission. Milestone- and task-level documents are attached later,
          from the project's documents tab, because neither a milestone nor a task
          exists yet at this point in the wizard. */}
      {canUploadProjectDocuments && onProjectDocumentsChange && (
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Project Documents <span className="text-slate-300 font-normal">(optional)</span>
          </label>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors">
              <span className="material-symbols-outlined text-base">attach_file</span>
              Attach document
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const added = Array.from(event.target.files ?? []);
                  if (added.length > 0) {
                    onProjectDocumentsChange([...projectDocuments, ...added]);
                  }
                  event.target.value = "";
                }}
              />
            </label>
            <p className="text-[10px] text-slate-400">
              These will be filed against the project itself, so everyone who can see the project
              sees them.
            </p>
          </div>

          {projectDocuments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {projectDocuments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5"
                >
                  <span className="material-symbols-outlined text-slate-400 text-sm">
                    description
                  </span>
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onProjectDocumentsChange(projectDocuments.filter((_, i) => i !== index))
                    }
                    className="text-slate-400 hover:text-red-500"
                    title="Remove"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
