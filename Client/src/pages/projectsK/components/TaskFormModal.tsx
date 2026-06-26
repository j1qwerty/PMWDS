import { useEffect, useState, useMemo, type FormEvent } from "react";
import type { Department, Milestone, Project, Task, User } from "../../../types";
import { priorities } from "../../constants";
import { ModalOverlay, InputF, SelectF, AvatarStack, ScopedUserSelect, getProjectDepartmentIds } from "../../shared";

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
  organizationId,
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
    estimatedHours: 8,
    projectId: defaultProjectId,
    milestoneId: defaultMilestoneId,
    departmentId: "",
    assignedToUserIds: [] as string[],
    priority: "Medium",
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
        departmentId: initialData?.departmentId || "",
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

  const projectMilestones = milestones.filter((m) => m.projectId === form.projectId);
  const selectedMilestone = projectMilestones.find((m) => m.id === form.milestoneId);
  const milestoneDepartments = selectedMilestone?.departmentIds ?? [];
  const selectedProject = projects.find((p) => p.id === form.projectId);
  const selectedDepartment = selectedProject
    ? departments.find((d) => d.id === getProjectDepartmentIds(selectedProject)[0])
    : undefined;
  const projectDepartmentId = selectedProject
    ? getProjectDepartmentIds(selectedProject)[0]
    : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.projectId) return;
    const submission: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedHours: form.estimatedHours,
      priority: form.priority,
      projectId: form.projectId,
      assignedToUserIds: form.assignedToUserIds,
    };
    if (form.milestoneId) submission.milestoneId = form.milestoneId;
    if (form.departmentId) submission.departmentId = form.departmentId;
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
          <InputF label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <InputF label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-4">
            <InputF label="Start" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <InputF label="Due" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputF label="Est. hours" type="number" value={form.estimatedHours} onChange={(v) => setForm({ ...form, estimatedHours: Number(v) })} />
            <SelectF
              label="Priority"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={priorities.map((p) => ({ value: p, label: p }))}
            />
          </div>
          {!defaultProjectId && (
            <SelectF
              label="Project"
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v, milestoneId: "" })}
              options={[{ value: "", label: "Select project" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
          <SelectF
            label="Milestone"
            value={form.milestoneId || ""}
            onChange={(v) => setForm({ ...form, milestoneId: v, departmentId: "" })}
            options={[{ value: "", label: "None" }, ...projectMilestones.map((m) => ({ value: m.id, label: m.name }))]}
          />
          {milestoneDepartments.length > 0 && (
            <SelectF
              label="Department"
              value={form.departmentId}
              onChange={(v) => setForm({ ...form, departmentId: v })}
              options={[
                { value: "", label: "All departments" },
                ...milestoneDepartments.map((deptId) => {
                  const dept = departments.find((d) => d.id === deptId);
                  return { value: deptId, label: dept?.name ?? deptId };
                }),
              ]}
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
