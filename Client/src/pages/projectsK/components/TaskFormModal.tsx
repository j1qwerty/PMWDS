import { useEffect, useState, useMemo, type FormEvent } from "react";
import type { Department, Milestone, Project, Task, User } from "../../../types";
import { priorities } from "../../constants";
import { ModalOverlay, InputF, SelectF, AvatarStack, ScopedUserSelect, getProjectDepartmentIds } from "../../shared";

const getToday = () => new Date().toISOString().slice(0, 10);

interface TaskFormModalProps {
  open: boolean;
  initialData?: Task;
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  projects: Project[];
  departments?: Department[];
  milestones: Milestone[];
  users: User[];
  organizationId?: string | null;
  roles?: string[];
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface FieldErrors {
  title?: string;
  projectId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: string;
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
  organizationId,
  roles = [],
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: getToday(),
    dueDate: "",
    estimatedHours: 8,
    projectId: defaultProjectId,
    milestoneId: defaultMilestoneId,
    assignedToUserIds: [] as string[],
    priority: "Medium",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm({
        title: initialData?.title || "",
        description: initialData?.description || "",
        startDate: initialData?.startDate?.slice(0, 10) || getToday(),
        dueDate: initialData?.dueDate?.slice(0, 10) || "",
        estimatedHours: initialData?.estimatedHours || 8,
        projectId: initialData?.projectId || defaultProjectId,
        milestoneId: initialData?.milestoneId || defaultMilestoneId,
        assignedToUserIds:
          initialData?.assignees?.map((a) => a.userId) ||
          (initialData?.assignedToUserId ? [initialData.assignedToUserId] : []),
        priority: initialData?.priority || "Medium",
      });
    }
  }, [open, initialData, defaultProjectId, defaultMilestoneId]);

  const assignedUsers = useMemo(() => {
    return form.assignedToUserIds.map((id) => {
      const user = users.find((u) => u.id === id);
      return { id, fullName: user?.fullName ?? "Unknown", profilePictureUrl: user?.profilePictureUrl ?? null };
    });
  }, [form.assignedToUserIds, users]);

  if (!open) return null;

  const canAssignMilestone = roles.some((r) => r === "SuperAdmin" || r === "Director");
  const projectMilestones = milestones.filter((m) => m.projectId === form.projectId);
  const selectedProject = projects.find((p) => p.id === form.projectId);
  const selectedDepartment = selectedProject
    ? departments.find((d) => d.id === getProjectDepartmentIds(selectedProject)[0])
    : undefined;
  const projectDepartmentId = selectedProject
    ? getProjectDepartmentIds(selectedProject)[0]
    : undefined;

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!defaultProjectId && !form.projectId) errs.projectId = "Project is required";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.dueDate) errs.dueDate = "Due date is required";
    if (form.startDate && form.dueDate && form.startDate > form.dueDate)
      errs.dueDate = "Due date must be after start date";
    if (form.estimatedHours < 1) errs.estimatedHours = "Must be at least 1 hour";
    return errs;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const submission: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedHours: form.estimatedHours,
      priority: form.priority,
      projectId: form.projectId,
      assignedToUserIds: form.assignedToUserIds,
    };
    if (form.milestoneId) submission.milestoneId = form.milestoneId;
    if (form.assignedToUserIds[0]) submission.assignedToUserId = form.assignedToUserIds[0];
    onSubmit(submission);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-2xl">{initialData ? "edit" : "add_task"}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? "Edit Task" : "New Task"}</h2>
           
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <InputF label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title}</span>}
          </div>
          <InputF label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputF label="Start" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
              {errors.startDate && <span className="text-xs text-red-500 mt-1 block">{errors.startDate}</span>}
            </div>
            <div>
              <InputF label="Due" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
              {errors.dueDate && <span className="text-xs text-red-500 mt-1 block">{errors.dueDate}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputF label="Est. hours" type="number" value={form.estimatedHours} onChange={(v) => setForm({ ...form, estimatedHours: Number(v) })} />
              {errors.estimatedHours && <span className="text-xs text-red-500 mt-1 block">{errors.estimatedHours}</span>}
            </div>
            <SelectF
              label="Priority"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={priorities.map((p) => ({ value: p, label: p }))}
            />
          </div>
          {!defaultProjectId && (
            <div>
              <SelectF
                label="Project"
                value={form.projectId}
                onChange={(v) => setForm({ ...form, projectId: v, milestoneId: "" })}
                options={[{ value: "", label: "Select project" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
              />
              {errors.projectId && <span className="text-xs text-red-500 mt-1 block">{errors.projectId}</span>}
            </div>
          )}
          {canAssignMilestone && (
            <SelectF
              label="Milestone"
              value={form.milestoneId || ""}
              onChange={(v) => setForm({ ...form, milestoneId: v })}
              options={[{ value: "", label: "None" }, ...projectMilestones.map((m) => ({ value: m.id, label: m.name }))]}
            />
          )}
          {assignedUsers.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-xs w-fit">
              <AvatarStack people={assignedUsers} size="xs" />
              <span className="text-slate-600 font-medium truncate max-w-50">
                {assignedUsers.map(u => u.fullName).join(", ")}
              </span>
            </div>
          )}
          <ScopedUserSelect
            users={users}
            values={form.assignedToUserIds}
            organizationId={organizationId ?? selectedDepartment?.organizationId}
            departmentId={projectDepartmentId}
            label="Assignees"
            multiple
            onChange={(userId) => setForm({ ...form, assignedToUserIds: userId ? [userId] : [] })}
            onMultiChange={(assignedToUserIds) => setForm({ ...form, assignedToUserIds })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
              Save
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
