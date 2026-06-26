import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { Milestone, Project, Task } from "../../types";
import { classNames, formatDate } from "../../ui";
import {
  AnimatedBackground,
  GlassCard,
  LoadingPage,
  useNavHeader,
  PERMISSION_GROUPS,
  usePermission,
  useToast,
  getStatusColor,
  GradientButton,
  BgRenderer,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import {
  MilestonesPanel,
  MilestoneDetailModal,
  ProjectDetailModal,
  ProjectFormModal,
  type ProjectFormState,
  TaskSubtaskCard,
  TaskSubtaskDetailsModal,
  TaskFormModal,
  MilestoneFormModal,
  ConfirmDeleteModal,
} from "../projectsK/components";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";
import { ProjectInfoCard } from "./ProjectInfoCard";
import { TaskSubCard } from "../projectsK/components/Tasksubcard";

const emptyProjectForm = (): ProjectFormState => ({
  projectCode: "",
  name: "",
  description: "",
  category: "Monitoring",
  plannedStartDate: new Date().toISOString().split("T")[0],
  plannedEndDate: "",
  plannedBudget: 25000,
  organizationId: "",
  departmentId: "",
  departmentIds: [],
  projectManagerId: "",
  priority: "Medium",
});

export function ProjectMilestonesPage() {
  const ws = useProjectWorkspace();
  const { data: appData } = useAppData();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { addToast } = useToast();
  const perm = usePermission();
  const { userOrganizationId } = useUserOrganization(appData.users, appData.departments);
  const canManageMilestones = perm.isSuperAdmin || perm.roles.includes("Director");
  const canManageTasks = perm.has(PERMISSION_GROUPS.task.manage);
  const canManageProjects = perm.has(PERMISSION_GROUPS.project.manage);

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
  const [viewMilestone, setViewMilestone] = useState<Milestone | null>(null);
  const [viewProject, setViewProject] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());
  const [milestoneError, setMilestoneError] = useState("");
  const [pendingForceComplete, setPendingForceComplete] = useState<{
    milestoneId: string;
    status?: string;
    incompleteCount: number;
    totalCount: number;
  } | null>(null);

  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);

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
        onClick: () => { setMilestoneModal({ open: true }); setMilestoneError(""); },
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
    return ws.tasks.filter((t) => t.milestoneId === selectedMilestoneId && !t.parentTaskId);
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
    setMilestoneError("");
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
      setMilestoneError(e instanceof Error ? e.message : "Failed to save milestone");
    }
  };

  const getIncompleteTaskCount = (milestoneId: string) => {
    const milestoneTasks = ws.tasks.filter(t => t.milestoneId === milestoneId);
    const incomplete = milestoneTasks.filter(t => t.status !== "Completed").length;
    return { incomplete, total: milestoneTasks.length };
  };

  const handleForceCompleteConfirm = async () => {
    if (!auth || !pendingForceComplete) return;
    const { milestoneId, status } = pendingForceComplete;
    setPendingForceComplete(null);
    try {
      if (status && status !== "Completed") {
        await api.setMilestoneStatus(auth.token, milestoneId, status, true);
      } else {
        await api.completeMilestone(auth.token, milestoneId, true);
      }
      addToast("All tasks completed and milestone updated");
      await ws.refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to complete milestone", "error");
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!auth) return;
    const { incomplete, total } = getIncompleteTaskCount(milestoneId);
    if (incomplete > 0) {
      setPendingForceComplete({ milestoneId, incompleteCount: incomplete, totalCount: total });
      return;
    }
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
    if (status === "Completed") {
      const { incomplete, total } = getIncompleteTaskCount(milestoneId);
      if (incomplete > 0) {
        setPendingForceComplete({ milestoneId, status, incompleteCount: incomplete, totalCount: total });
        return;
      }
    }
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

  const useContainerWidth = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
      const container = ref.current;
      if (!container) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const containerWidth = entry.contentRect.width;
          const viewportWidth = window.innerWidth;
          const widthPercentage = (containerWidth / viewportWidth) * 100;
          setIsNarrow(widthPercentage < 40);
        }
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    return { ref, isNarrow };
  };

  const { ref: tasksContainerRef, isNarrow: isTasksNarrow } = useContainerWidth();

  const handleEditProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !ws.project) return;
    await api.updateProject(auth.token, ws.project.id, projectForm);
    setEditProjectOpen(false);
    addToast("Project updated");
    await ws.refresh();
  };

  const handleDeleteProject = async () => {
    const target = deleteProjectTarget ?? ws.project;
    if (!auth || !target) return;
    await api.deleteProject(auth.token, target.id);
    setDeleteProjectOpen(false);
    setDeleteProjectTarget(null);
    addToast("Project deleted");
    navigate("/projectsK");
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

  const completedMilestones = ws.milestones.filter((m) => m.status === "Completed").length;
  const criticalMilestones = ws.milestones.filter((m) => m.isCritical).length;
  const averageProgress = ws.milestones.length
    ? ws.milestones.reduce((sum, m) => sum + (m.progressPercentage || 0), 0) / ws.milestones.length
    : 0;

  return (
    <div>
      {/* <AnimatedBackground /> */}
     

      {pendingForceComplete && (
        <div className="relative z-10 mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0">warning</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Incomplete tasks detected</p>
              <p className="text-xs text-amber-700 mt-1">
                <strong>{pendingForceComplete.incompleteCount}</strong> of <strong>{pendingForceComplete.totalCount}</strong> task(s) in this milestone are not completed.
                Continuing will mark all tasks and subtasks as completed at 100% progress.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleForceCompleteConfirm}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                  Yes, complete all
                </button>
                <button
                  onClick={() => setPendingForceComplete(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mb-5">
        <ProjectInfoCard
          project={ws.project}
          milestonesCount={ws.milestones.length}
          canManageProjects={canManageProjects}
          users={ws.users}
          onViewProject={() => setViewProject(true)}
          onEditProject={() => {
            if (!ws.project) return;
            setProjectForm({
              projectCode: ws.project.projectCode ?? "",
              name: ws.project.name,
              description: ws.project.description ?? "",
              category: ws.project.category ?? "Monitoring",
              plannedStartDate: ws.project.plannedStartDate?.split("T")[0] ?? "",
              plannedEndDate: ws.project.plannedEndDate?.split("T")[0] ?? "",
              plannedBudget: ws.project.plannedBudget ?? 0,
              organizationId: "",
              departmentId: ws.project.departmentId ?? "",
              departmentIds: ws.project.departmentIds ?? [],
              projectManagerId: ws.project.projectManagerId ?? "",
              priority: ws.project.priority ?? "Medium",
            });
            setEditProjectOpen(true);
          }}
          onDeleteProject={(project) => {
            setDeleteProjectTarget(project);
            setDeleteProjectOpen(true);
          }}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: Milestone list */}
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
          hideDetailPanel
          onViewDetail={setViewMilestone}
        />


        {/* Center: Tasks */}
        <div ref={tasksContainerRef} className="space-y-3 min-w-0">
          {selectedMilestone && canManageTasks && milestoneTasks.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tasks for {selectedMilestone.name}
              </span>
              <button
                type="button"
                onClick={() => setTaskModal({ open: true, milestoneId: selectedMilestoneId })}
                className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"
              >
                <span className="material-symbols-outlined text-base">add</span>
                New task
              </button>
            </div>
          )}

          {selectedMilestone && milestoneTasks.length === 0 ? (
            <GlassCard className="p-8">
              <div className="text-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">task_alt</span>
                <p className="text-sm font-medium text-slate-600">No tasks yet</p>
                <p className="text-xs mt-1">
                  {canManageTasks
                    ? "Add tasks to this milestone to track its progress."
                    : "Tasks for this milestone will appear here."}
                </p>
                {canManageTasks && (
                  <button
                    type="button"
                    onClick={() => setTaskModal({ open: true, milestoneId: selectedMilestoneId })}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    Create first task
                  </button>
                )}
              </div>
            </GlassCard>
          ) : selectedMilestone ? (
            <div className={classNames(
              "grid gap-3",
              isTasksNarrow ? "grid-cols-1" : "grid-cols-2"
            )}>
              {milestoneTasks.map((task) => (
                <TaskSubCard
                  key={task.id}
                  task={task}
                  canEdit={canManageTasks}
                  onViewTask={(t) => setViewTask(t)}
                  onEditTask={(t) => setTaskModal({ open: true, edit: t })}
                  getProgressColor={getProgressColor}
                  onRefresh={() => ws.refresh()}
                  users={ws.users}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">task_alt</span>
                <p className="text-sm font-medium text-slate-600">Select a milestone</p>
                <p className="text-xs mt-1">Tasks will appear here once a milestone is selected.</p>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right: Milestone details */}
        {/* <div className="min-w-0">
          {selectedMilestone ? (
            <div className="sticky top-4">
              <MilestoneHeader
                milestone={selectedMilestone}
                tasks={milestoneTasks}
                isAdmin={canManageMilestones}
                onComplete={() => handleCompleteMilestone(selectedMilestone.id)}
                onStatusChange={(status) => handleMilestoneStatus(selectedMilestone.id, status)}
                onEdit={() => setMilestoneModal({ open: true, edit: selectedMilestone })}
                onDelete={() => setDeleteMilestone(selectedMilestone)}
                onAddTask={() => setTaskModal({ open: true, milestoneId: selectedMilestone.id })}
                onViewMilestone={setViewMilestone}
              />
            </div>
          ) : (
            <GlassCard className="p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-400">flag</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Select a Milestone</h3>
              <p className="text-xs text-slate-400 text-center">
                Choose from the left panel to see details
              </p>
            </GlassCard>
          )}
        </div> */}
      </div>

      <MilestoneFormModal
        open={milestoneModal.open}
        projectId={ws.project.id}
        initialData={milestoneModal.edit}
        departments={appData.departments}
        organizations={appData.organizations}
        isSuperAdmin={perm.isSuperAdmin}
        userOrganizationId={userOrganizationId}
        onSubmit={handleMilestoneSubmit}
        onClose={() => { setMilestoneModal({ open: false }); setMilestoneError(""); }}
        serverError={milestoneError}
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
        departments={appData.departments}
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

      <MilestoneDetailModal
        open={!!viewMilestone}
        milestone={viewMilestone}
        tasks={ws.tasks}
        project={ws.project}
        users={ws.users}
        isAdmin={canManageMilestones}
        onClose={() => setViewMilestone(null)}
        onComplete={() => {
          if (viewMilestone) handleCompleteMilestone(viewMilestone.id);
          setViewMilestone(null);
        }}
        onStatusChange={(status) => {
          if (viewMilestone) handleMilestoneStatus(viewMilestone.id, status);
        }}
        onEdit={() => {
          if (viewMilestone) setMilestoneModal({ open: true, edit: viewMilestone });
          setViewMilestone(null);
        }}
        onDelete={() => {
          if (viewMilestone) setDeleteMilestone(viewMilestone);
          setViewMilestone(null);
        }}
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
        onMessage={() => { }}
      />

      <ProjectDetailModal
        project={viewProject ? ws.project : null}
        canManage={canManageProjects}
        authToken={auth?.token}
        users={ws.users}
        milestones={ws.milestones}
        onClose={() => setViewProject(false)}
        onEdit={() => navigate("/projectsK")}
        onStatusChange={() => { ws.refresh(); }}
      />

      <ProjectFormModal
        open={editProjectOpen}
        title="Edit Project"
        submitLabel="Save"
        form={projectForm}
        setForm={setProjectForm}
        departments={appData.departments}
        organizations={appData.organizations}
        users={appData.users}
        onSubmit={handleEditProject}
        onClose={() => setEditProjectOpen(false)}
      />

      <ConfirmDeleteModal
        open={deleteProjectOpen}
        name={deleteProjectTarget?.name ?? ws.project?.name ?? "this project"}
        warning="All milestones and tasks under this project may be affected."
        onConfirm={handleDeleteProject}
        onClose={() => {
          setDeleteProjectOpen(false);
          setDeleteProjectTarget(null);
        }}
      />
    </div>
  );
}

function MilestoneHeader({
  milestone,
  tasks,
  isAdmin,
  onComplete,
  onStatusChange,
  onEdit,
  onDelete,
  onAddTask,
  onViewMilestone,
}: {
  milestone: Milestone;
  tasks: Task[];
  isAdmin: boolean;
  onComplete: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
  onViewMilestone?: (milestone: Milestone) => void;
}) {
  const statusColors = getStatusColor(milestone.status);
  const progress = milestone.progressPercentage || 0;
  const hasTasks = milestone.hasTasks ?? tasks.length > 0;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const isCompleted = milestone.status === "Completed";

  const getProgressColor = (p: number): string => {
    if (p === 100) return "bg-emerald-500";
    if (p >= 75) return "bg-amber-400";
    if (p >= 50) return "bg-cyan-400";
    if (p >= 25) return "bg-rose-400";
    return "bg-slate-300";
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${milestone.isCritical ? "bg-red-500 shadow-red-500/25" : "bg-indigo-600 shadow-indigo-500/25"
              }`}
          >
            <span className="material-symbols-outlined text-xl text-white">
              {milestone.status === "Completed" ? "check_circle" : "flag"}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{milestone.name}</h3>
            {milestone.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{milestone.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onViewMilestone && (
            <button
              title="View milestone"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 transition-colors"
              onClick={() => onViewMilestone?.(milestone)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
              title="Edit milestone"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors.bg} ${statusColors.text}`}>
          {milestone.status}
        </span>
        {milestone.isCritical && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-50 text-red-600">Critical</span>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
          <span>{milestone.dueDate ? formatDate(milestone.dueDate) : "No due date"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="material-symbols-outlined text-sm text-slate-400">task_alt</span>
          <span>{completedTasks}/{tasks.length} completed</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-slate-400 font-medium">
            Progress
            {hasTasks && <span className="ml-1 text-indigo-500 font-normal">(avg of tasks)</span>}
          </span>
          <span className="font-semibold text-slate-700">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="flex flex-wrap gap-1">
            {["Pending", "InProgress", "Completed", "Delayed"].map((status) => {
              const st = getStatusColor(status);
              return (
                <button
                  key={status}
                  type="button"
                  disabled={milestone.status === status}
                  onClick={() => (status === "Completed" ? onComplete() : onStatusChange(status))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${milestone.status === status
                      ? `${st.bg} ${st.text} cursor-default`
                      : "border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 text-center ${colors.border} ${colors.bg}`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
    </div>
  );
}
