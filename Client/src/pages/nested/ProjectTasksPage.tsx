import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Milestone, Task } from "../../types";
import { formatDate } from "../../ui";
import { HiOutlineFlag, HiOutlineClipboardList } from "react-icons/hi";
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
import TaskBoard, { allBoards } from "../shared/dash/TaskBoard";
import { TaskSubtaskDetailsModal, TaskFormModal, ConfirmDeleteModal } from "../projectsK/components";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";

export function ProjectTasksPage() {
  const ws = useProjectWorkspace();
  const { auth } = useAuth();
  const { addToast } = useToast();
  const perm = usePermission();
  const canManageTasks = perm.has(PERMISSION_GROUPS.task.manage);
  const canManageProjects = perm.has(PERMISSION_GROUPS.project.manage);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskModal, setTaskModal] = useState<{ open: boolean; edit?: Task; milestoneId?: string }>({
    open: false,
  });
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);

  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [visibleBoards, setVisibleBoards] = useState<Record<string, boolean>>({
    "Not Started": true,
    "In Progress": true,
    Completed: true,
    Delayed: true,
    "On Hold": true,
    Cancelled: true,
  });
  const boardSettingsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boardSettingsRef.current && !boardSettingsRef.current.contains(event.target as Node)) {
        setShowBoardSettings(false);
      }
    };
    if (showBoardSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBoardSettings]);

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

  const toggleBoard = (boardTitle: string) => {
    setVisibleBoards((prev) => ({
      ...prev,
      [boardTitle]: !prev[boardTitle],
    }));
  };

  const renderMilestoneBoard = (milestone: Milestone | null) => {
    const milestoneId = milestone?.id ?? "__unassigned__";
    const tasks = groupedTasks.get(milestoneId) ?? [];
    return (
      <TaskBoard
        key={milestoneId}
        tasks={tasks}
        canEdit={canManageTasks}
        onViewTask={(t) => setViewTask(t)}
        onEditTask={(t) => setTaskModal({ open: true, edit: t })}
        visibleBoards={visibleBoards}
      />
    );
  };

  return (
    <div>
      <AnimatedBackground />

      <div className="relative z-10 mb-5">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">folder_open</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 truncate">{ws.project.name}</h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    getStatusColor(ws.project.status).bg
                  } ${getStatusColor(ws.project.status).text}`}
                >
                  {ws.project.status}
                </span>
              </div>
              {ws.project.description && (
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ws.project.description}</p>
              )}
            </div>

       

            <div className="flex items-center gap-1.5 text-slate-500">
              <HiOutlineClipboardList className="size-4" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 leading-none">{ws.project.totalTasks}</span>
                {/* <span className="text-[9px] text-slate-400 leading-tight">tasks</span> */}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <HiOutlineFlag className="size-4" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 leading-none">{ws.milestones.length}</span>
                {/* <span className="text-[9px] text-slate-400 leading-tight">milestones</span> */}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                title="View project"
                className="p-1.5 text-slate-400 hover:text-cyan-500 transition-colors rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              {canManageProjects && (
                <button
                  title="Edit project"
                  className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
                 <div className="size-11 relative flex items-center justify-center flex-shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <circle className="stroke-slate-200" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
                <circle
                  className="stroke-indigo-500 transition-all duration-700"
                  cx="18" cy="18" fill="none" r="16"
                  strokeDasharray="100"
                  strokeDashoffset={100 - Math.min(Math.round(ws.project.progressPercentage || 0), 100)}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute text-[9px] font-bold text-slate-600">
                {Math.min(Math.round(ws.project.progressPercentage || 0), 100)}%
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Global Board Settings */}
      <div className="relative z-20 flex items-center justify-end mb-2">
        <div className="relative" ref={boardSettingsRef}>
          <button
            onClick={() => setShowBoardSettings(!showBoardSettings)}
            className={`p-2 rounded-xl transition-all duration-200 ${
              showBoardSettings
                ? "bg-cyan-50 text-cyan-600"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="Board Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {showBoardSettings && (
            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                Visible Boards
              </h4>
              <div className="space-y-1">
                {allBoards.map((board) => (
                  <button
                    key={board.title}
                    onClick={() => toggleBoard(board.title)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                      visibleBoards[board.title]
                        ? "bg-slate-50 hover:bg-slate-100"
                        : "opacity-50 hover:opacity-75 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={board.headerText}>{board.icon}</span>
                      <span
                        className={`text-xs font-medium ${
                          visibleBoards[board.title] ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {board.title}
                      </span>
                    </div>
                    <div
                      className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                        visibleBoards[board.title] ? "bg-cyan-500" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${
                          visibleBoards[board.title] ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        {orderedMilestones.map((milestone) => {
          const tasks = groupedTasks.get(milestone.id) ?? [];
          if (tasks.length === 0) return null;
          const colors = getStatusColor(milestone.status);
          return (
            <section key={milestone.id}>
              <div className="flex items-center gap-3 mb-3 ">
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
