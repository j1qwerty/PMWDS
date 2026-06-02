import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Milestone, Task } from "../../types";
import { formatDate } from "../../ui";
import {
  AnimatedBackground,
  GlassCard,
  LoadingPage,
  useNavHeader,
  PERMISSION_GROUPS,
  usePermission,
  useToast,
  getStatusColor,
} from "../shared";
import TaskProgressBoards from "../shared/dash/TaskProgressBoards2";
import { TaskSubtaskDetailsModal, TaskFormModal, ConfirmDeleteModal } from "../projectsK/components";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";

export function ProjectTasksPage() {
  const ws = useProjectWorkspace();
  const { auth } = useAuth();
  const { addToast } = useToast();
  const perm = usePermission();
  const canManageTasks = perm.has(PERMISSION_GROUPS.task.manage);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskModal, setTaskModal] = useState<{ open: boolean; edit?: Task; milestoneId?: string }>({
    open: false,
  });
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    if (!ws.project) {
      setNavHeader({ title: "Tasks", description: "" });
      return;
    }
    const actions = [];
    if (canManageTasks) {
      actions.push({
        label: "New task",
        onClick: () => setTaskModal({ open: true }),
        icon: "add_task",
      });
    }
    setNavHeader({
      title: `Tasks · ${ws.project.name}`,
      description: "Tasks grouped by milestone",
      actions,
    });
  }, [setNavHeader, ws.project, canManageTasks]);

  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    ws.tasks.forEach((t) => {
      const key = t.milestoneId ?? "__unassigned__";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [ws.tasks]);

  const orderedMilestones = useMemo(() => {
    return [...ws.milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [ws.milestones]);

  const selectedTask = ws.tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedMilestone = selectedTask
    ? ws.milestones.find((m) => m.id === selectedTask.milestoneId) ?? null
    : null;

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

  if (ws.loading) return <LoadingPage label="Loading project tasks..." />;
  if (!ws.project) {
    return <ProjectNotFound />;
  }

  const renderMilestoneBoard = (milestone: Milestone | null) => {
    const milestoneId = milestone?.id ?? "__unassigned__";
    const tasks = groupedTasks.get(milestoneId) ?? [];
    return (
      <TaskProgressBoards
        key={milestoneId}
        tasks={tasks}
        canEdit={canManageTasks}
        onViewTask={(t) => setViewTask(t)}
        onEditTask={(t) => setTaskModal({ open: true, edit: t })}
      />
    );
  };

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
            {ws.project.description && (
              <p className="text-xs text-slate-500 line-clamp-1">{ws.project.description}</p>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                getStatusColor(ws.project.status).bg
              } ${getStatusColor(ws.project.status).text}`}
            >
              {ws.project.status}
            </span>
            <span className="text-[10px] text-slate-400">
              {ws.project.totalTasks} tasks · {ws.project.completedTasks} done
            </span>
          </div>
        </GlassCard>
      </div>

      <div className="relative z-10 space-y-6">
        {orderedMilestones.map((milestone) => {
          const tasks = groupedTasks.get(milestone.id) ?? [];
          if (tasks.length === 0) return null;
          const colors = getStatusColor(milestone.status);
          return (
            <section key={milestone.id}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    milestone.isCritical ? "bg-red-100" : "bg-indigo-100"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      milestone.isCritical ? "text-red-500" : "text-indigo-600"
                    }`}
                  >
                    {milestone.status === "Completed" ? "check_circle" : "flag"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    {milestone.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${colors.bg} ${colors.text}`}>
                      {milestone.status}
                    </span>
                    {milestone.dueDate && <span>Due {formatDate(milestone.dueDate)}</span>}
                    <span>· {tasks.length} tasks</span>
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`${colors.dot} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${milestone.progressPercentage || 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-slate-400 mt-0.5">
                    {Math.round(milestone.progressPercentage || 0)}%
                  </p>
                </div>
              </div>
              {renderMilestoneBoard(milestone)}
            </section>
          );
        })}

        {groupedTasks.get("__unassigned__")?.length ? (
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-slate-400">
                  inventory_2
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800">Unassigned</h3>
                <p className="text-[10px] text-slate-500">
                  Tasks without a milestone · {groupedTasks.get("__unassigned__")!.length}
                </p>
              </div>
            </div>
            {renderMilestoneBoard(null)}
          </section>
        ) : null}

        {ws.tasks.length === 0 && (
          <GlassCard className="p-8">
            <div className="text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">
                task_alt
              </span>
              <p className="text-sm font-medium text-slate-600">No tasks yet</p>
              <p className="text-xs mt-1">
                {canManageTasks
                  ? "Click 'New task' above to create the first one."
                  : "Tasks for this project will appear here."}
              </p>
            </div>
          </GlassCard>
        )}
      </div>

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
    </div>
  );
}
