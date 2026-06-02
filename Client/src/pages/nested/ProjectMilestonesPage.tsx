import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Milestone, Task } from "../../types";
import {
  AnimatedBackground,
  GlassCard,
  LoadingPage,
  useNavHeader,
  PERMISSION_GROUPS,
  usePermission,
  useToast,
} from "../shared";
import {
  MilestonesPanel,
  TaskSubtaskCard,
  TaskSubtaskDetailsModal,
  TaskFormModal,
  MilestoneFormModal,
  ConfirmDeleteModal,
} from "../projectsK/components";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";

export function ProjectMilestonesPage() {
  const ws = useProjectWorkspace();
  const { auth } = useAuth();
  const { addToast } = useToast();
  const perm = usePermission();
  const canManageMilestones = perm.has(PERMISSION_GROUPS.milestone.manage);
  const canManageTasks = perm.has(PERMISSION_GROUPS.task.manage);

  const [pickedMilestoneId, setPickedMilestoneId] = useState("");

  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; edit?: Milestone }>({
    open: false,
  });
  const [deleteMilestone, setDeleteMilestone] = useState<Milestone | null>(null);
  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    edit?: Task;
    milestoneId?: string;
  }>({ open: false });
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [viewTask, setViewTask] = useState<Task | null>(null);

  const { setNavHeader } = useNavHeader();

  const selectedMilestoneId =
    pickedMilestoneId && ws.milestones.some((m) => m.id === pickedMilestoneId)
      ? pickedMilestoneId
      : ws.milestones[0]?.id ?? "";

  useEffect(() => {
    if (!ws.project) {
      setNavHeader({ title: "Milestones", description: "" });
      return;
    }
    const actions = [];
    if (canManageMilestones) {
      actions.push({
        label: "New milestone",
        onClick: () => setMilestoneModal({ open: true }),
        icon: "flag",
      });
    }
    if (canManageTasks) {
      actions.push({
        label: "New task",
        onClick: () =>
          setTaskModal({ open: true, milestoneId: selectedMilestoneId }),
        icon: "add_task",
      });
    }
    setNavHeader({
      title: `Milestones · ${ws.project.name}`,
      description: "Track milestones with their tasks and subtasks",
      actions,
    });
  }, [
    setNavHeader,
    ws.project,
    canManageMilestones,
    canManageTasks,
    selectedMilestoneId,
  ]);

  const milestoneTasks = useMemo(() => {
    if (!selectedMilestoneId) return [];
    return ws.tasks.filter((t) => t.milestoneId === selectedMilestoneId);
  }, [ws.tasks, selectedMilestoneId]);

  const selectedTask = ws.tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedMilestone =
    ws.milestones.find((m) => m.id === selectedMilestoneId) ?? null;

  const getProgressColor = (progress: number): string => {
    if (progress === 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-amber-400";
    if (progress >= 50) return "bg-cyan-400";
    if (progress >= 25) return "bg-rose-400";
    return "bg-slate-300";
  };

  const handleMilestoneSubmit = async (form: Record<string, unknown>) => {
    if (!auth || !ws.project) return;
    try {
      if (milestoneModal.edit) {
        await api.updateMilestone(auth.token, milestoneModal.edit.id, form);
        addToast("Milestone updated");
      } else {
        await api.createMilestone(auth.token, form);
        addToast("Milestone created");
      }
      setMilestoneModal({ open: false });
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to save milestone", "error");
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!auth) return;
    try {
      await api.completeMilestone(auth.token, milestoneId);
      addToast("Milestone completed");
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to complete milestone", "error");
    }
  };

  const handleMilestoneStatus = async (milestoneId: string, status: string) => {
    if (!auth) return;
    try {
      await api.setMilestoneStatus(auth.token, milestoneId, status);
      addToast(`Milestone status updated to ${status}`);
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update status", "error");
    }
  };

  const handleDeleteMilestone = async () => {
    if (!auth || !deleteMilestone) return;
    try {
      await api.deleteMilestone(auth.token, deleteMilestone.id);
      setDeleteMilestone(null);
      if (pickedMilestoneId === deleteMilestone.id) setPickedMilestoneId("");
      addToast("Milestone deleted");
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to delete milestone", "error");
    }
  };

  const handleTaskSubmit = async (form: Record<string, unknown>) => {
    if (!auth || !ws.project) return;
    const taskData = { ...form, projectId: ws.project.id };
    try {
      if (taskModal.edit) {
        await api.updateTask(auth.token, taskModal.edit.id, taskData);
        const assigneeIds = Array.isArray(form.assignedToUserIds)
          ? (form.assignedToUserIds as string[]).filter(Boolean)
          : [];
        if (assigneeIds.length) {
          await api.assignTaskMembers(auth.token, taskModal.edit.id, assigneeIds);
        }
        addToast("Task updated");
      } else {
        await api.createTask(auth.token, taskData);
        addToast("Task created");
      }
      setTaskModal({ open: false });
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to save task", "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!auth || !deleteTask) return;
    try {
      await api.deleteTask(auth.token, deleteTask.id);
      setDeleteTask(null);
      if (selectedTaskId === deleteTask.id) setSelectedTaskId("");
      addToast("Task deleted");
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to delete task", "error");
    }
  };

  if (ws.loading) return <LoadingPage label="Loading milestones..." />;
  if (!ws.project) return <ProjectNotFound />;

  return (
    <div>
      <AnimatedBackground />

      <div className="relative z-10 mb-5">
        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">folder_open</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Project
            </p>
            <h2 className="text-lg font-bold text-slate-800 truncate">{ws.project.name}</h2>
          </div>
        </GlassCard>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
        <MilestonesPanel
          milestones={ws.milestones}
          tasks={ws.tasks}
          users={ws.users}
          project={ws.project}
          selectedMilestoneId={selectedMilestoneId}
          onSelectMilestone={setPickedMilestoneId}
          canManage={canManageMilestones}
          onAdd={() => setMilestoneModal({ open: true })}
          onEdit={(m) => setMilestoneModal({ open: true, edit: m })}
          onDelete={setDeleteMilestone}
          onComplete={handleCompleteMilestone}
          onStatusChange={handleMilestoneStatus}
          onAddTask={(milestoneId) => {
            setTaskModal({ open: true, milestoneId });
          }}
        />

        <div className="space-y-3">
          {selectedMilestone ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tasks for {selectedMilestone.name}
                </span>
                {canManageTasks && (
                  <button
                    type="button"
                    onClick={() =>
                      setTaskModal({ open: true, milestoneId: selectedMilestoneId })
                    }
                    className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    New task
                  </button>
                )}
              </div>

              {milestoneTasks.length === 0 ? (
                <GlassCard className="p-8">
                  <div className="text-center text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-3 block">
                      task_alt
                    </span>
                    <p className="text-sm font-medium text-slate-600">No tasks yet</p>
                    <p className="text-xs mt-1">
                      {canManageTasks
                        ? "Add tasks to this milestone to track its progress."
                        : "Tasks for this milestone will appear here."}
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {milestoneTasks.map((task) => (
                    <TaskSubtaskCard
                      key={task.id}
                      task={task}
                      canEdit={canManageTasks}
                      onViewTask={(t) => setViewTask(t)}
                      onEditTask={(t) => setTaskModal({ open: true, edit: t })}
                      getProgressColor={getProgressColor}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <GlassCard className="p-8">
              <div className="text-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">flag</span>
                <p className="text-sm font-medium text-slate-600">No milestones yet</p>
                    <p className="text-xs mt-1">
                      {canManageMilestones
                        ? "Create your first milestone to start tracking tasks."
                        : "Milestones for this project will appear here."}
                    </p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      <MilestoneFormModal
        open={milestoneModal.open}
        projectId={ws.project.id}
        initialData={milestoneModal.edit}
        onSubmit={handleMilestoneSubmit}
        onClose={() => setMilestoneModal({ open: false })}
      />

      <ConfirmDeleteModal
        open={!!deleteMilestone}
        name={deleteMilestone?.name ?? ""}
        warning={
          deleteMilestone
            ? ws.tasks.filter((t) => t.milestoneId === deleteMilestone.id).length > 0
              ? "This milestone has linked tasks."
              : undefined
            : undefined
        }
        onConfirm={handleDeleteMilestone}
        onClose={() => setDeleteMilestone(null)}
      />

      <TaskFormModal
        open={taskModal.open}
        initialData={taskModal.edit}
        defaultProjectId={ws.project.id}
        defaultMilestoneId={taskModal.milestoneId ?? selectedTask?.milestoneId ?? ""}
        projects={[ws.project]}
        departments={[]}
        milestones={ws.milestones}
        users={ws.users}
        onSubmit={handleTaskSubmit}
        onClose={() => setTaskModal({ open: false })}
      />

      <ConfirmDeleteModal
        open={!!deleteTask}
        name={deleteTask?.title ?? ""}
        onConfirm={handleDeleteTask}
        onClose={() => setDeleteTask(null)}
      />

      <TaskSubtaskDetailsModal
        task={viewTask}
        project={ws.project}
        milestone={
          viewTask
            ? ws.milestones.find((m) => m.id === viewTask.milestoneId) ?? selectedMilestone
            : null
        }
        users={ws.users}
        isAdmin={canManageTasks}
        onClose={() => setViewTask(null)}
        onEdit={(task) => {
          setTaskModal({ open: true, edit: task });
          setViewTask(null);
        }}
        onDelete={(task) => {
          setDeleteTask(task);
          setViewTask(null);
        }}
        onEscalate={() => {
          void ws.refresh();
        }}
        onMessage={() => {}}
      />
    </div>
  );
}
