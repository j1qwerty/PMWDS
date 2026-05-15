import { useState, useEffect, type FormEvent } from "react";
import type { Milestone, Project, Task, User } from "../../types";
import { ModalOverlay, InputF, SelectF } from "../shared";

interface TaskFormModalProps {
  open: boolean;
  initialData?: Task;
  projects: Project[];
  milestones: Milestone[];
  users: User[];
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function TaskFormModal({ open, initialData, projects, milestones, users, onSubmit, onClose }: TaskFormModalProps) {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    startDate: initialData?.startDate?.slice(0, 10) || "",
    dueDate: initialData?.dueDate?.slice(0, 10) || "",
    estimatedHours: initialData?.estimatedHours || 8,
    projectId: initialData?.projectId || "",
    milestoneId: initialData?.milestoneId || "",
    assignedToUserId: initialData?.assignedToUserId || "",
    priority: initialData?.priority || "Medium",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: initialData?.title || "",
        description: initialData?.description || "",
        startDate: initialData?.startDate?.slice(0, 10) || "",
        dueDate: initialData?.dueDate?.slice(0, 10) || "",
        estimatedHours: initialData?.estimatedHours || 8,
        projectId: initialData?.projectId || "",
        milestoneId: initialData?.milestoneId || "",
        assignedToUserId: initialData?.assignedToUserId || "",
        priority: initialData?.priority || "Medium",
      });
    }
  }, [open, initialData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      milestoneId: form.milestoneId || null,
      assignedToUserId: form.assignedToUserId || null,
    });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-8 w-[560px] max-w-[95vw] shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-2xl">
              {initialData ? "edit" : "add_task"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? "Edit Task" : "Create Task"}
            </h2>
            <p className="text-sm text-slate-500">
              {initialData ? "Update task details" : "Add a new task to the project"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputF label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <InputF label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          
          <div className="grid grid-cols-2 gap-4">
            <InputF label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <InputF label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputF label="Est. Hours" type="number" value={form.estimatedHours} onChange={(v) => setForm({ ...form, estimatedHours: Number(v) })} />
            <SelectF
              label="Priority"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={["Low", "Medium", "High", "Critical"].map(p => ({ value: p, label: p }))}
            />
          </div>

          <SelectF
            label="Project"
            value={form.projectId}
            onChange={(v) => setForm({ ...form, projectId: v, milestoneId: "" })}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
          />

          <SelectF
            label="Milestone"
            value={form.milestoneId}
            onChange={(v) => setForm({ ...form, milestoneId: v })}
            options={[
              { value: "", label: "None" },
              ...milestones.map(m => ({ value: m.id, label: m.name })),
            ]}
          />

          <SelectF
            label="Assignee"
            value={form.assignedToUserId}
            onChange={(v) => setForm({ ...form, assignedToUserId: v })}
            options={[
              { value: "", label: "Unassigned" },
              ...users.map(u => ({ value: u.id, label: u.fullName })),
            ]}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl border-none bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors">
              {initialData ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}