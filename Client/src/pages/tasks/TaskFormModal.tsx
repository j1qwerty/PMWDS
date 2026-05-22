import { useState, useEffect, type FormEvent } from "react";
import type { Department, Milestone, Project, Task, User } from "../../types";
import { ModalOverlay, InputF, SelectF, ScopedUserSelect } from "../shared";

interface TaskFormModalProps {
  open: boolean;
  initialData?: Task;
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  projects: Project[];
  departments?: Department[];
  milestones: Milestone[];
  users: User[];
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function TaskFormModal({ 
  open, 
  initialData, 
  defaultProjectId = "", 
  defaultMilestoneId = "", 
  projects, 
  departments = [], 
  milestones, 
  users, 
  onSubmit, 
  onClose 
}: TaskFormModalProps) {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    startDate: initialData?.startDate?.slice(0, 10) || "",
    dueDate: initialData?.dueDate?.slice(0, 10) || "",
    estimatedHours: initialData?.estimatedHours || 8,
    projectId: initialData?.projectId || defaultProjectId,
    milestoneId: initialData?.milestoneId || defaultMilestoneId,
    assignedToUserId: initialData?.assignedToUserId || "",
    assignedToUserIds: initialData?.assignees?.map(item => item.userId) || (initialData?.assignedToUserId ? [initialData.assignedToUserId] : []),
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
        projectId: initialData?.projectId || defaultProjectId,
        milestoneId: initialData?.milestoneId || defaultMilestoneId,
        assignedToUserId: initialData?.assignedToUserId || "",
        assignedToUserIds: initialData?.assignees?.map(item => item.userId) || (initialData?.assignedToUserId ? [initialData.assignedToUserId] : []),
        priority: initialData?.priority || "Medium",
      });
    }
  }, [open, initialData, defaultProjectId, defaultMilestoneId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.projectId) return;
    
    // Build clean submission object
    const submission: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedHours: form.estimatedHours,
      priority: form.priority,
      assignedToUserIds: form.assignedToUserIds,
    };
    
    if (form.projectId) {
      submission.projectId = form.projectId;
    }
    
    // Include milestoneId only if it has a value
    if (form.milestoneId && form.milestoneId !== "") {
      submission.milestoneId = form.milestoneId;
    }
    
    // Include assignedToUserId if available
    if (form.assignedToUserIds[0]) {
      submission.assignedToUserId = form.assignedToUserIds[0];
    }
    
    onSubmit(submission);
  };

  const selectedProject = projects.find((project) => project.id === form.projectId);
  const selectedDepartment = departments.find((department) => department.id === selectedProject?.departmentId);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-8 w-[920px] max-w-[95vw] shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <InputF label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            </div>
            <InputF label="Est. Hours" type="number" value={form.estimatedHours} onChange={(v) => setForm({ ...form, estimatedHours: Number(v) })} />
          </div>
          <InputF label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputF label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <InputF label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <SelectF
              label="Priority"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={["Low", "Medium", "High", "Critical"].map(p => ({ value: p, label: p }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectF
              label="Project"
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v, milestoneId: "" })}
              options={[
                { value: "", label: "Select project" },
                ...projects.map(p => ({ value: p.id, label: p.name })),
              ]}
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
          </div>

          <ScopedUserSelect
            users={users}
            values={form.assignedToUserIds}
            organizationId={selectedDepartment?.organizationId}
            label="Assignees"
            multiple
            onChange={(userId) => setForm({ ...form, assignedToUserId: userId, assignedToUserIds: [userId] })}
            onMultiChange={(assignedToUserIds) => setForm({ ...form, assignedToUserIds, assignedToUserId: assignedToUserIds[0] || "" })}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!form.projectId} className="px-5 py-2.5 rounded-xl border-none bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {initialData ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
