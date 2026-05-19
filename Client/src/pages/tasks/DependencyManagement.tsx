import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useToast } from "../../pages/shared";
import type { Task, TaskDependency } from "../../types";
import { GlassCard, GradientButton } from "../../pages/shared";

interface DependencyManagementProps {
  task: Task;
  allTasks: Task[];
  onRefresh: () => void;
  onMessage?: (message: string) => void;
}

const dependencyTypes = ["FinishToStart", "StartToStart", "FinishToFinish", "StartToFinish"];

function getDependencyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FinishToStart: "FS",
    StartToStart: "SS",
    FinishToFinish: "FF",
    StartToFinish: "SF",
  };
  return labels[type] || type;
}

function getDependencyTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    FinishToStart: "Predecessor must finish before successor can start",
    StartToStart: "Predecessor must start before successor can start",
    FinishToFinish: "Predecessor must finish before successor can finish",
    StartToFinish: "Predecessor must start before successor can finish",
  };
  return descriptions[type] || type;
}

export function DependencyManagement({ task, allTasks, onRefresh, onMessage }: DependencyManagementProps) {
  const { auth } = useAuth();
  const { addToast } = useToast();
  const [dependencies, setDependencies] = useState<TaskDependency[]>(task.dependencies || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDep, setEditingDep] = useState<TaskDependency | null>(null);
  const [form, setForm] = useState({ predecessorTaskId: "", successorTaskId: "", type: "FinishToStart", lagDays: 0 });

  const isAdmin =
    auth?.roles?.includes("SuperAdmin") ||
    auth?.roles?.includes("ProjectManager") ||
    auth?.roles?.includes("DepartmentHead") ||
    auth?.roles?.includes("TeamLead") ||
    auth?.roles?.includes("Manager");

  useEffect(() => {
    setDependencies(task.dependencies || []);
  }, [task.id, task.dependencies]);

  const predecessorTasks = allTasks.filter(t => t.id !== task.id && !t.parentTaskId);
  const successorTasks = allTasks.filter(t => t.id !== task.id && !t.parentTaskId);

  const handleCreate = async () => {
    if (!auth || !form.predecessorTaskId || !form.successorTaskId) return;
    if (form.predecessorTaskId === form.successorTaskId) {
      addToast("A task cannot depend on itself.", "error");
      return;
    }
    await api.createTaskDependency(auth.token, task.id, {
      predecessorTaskId: form.predecessorTaskId,
      successorTaskId: form.successorTaskId,
      type: form.type,
      lagDays: form.lagDays,
    });
    setForm({ predecessorTaskId: "", successorTaskId: "", type: "FinishToStart", lagDays: 0 });
    setShowAddForm(false);
    onRefresh();
    addToast("Dependency created.");
    onMessage?.("Dependency created.");
  };

  const handleUpdate = async () => {
    if (!auth || !editingDep) return;
    await api.updateTaskDependency(auth.token, editingDep.id, {
      type: editingDep.type,
      lagDays: editingDep.lagDays,
    });
    setEditingDep(null);
    onRefresh();
    addToast("Dependency updated.");
    onMessage?.("Dependency updated.");
  };

  const handleDelete = async (depId: string) => {
    if (!auth) return;
    await api.deleteTaskDependency(auth.token, depId);
    setDependencies(prev => prev.filter(d => d.id !== depId));
    onRefresh();
    addToast("Dependency deleted.");
    onMessage?.("Dependency deleted.");
  };

  const predecessorDeps = dependencies.filter(d => d.successorTaskId === task.id);
  const successorDeps = dependencies.filter(d => d.predecessorTaskId === task.id);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">account_tree</span>
          Dependencies
          <span className="text-xs font-medium text-slate-400">({dependencies.length})</span>
        </h4>
        {isAdmin && (
          <GradientButton variant="ghost" onClick={() => setShowAddForm(!showAddForm)}>
            <span className="material-symbols-outlined text-base">{showAddForm ? "close" : "add"}</span>
            {showAddForm ? "Cancel" : "Add"}
          </GradientButton>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Predecessor Task</label>
              <select
                value={form.predecessorTaskId}
                onChange={(e) => setForm({ ...form, predecessorTaskId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
              >
                <option value="">Select predecessor...</option>
                {predecessorTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Successor Task</label>
              <select
                value={form.successorTaskId}
                onChange={(e) => setForm({ ...form, successorTaskId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
              >
                <option value="">Select successor...</option>
                {successorTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                >
                  {dependencyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Lag (days)</label>
                <input
                  type="number"
                  value={form.lagDays}
                  onChange={(e) => setForm({ ...form, lagDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!form.predecessorTaskId || !form.successorTaskId}
              className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Dependency
            </button>
          </div>
        </div>
      )}

      {dependencies.length > 0 ? (
        <div className="space-y-4">
          {predecessorDeps.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Predecessors (blocks this task)</h5>
              <div className="space-y-2">
                {predecessorDeps.map(dep => {
                  const predTask = allTasks.find(t => t.id === dep.predecessorTaskId);
                  return (
                    <DependencyRow
                      key={dep.id}
                      dep={dep}
                      otherTask={predTask}
                      direction="predecessor"
                      editingDep={editingDep}
                      setEditingDep={setEditingDep}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      isAdmin={isAdmin}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {successorDeps.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Successors (blocked by this task)</h5>
              <div className="space-y-2">
                {successorDeps.map(dep => {
                  const succTask = allTasks.find(t => t.id === dep.successorTaskId);
                  return (
                    <DependencyRow
                      key={dep.id}
                      dep={dep}
                      otherTask={succTask}
                      direction="successor"
                      editingDep={editingDep}
                      setEditingDep={setEditingDep}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      isAdmin={isAdmin}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        !showAddForm && (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-2xl mb-2 block">account_tree</span>
            <p className="text-xs">No dependencies yet</p>
            <p className="text-[10px] mt-1">Add dependencies to define task ordering</p>
          </div>
        )
      )}
    </GlassCard>
  );
}

function DependencyRow({
  dep,
  otherTask,
  direction,
  editingDep,
  setEditingDep,
  onUpdate,
  onDelete,
  isAdmin,
}: {
  dep: TaskDependency;
  otherTask?: Task;
  direction: "predecessor" | "successor";
  editingDep: TaskDependency | null;
  setEditingDep: (dep: TaskDependency | null) => void;
  onUpdate: () => void;
  onDelete: (depId: string) => void;
  isAdmin: boolean;
}) {
  const isEditing = editingDep?.id === dep.id;

  return (
    <div className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all">
      {isEditing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={editingDep.type}
              onChange={(e) => setEditingDep({ ...editingDep, type: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-300"
            >
              {["FinishToStart", "StartToStart", "FinishToFinish", "StartToFinish"].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="number"
              value={editingDep.lagDays}
              onChange={(e) => setEditingDep({ ...editingDep, lagDays: parseInt(e.target.value) || 0 })}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-300"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onUpdate} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Save</button>
            <button onClick={() => setEditingDep(null)} className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                dep.type === "FinishToStart" ? "bg-blue-100 text-blue-700" :
                dep.type === "StartToStart" ? "bg-green-100 text-green-700" :
                dep.type === "FinishToFinish" ? "bg-purple-100 text-purple-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {getDependencyTypeLabel(dep.type)}
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate">
                {otherTask?.title || dep.predecessorTaskTitle || dep.successorTaskTitle || "Unknown Task"}
              </span>
            </div>
            <p className="text-xs text-slate-500">{getDependencyTypeDescription(dep.type)}</p>
            {dep.lagDays !== 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {dep.lagDays > 0 ? `+${dep.lagDays} day${dep.lagDays > 1 ? "s" : ""} lag` : `${dep.lagDays} day${dep.lagDays < -1 ? "s" : ""} lead`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => setEditingDep(dep)}
                  className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  onClick={() => onDelete(dep.id)}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
