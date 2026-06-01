import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, Task, User } from "../../types";
import {
  AnimatedBackground,
  LoadingPage,
  useNavHeader,
  useRoleAccess,
  useToast,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import {
  ConfirmDeleteModal,
  MilestoneFormModal,
  MilestonesPanel,
  ProjectFormModal,
  type ProjectFormState,
  ProjectDetailModal,
  ProjectSidebar,
  TaskDetailModal,
  TaskFormModal,
  TasksKanbanBoard,
  ViewTabs,
  type WorkspaceView,
  WorkspaceStats,
} from "./components";
import { KanbanFilters } from "./components/KanbanFilters";
import { allBoards } from "./components/TasksKanbanBoard";

const emptyProjectForm = (): ProjectFormState => ({
  projectCode: "",
  name: "",
  description: "",
  category: "Monitoring",
  plannedStartDate: "",
  plannedEndDate: "",
  plannedBudget: 25000,
  organizationId: "",
  departmentId: "",
  projectManagerId: "",
  priority: "Medium",
});

export function ProjectsKPage() {
  const { auth } = useAuth();
  const access = useRoleAccess();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activeView, setActiveView] = useState<WorkspaceView>("tasks");
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleBoards, setVisibleBoards] = useState<Record<string, boolean>>(
    Object.fromEntries(allBoards.map((b) => [b.title, true]))
  );
  const [showFilters, setShowFilters] = useState(true);
  const [resetMilestoneOnTabSwitch, setResetMilestoneOnTabSwitch] = useState(true);

  const [loading, setLoading] = useState(true);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);

  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; edit?: Milestone }>({ open: false });
  const [deleteMilestone, setDeleteMilestone] = useState<Milestone | null>(null);

  const [taskModal, setTaskModal] = useState<{ open: boolean; edit?: Task; milestoneId?: string }>({ open: false });
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { setNavHeader } = useNavHeader();
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  useEffect(() => {
    const actions = [];
    if (access.canManageProjects) {
      actions.push({ label: "New Project", onClick: () => setCreateProjectOpen(true), icon: "add_circle" });
    }
    if (selectedProjectId && access.canManageMilestones) {
      actions.push({ label: "New milestone", onClick: () => setMilestoneModal({ open: true }), icon: "add_circle" });
    }
    if (selectedProjectId && access.canManageTasks) {
      actions.push({ label: "New task", onClick: () => setTaskModal({ open: true, milestoneId: selectedMilestoneId }), icon: "add_circle" });
    }
    setNavHeader({
      title: "Project Workspace",
      description: "Manage projects, milestones, and tasks in one place",
      actions,
    });
  }, [setNavHeader, access.canManageProjects, access.canManageMilestones, access.canManageTasks, selectedProjectId, selectedMilestoneId]);

  const loadProjects = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const [projectData, deptData, orgData, userData] = await Promise.all([
        api.getProjects(auth.token),
        api.getDepartments(auth.token),
        api.getOrganizations(auth.token),
        api.getUsers(auth.token),
      ]);
      setProjects(projectData);
      setDepartments(deptData);
      setOrganizations(orgData);
      setUsers(userData as User[]);
      if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectWorkspace = async (projectId: string) => {
    if (!auth || !projectId) {
      setMilestones([]);
      setTasks([]);
      return;
    }
    const [milestoneData, taskData] = await Promise.all([
      api.getMilestonesByProject(auth.token, projectId),
      api.getTasksByProject(auth.token, projectId),
    ]);
    setMilestones(milestoneData);
    setTasks(taskData);
    if (resetMilestoneOnTabSwitch) {
      setSelectedMilestoneId(activeView === "milestones" ? (milestoneData[0]?.id ?? "") : "");
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [auth]);

  useEffect(() => {
    if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
      setSelectedOrgId(userOrganizationId);
    }
  }, [shouldFilterByOrg, userOrganizationId]);

  useEffect(() => {
    void loadProjectWorkspace(selectedProjectId);
    setSelectedTaskId("");
  }, [auth, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = departments.filter((d) => d.organizationId === userOrganizationId).map((d) => d.id);
      filtered = filtered.filter((p) => orgDeptIds.includes(p.departmentId));
    }
    if (selectedOrgId) {
      const orgDeptIds = departments.filter((d) => d.organizationId === selectedOrgId).map((d) => d.id);
      filtered = filtered.filter((p) => orgDeptIds.includes(p.departmentId));
    }
    if (selectedDeptId) {
      filtered = filtered.filter((p) => p.departmentId === selectedDeptId);
    }
    return filtered;
  }, [projects, selectedOrgId, selectedDeptId, departments, shouldFilterByOrg, userOrganizationId]);

  const filteredDepartments = useMemo(() => {
    let filtered = departments;
    if (shouldFilterByOrg && userOrganizationId) {
      filtered = filtered.filter((d) => d.organizationId === userOrganizationId);
    }
    if (selectedOrgId) filtered = filtered.filter((d) => d.organizationId === selectedOrgId);
    return filtered;
  }, [departments, selectedOrgId, shouldFilterByOrg, userOrganizationId]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].id);
    } else if (selectedProjectId && !filteredProjects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0]?.id ?? "");
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId) ?? null;

  const openEditProject = (project?: Project) => {
    const target = project ?? selectedProject;
    if (!target) return;
    setProjectForm({
      projectCode: target.projectCode || "",
      name: target.name || "",
      description: target.description || "",
      category: target.category || "Monitoring",
      plannedStartDate: target.plannedStartDate?.split("T")[0] || "",
      plannedEndDate: target.plannedEndDate?.split("T")[0] || "",
      plannedBudget: target.plannedBudget || 0,
      organizationId: departments.find((d) => d.id === target.departmentId)?.organizationId || "",
      departmentId: target.departmentId || "",
      projectManagerId: target.projectManagerId || "",
      priority: target.priority || "Medium",
    });
    setEditProjectOpen(true);
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    await api.createProject(auth.token, projectForm);
    setCreateProjectOpen(false);
    setProjectForm(emptyProjectForm());
    addToast("Project created");
    await loadProjects();
  };

  const handleEditProject = async (e: FormEvent) => {
    e.preventDefault();
    const targetId = viewProject?.id ?? selectedProject?.id;
    if (!auth || !targetId) return;
    await api.updateProject(auth.token, targetId, projectForm);
    setEditProjectOpen(false);
    setViewProject(null);
    addToast("Project updated");
    await loadProjects();
    await loadProjectWorkspace(targetId);
  };

  const handleDeleteProject = async () => {
    const target = deleteProjectTarget ?? selectedProject;
    if (!auth || !target) return;
    await api.deleteProject(auth.token, target.id);
    setDeleteProjectOpen(false);
    setViewProject(null);
    if (selectedProjectId === target.id) setSelectedProjectId("");
    addToast("Project deleted");
    await loadProjects();
  };

  const handleProjectStatus = async (status: string) => {
    const target = viewProject ?? selectedProject;
    if (!auth || !target) return;
    const updated = await api.updateProjectStatus(auth.token, target.id, status);
    addToast("Status updated");
    if (viewProject?.id === target.id) setViewProject(updated);
    await loadProjects();
  };

  useEffect(() => {
    if (viewProject) {
      const fresh = projects.find((p) => p.id === viewProject.id);
      if (fresh) setViewProject(fresh);
    }
  }, [projects]);

  const handleMilestoneSubmit = async (form: Record<string, unknown>) => {
    if (!auth || !selectedProjectId) return;
    if (milestoneModal.edit) {
      await api.updateMilestone(auth.token, milestoneModal.edit.id, form);
      addToast("Milestone updated");
    } else {
      await api.createMilestone(auth.token, form);
      addToast("Milestone created");
    }
    setMilestoneModal({ open: false });
    await loadProjectWorkspace(selectedProjectId);
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!auth) return;
    await api.completeMilestone(auth.token, milestoneId);
    addToast("Milestone completed");
    await loadProjectWorkspace(selectedProjectId);
  };

  const handleMilestoneStatus = async (milestoneId: string, status: string) => {
    if (!auth) return;
    await api.setMilestoneStatus(auth.token, milestoneId, status);
    addToast(`Milestone status updated to ${status}`);
    await loadProjectWorkspace(selectedProjectId);
  };

  const handleDeleteMilestone = async () => {
    if (!auth || !deleteMilestone) return;
    await api.deleteMilestone(auth.token, deleteMilestone.id);
    setDeleteMilestone(null);
    if (selectedMilestoneId === deleteMilestone.id) setSelectedMilestoneId("");
    addToast("Milestone deleted");
    await loadProjectWorkspace(selectedProjectId);
  };

  const handleTaskSubmit = async (form: Record<string, unknown>) => {
    if (!auth || !selectedProjectId) return;
    const taskData = { ...form, projectId: selectedProjectId };
    if (taskModal.edit) {
      await api.updateTask(auth.token, taskModal.edit.id, taskData);
      const assigneeIds = Array.isArray(form.assignedToUserIds)
        ? (form.assignedToUserIds as string[]).filter(Boolean)
        : [];
      if (assigneeIds.length) await api.assignTaskMembers(auth.token, taskModal.edit.id, assigneeIds);
      addToast("Task updated");
    } else {
      await api.createTask(auth.token, taskData);
      addToast("Task created");
    }
    setTaskModal({ open: false });
    await loadProjectWorkspace(selectedProjectId);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    if (!auth) return;
    await api.updateTaskStatus(auth.token, taskId, status);
    addToast("Task status updated");
    await loadProjectWorkspace(selectedProjectId);
    if (selectedTaskId === taskId) {
      const updated = await api.getTask(auth.token, taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const handleDeleteTask = async () => {
    if (!auth || !deleteTask) return;
    await api.deleteTask(auth.token, deleteTask.id);
    setDeleteTask(null);
    if (selectedTaskId === deleteTask.id) setSelectedTaskId("");
    addToast("Task deleted");
    await loadProjectWorkspace(selectedProjectId);
  };

  if (loading) return <LoadingPage label="Loading workspace..." />;

  return (
    <div>
      <AnimatedBackground />


      <div className="relative z-10 mb-5">
        <WorkspaceStats
          project={selectedProject}
          projects={filteredProjects}
          milestones={milestones}
          tasks={tasks}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-2">
        <div className="flex flex-col gap-5">
          <ProjectSidebar
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onViewProject={setViewProject}
            canEdit={access.canManageProjects}
            onEditProject={openEditProject}
            onAdd={() => setCreateProjectOpen(true)}
          />
        </div>

        <div className="flex flex-col min-w-0 ">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-2">
            <ViewTabs active={activeView} onChange={setActiveView} />
            <KanbanFilters
              organizations={organizations}
              departments={departments}
              users={users}
              selectedOrganizationId={selectedOrgId}
              selectedDepartmentId={selectedDeptId}
              onOrganizationChange={(orgId) => {
                setSelectedOrgId(orgId);
                setSelectedDeptId("");
                setSelectedProjectId("");
              }}
              onDepartmentChange={(deptId) => {
                setSelectedDeptId(deptId);
                setSelectedProjectId("");
              }}
              milestones={milestones}
              selectedMilestoneId={selectedMilestoneId}
              onMilestoneFilterChange={setSelectedMilestoneId}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              allBoards={allBoards}
              visibleBoards={visibleBoards}
              onToggleBoard={(title) =>
                setVisibleBoards((prev) => ({ ...prev, [title]: !prev[title] }))
              }
              autoHideSet={new Set()}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((p) => !p)}
              resetMilestoneOnTabSwitch={resetMilestoneOnTabSwitch}
              onResetMilestoneToggle={() => setResetMilestoneOnTabSwitch((p) => !p)}
            />
          </div>

          {selectedProject ? (
            <>
              {activeView === "milestones" && (
                <MilestonesPanel
                  milestones={milestones}
                  tasks={tasks}
                  users={users}
                  project={selectedProject}
                  selectedMilestoneId={selectedMilestoneId}
                  onSelectMilestone={setSelectedMilestoneId}
                  canManage={access.canManageMilestones}
                  onAdd={() => setMilestoneModal({ open: true })}
                  onEdit={(m) => setMilestoneModal({ open: true, edit: m })}
                  onDelete={setDeleteMilestone}
                  onComplete={handleCompleteMilestone}
                  onStatusChange={handleMilestoneStatus}
                  onAddTask={(milestoneId) => {
                    setTaskModal({ open: true, milestoneId });
                    setActiveView("tasks");
                  }}
                />
              )}

              {activeView === "tasks" && (
                <TasksKanbanBoard
                  tasks={tasks}
                  milestones={milestones}
                  selectedMilestoneId={selectedMilestoneId}
                  canEdit={access.canManageTasks}
                  onViewTask={(task) => setSelectedTaskId(task.id)}
                  onEditTask={(task) => setTaskModal({ open: true, edit: task })}
                  onStatusChange={handleTaskStatus}
                  searchTerm={searchTerm}
                  visibleBoards={visibleBoards}
                  onToggleBoard={(title) =>
                    setVisibleBoards((prev) => ({ ...prev, [title]: !prev[title] }))
                  }
                />
              )}
            </>


          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white/50">
              <span className="material-symbols-outlined text-5xl mb-3">folder_open</span>
              <p className="text-sm font-medium">Select or create a project</p>
            </div>
          )}


        </div>



      </div>


      <ProjectFormModal
        open={createProjectOpen}
        title="Create Project"
        submitLabel="Create"
        form={projectForm}
        setForm={setProjectForm}
        departments={access.isAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={access.isAdmin}
        users={users}
        onSubmit={handleCreateProject}
        onClose={() => setCreateProjectOpen(false)}
      />

      <ProjectFormModal
        open={editProjectOpen}
        title="Edit Project"
        submitLabel="Save"
        form={projectForm}
        setForm={setProjectForm}
        departments={access.isAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={access.isAdmin}
        users={users}
        onSubmit={handleEditProject}
        onClose={() => setEditProjectOpen(false)}
      />

      <ProjectDetailModal
        project={viewProject}
        canManage={access.canManageProjects}
        onClose={() => setViewProject(null)}
        onEdit={
          access.canManageProjects && viewProject
            ? () => {
              openEditProject(viewProject);
              setViewProject(null);
            }
            : undefined
        }
        onDelete={
          access.canManageProjects && viewProject
            ? () => {
              setDeleteProjectTarget(viewProject);
              setDeleteProjectOpen(true);
            }
            : undefined
        }
        onStatusChange={access.canManageProjects ? handleProjectStatus : undefined}
      />

      <ConfirmDeleteModal
        open={deleteProjectOpen}
        name={deleteProjectTarget?.name ?? selectedProject?.name ?? "this project"}
        warning="All milestones and tasks under this project may be affected."
        onConfirm={handleDeleteProject}
        onClose={() => {
          setDeleteProjectOpen(false);
          setDeleteProjectTarget(null);
        }}
      />

      <MilestoneFormModal
        open={milestoneModal.open}
        projectId={selectedProjectId}
        initialData={milestoneModal.edit}
        onSubmit={handleMilestoneSubmit}
        onClose={() => setMilestoneModal({ open: false })}
      />

      <ConfirmDeleteModal
        open={!!deleteMilestone}
        name={deleteMilestone?.name ?? ""}
        warning={
          deleteMilestone
            ? tasks.filter((t) => t.milestoneId === deleteMilestone.id).length > 0
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
        defaultProjectId={selectedProjectId}
        defaultMilestoneId={taskModal.milestoneId ?? selectedMilestoneId}
        projects={filteredProjects}
        departments={departments}
        milestones={milestones}
        users={users}
        onSubmit={handleTaskSubmit}
        onClose={() => setTaskModal({ open: false })}
      />

      <ConfirmDeleteModal
        open={!!deleteTask}
        name={deleteTask?.title ?? ""}
        onConfirm={handleDeleteTask}
        onClose={() => setDeleteTask(null)}
      />

      <TaskDetailModal
        task={selectedTask}
        milestone={selectedMilestone}
        users={users}
        canManage={access.canManageTasks}
        onEdit={() => selectedTask && setTaskModal({ open: true, edit: selectedTask })}
        onDelete={() => selectedTask && setDeleteTask(selectedTask)}
        onStatusChange={(status) => selectedTask && handleTaskStatus(selectedTask.id, status)}
        onRefresh={() => loadProjectWorkspace(selectedProjectId)}
        onClose={() => setSelectedTaskId("")}
      />
    </div>
  );
}
