import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import { RoleKey, hasRoleKey } from "../../permissions";
import type { Goal } from "../../types";
import {
  GlassCard,
  LoadingPage,
  useNavHeader,
  usePermission,
  useToast,
} from "../shared";
import { Dialog } from "../shared/Dialog";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";
import { Icon } from "../../components/ui/Icon";

const priorityOptions = ["Low", "Medium", "High", "Critical"];

export function ProjectGoalsPage() {
  const ws = useProjectWorkspace();
  const { data } = useAppData();
  const { auth } = useAuth();
  const perm = usePermission();
  const { addToast } = useToast();
  const { setNavHeader } = useNavHeader();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [error, setError] = useState("");
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [transferGoal, setTransferGoal] = useState<Goal | null>(null);
  const [formError, setFormError] = useState("");

  const loadGoals = async () => {
    if (!auth || !ws.project) return;
    setLoadingGoals(true);
    setError("");
    try {
      setGoals(await api.getGoalsByProject(auth.token, ws.project.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load goals.");
    } finally {
      setLoadingGoals(false);
    }
  };

  useEffect(() => {
    void loadGoals();
  }, [auth, ws.project?.id]);

  useEffect(() => {
    setNavHeader({
      title: ws.project ? `Goals · ${ws.project.name}` : "Goals",
      description: "Define project outcomes and assign each goal to one department.",
      actions: perm.module("goal").create() ? [{
        label: "New goal",
        onClick: () => { setEditGoal(null); setFormError(""); setShowForm(true); },
        icon: "flag",
      }] : undefined,
    });
  }, [setNavHeader, ws.project, perm]);

  const projectDepartments = useMemo(() => {
    if (!ws.project) return [];
    const ids = new Set([
      ws.project.departmentId,
      ...(ws.project.departmentIds ?? []),
      ...(ws.project.departments ?? []).map((item) => item.departmentId),
    ]);
    return data.departments.filter((department) => ids.has(department.id));
  }, [data.departments, ws.project]);

  const currentUser = data.users.find((user) => user.id === auth?.userId);
  const canReview = (goal: Goal) =>
    Boolean(goal.pendingTransferToDepartmentId) &&
    (perm.isSuperAdmin ||
      hasRoleKey(perm.roleKeys, RoleKey.Director) ||
      (hasRoleKey(perm.roleKeys, RoleKey.DepartmentHead) &&
        currentUser?.departments.some(
          (department) => department.departmentId === goal.pendingTransferToDepartmentId,
        )));

  const handleSave = async (payload: {
    title: string;
    description: string;
    assignedDepartmentId: string;
    priority: string;
    dueDate: string;
  }) => {
    if (!auth || !ws.project) return;
    setFormError("");
    try {
      if (editGoal) {
        await api.updateGoal(auth.token, editGoal.id, {
          assignedDepartmentId: payload.assignedDepartmentId,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          dueDate: payload.dueDate,
        });
        addToast("Goal updated");
      } else {
        await api.createGoal(auth.token, {
          projectId: ws.project.id,
          ...payload,
        });
        addToast("Goal created");
      }
      setShowForm(false);
      setEditGoal(null);
      await loadGoals();
      await ws.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save goal.");
    }
  };

  const handleDelete = async (goal: Goal) => {
    if (!auth) return;
    try {
      await api.deleteGoal(auth.token, goal.id);
      addToast("Goal deleted");
      await loadGoals();
      await ws.refresh();
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "Failed to delete goal.", "error");
    }
  };

  const handleTransfer = async (goal: Goal, toDepartmentId: string, reason: string) => {
    if (!auth) return;
    try {
      await api.requestGoalTransfer(auth.token, goal.id, toDepartmentId, reason);
      addToast("Goal transfer requested");
      setTransferGoal(null);
      await loadGoals();
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "Failed to request transfer.", "error");
    }
  };

  const handleReviewTransfer = async (goal: Goal, acknowledge: boolean) => {
    if (!auth || !goal.pendingTransferId) return;
    try {
      await api.reviewGoalTransfer(auth.token, goal.pendingTransferId, acknowledge);
      addToast(acknowledge ? "Goal transfer acknowledged" : "Goal transfer rejected");
      await loadGoals();
      await ws.refresh();
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "Failed to review transfer.", "error");
    }
  };

  if (ws.loading || loadingGoals) return <LoadingPage label="Loading project goals..." />;
  if (!ws.project) return <ProjectNotFound />;

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!goals.length ? (
        <GlassCard className="p-10 text-center">
          <Icon name="flag" size={28} className="mx-auto text-indigo-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">No goals yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Create the first project goal, then add milestones beneath it.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => {
            const department = projectDepartments.find((item) => item.id === goal.assignedDepartmentId);
            return (
              <GlassCard key={goal.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon name={goal.status === "Completed" ? "check_circle" : "flag"} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-bold text-slate-900">{goal.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{goal.priority}</span>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{goal.status}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{goal.description || "No description provided."}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <Meta label="Department" value={department?.name ?? goal.assignedDepartmentName ?? "—"} />
                  <Meta label="Due" value={new Date(goal.dueDate).toLocaleDateString()} />
                  <Meta label="Milestones" value={String(goal.milestoneCount)} />
                  <Meta label="Progress" value={`${Math.round(goal.progressPercentage)}%`} />
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, goal.progressPercentage))}%` }} />
                </div>

                {goal.pendingTransferToDepartmentId && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    Transfer pending to{" "}
                    <strong>{projectDepartments.find((item) => item.id === goal.pendingTransferToDepartmentId)?.name ?? "another department"}</strong>.
                    {canReview(goal) && (
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => void handleReviewTransfer(goal, true)} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Acknowledge</button>
                        <button type="button" onClick={() => void handleReviewTransfer(goal, false)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100">Reject</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                  {perm.module("goal").edit() && (
                    <button type="button" onClick={() => { setEditGoal(goal); setFormError(""); setShowForm(true); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Edit</button>
                  )}
                  {perm.module("goal").edit() && (
                    <button type="button" onClick={() => setTransferGoal(goal)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Transfer</button>
                  )}
                  {perm.module("goal").delete() && (
                    <button type="button" onClick={() => void handleDelete(goal)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {showForm && (
        <GoalFormDialog
          goal={editGoal}
          departments={projectDepartments}
          error={formError}
          onClose={() => { setShowForm(false); setEditGoal(null); }}
          onSubmit={handleSave}
        />
      )}

      {transferGoal && (
        <GoalTransferDialog
          goal={transferGoal}
          departments={projectDepartments.filter((item) => item.id !== transferGoal.assignedDepartmentId)}
          onClose={() => setTransferGoal(null)}
          onSubmit={(departmentId, reason) => handleTransfer(transferGoal, departmentId, reason)}
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function GoalFormDialog({
  goal,
  departments,
  error,
  onClose,
  onSubmit,
}: {
  goal: Goal | null;
  departments: { id: string; name: string }[];
  error: string;
  onClose: () => void;
  onSubmit: (payload: { title: string; description: string; assignedDepartmentId: string; priority: string; dueDate: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    assignedDepartmentId: goal?.assignedDepartmentId ?? departments[0]?.id ?? "",
    priority: goal?.priority ?? "Medium",
    dueDate: goal?.dueDate?.slice(0, 10) ?? "",
  });

  return (
    <Dialog
      title={goal ? "Edit goal" : "Create goal"}
      description="A goal belongs to one department and can contain multiple milestones."
      icon="flag"
      size="md"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => void onSubmit({
            title: form.title.trim(),
            description: form.description.trim(),
            assignedDepartmentId: form.assignedDepartmentId,
            priority: form.priority,
            dueDate: form.dueDate,
          })} disabled={!form.title.trim() || !form.assignedDepartmentId || !form.dueDate} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {goal ? "Update goal" : "Create goal"}
          </button>
        </div>
      }
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Goal title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</span>
          <select value={form.assignedDepartmentId} onChange={(event) => setForm({ ...form, assignedDepartmentId: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</span>
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
              {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due date</span>
            <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</span>
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
        </label>
      </div>
    </Dialog>
  );
}

function GoalTransferDialog({
  goal,
  departments,
  onClose,
  onSubmit,
}: {
  goal: Goal;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (departmentId: string, reason: string) => Promise<void>;
}) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [reason, setReason] = useState("");

  return (
    <Dialog
      title="Transfer goal"
      description="The current assignment stays in place until the receiving department acknowledges the transfer."
      icon="swap_horiz"
      size="sm"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => void onSubmit(departmentId, reason.trim())} disabled={!departmentId} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Request transfer</button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receiving department</span>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reason</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
        </label>
      </div>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
    </label>
  );
}
