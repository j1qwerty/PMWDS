import { useEffect, useState, useMemo, type FormEvent } from "react";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, ProjectHealth, User } from "../../types";
import { classNames, formatMoney } from "../../ui";
import { MilestonesTab } from "../shared/MilestonesTab";
import { GlassCard, LoadingPage, useNavHeader, OrganizationDepartmentFilter, PERMISSION_GROUPS, usePermission, getProjectDepartmentIds, projectBelongsToAnyDepartment, projectBelongsToDepartment } from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import TaskStats from "../shared/dash/TaskStats";
import {
  ProjectsBoard,
  ProjectsBoardK,
  ProjectDetailPane,
  CreateProjectModal,
  EditProjectModal,
  DeleteProjectModal,
} from "./components";
import { DepartmentCards } from "./components/DepartmentCards";


export function ProjectsPage() {
  const { auth } = useAuth();
  const { data, loading: appDataLoading, refresh: refreshAppData } = useAppData();
  const perm = usePermission();
  const canManageProjects = perm.has(PERMISSION_GROUPS.project.manage);
  const isSuperAdmin = perm.isSuperAdmin;
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesCountByProject, setMilestonesCountByProject] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [_message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    projectCode: "",
    name: "",
    description: "",
    category: "Monitoring",
    plannedStartDate: "",
    plannedEndDate: "",
    plannedBudget: 25000,
    organizationId: "",
    departmentId: "",
    departmentIds: [] as string[],
    projectManagerId: "",
    priority: "Medium",
  });

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "Projects",
      description: "Manage and track projects across departments",
      action: canManageProjects ? {
        label: "New Project",
        onClick: () => setShowCreateModal(true),
        icon: "add_circle",
      } : undefined,
    });
  }, [setNavHeader, canManageProjects]);

  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function loadProjects() {
    if (!auth) return;
    setLoading(true);
    try {
      const [projectData, departmentData, orgData, userData] = await Promise.all([
        Promise.resolve(data.projects),
        Promise.resolve(data.departments),
        Promise.resolve(data.organizations),
        Promise.resolve(data.users),
      ]);
      setProjects(projectData);
      setDepartments(departmentData);
      setOrganizations(orgData);
      setUsers(userData as User[]);
      if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [auth, data]);

  useEffect(() => {
    if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
      setSelectedOrgId(userOrganizationId);
    }
  }, [shouldFilterByOrg, userOrganizationId]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    Promise.allSettled([
      api.getMilestonesByProject(auth.token, selectedProjectId),
      api.getProjectInsights(auth.token, selectedProjectId),
      canManageProjects
        ? api.getProjectHealth(auth.token, selectedProjectId)
        : Promise.resolve(null),
    ]).then(([milestoneResult, insightResult, healthResult]) => {
      if (milestoneResult.status === "fulfilled") setMilestones(milestoneResult.value);
      if (insightResult.status === "fulfilled") setInsights(insightResult.value);
      if (healthResult.status === "fulfilled") setHealth(healthResult.value as ProjectHealth | null);
    });
  }, [auth, selectedProjectId]);

  // Filtered projects based on org and department selection
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (shouldFilterByOrg && userOrganizationId) {
      const orgDepartmentIds = departments
        .filter(d => d.organizationId === userOrganizationId)
        .map(d => d.id);
      filtered = filtered.filter(p => projectBelongsToAnyDepartment(p, orgDepartmentIds));
    }

    if (selectedOrgId) {
      const orgDepartmentIds = departments
        .filter(d => d.organizationId === selectedOrgId)
        .map(d => d.id);
      filtered = filtered.filter(p => projectBelongsToAnyDepartment(p, orgDepartmentIds));
    }

    if (selectedDepartmentId) {
      filtered = filtered.filter(p => projectBelongsToDepartment(p, selectedDepartmentId));
    }

    return filtered;
  }, [projects, selectedOrgId, selectedDepartmentId, departments, shouldFilterByOrg, userOrganizationId]);

  useEffect(() => {
    if (!auth || filteredProjects.length === 0) {
      setMilestonesCountByProject({});
      return;
    }
    const controller = new AbortController();
    (async () => {
      const counts: Record<string, number> = {};
      const results = await Promise.allSettled(
        filteredProjects.map(p =>
          api.getMilestonesByProject(auth.token, p.id).then(ms => ({ id: p.id, count: ms.length }))
        )
      );
      for (const r of results) {
        if (r.status === "fulfilled") counts[r.value.id] = r.value.count;
      }
      if (!controller.signal.aborted) setMilestonesCountByProject(counts);
    })();
    return () => controller.abort();
  }, [auth, filteredProjects]);

  // Filtered departments based on organization selection
  const filteredDepartments = useMemo(() => {
    let filtered = departments;
    if (shouldFilterByOrg && userOrganizationId) {
      filtered = filtered.filter(d => d.organizationId === userOrganizationId);
    }
    if (selectedOrgId) {
      filtered = filtered.filter(d => d.organizationId === selectedOrgId);
    }
    return filtered;
  }, [departments, selectedOrgId, shouldFilterByOrg, userOrganizationId]);

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    await api.createProject(auth.token, form);
    setMessage("Project created.");
    setShowCreateModal(false);
    await refreshAppData();
  }

  async function handleEditProject(event: FormEvent) {
    event.preventDefault();
    if (!auth || !selectedProject) return;
    await api.updateProject(auth.token, selectedProject.id, form);
    setMessage("Project updated.");
    setShowEditModal(false);
    await refreshAppData();
  }

  async function handleDeleteProject() {
    if (!auth || !selectedProject) return;
    await api.deleteProject(auth.token, selectedProject.id);
    setMessage("Project deleted.");
    setShowDeleteConfirm(false);
    setSelectedProjectId("");
    await refreshAppData();
  }

  const openEditModal = () => {
    if (!selectedProject) return;
    setForm({
      projectCode: selectedProject.projectCode || "",
      name: selectedProject.name || "",
      description: selectedProject.description || "",
      category: selectedProject.category || "Monitoring",
      plannedStartDate: selectedProject.plannedStartDate ? selectedProject.plannedStartDate.split('T')[0] : "",
      plannedEndDate: selectedProject.plannedEndDate ? selectedProject.plannedEndDate.split('T')[0] : "",
      plannedBudget: selectedProject.plannedBudget || 0,
      organizationId: departments.find((department) => department.id === (selectedProject.departmentId || getProjectDepartmentIds(selectedProject)[0]))?.organizationId || "",
      departmentId: selectedProject.departmentId || "",
      departmentIds: getProjectDepartmentIds(selectedProject),
      projectManagerId: selectedProject.projectManagerId || "",
      priority: selectedProject.priority || "Medium",
    });
    setShowEditModal(true);
  };

  const handleStatusChange = async (status: string) => {
    if (!auth || !selectedProject) return;
    await api.updateProjectStatus(auth.token, selectedProject.id, status);
    await refreshAppData();
  };

  if (loading || appDataLoading) return <LoadingPage label="Loading projects..." />;

  return (
    <div className="flex flex-col gap-5">

      <TaskStats tasks={data.tasks} />

      <OrganizationDepartmentFilter
        organizations={organizations}
        departments={departments}
        users={users}
        selectedOrganizationId={selectedOrgId}
        selectedDepartmentId={selectedDepartmentId}
        onOrganizationChange={setSelectedOrgId}
        onDepartmentChange={setSelectedDepartmentId}
      />

      {/* Department Cards Section */}
      {/* <DepartmentCards
        departments={filteredDepartments}
        projects={projects}
        selectedDepartmentId={selectedDepartmentId}
        selectedOrgId={selectedOrgId}
        onDepartmentSelect={setSelectedDepartmentId}
        onClearFilters={() => {
          setSelectedDepartmentId("");
          setSelectedOrgId("");
        }}
      /> */}

      {/* Dual Pane Layout */}
      <div className="flex-1 flex overflow-hidden gap-5 min-h-[500px]">
        {/* LEFT COLUMN: Projects Board */}
        <ProjectsBoard
          projects={filteredProjects}
          departments={departments}
          organizations={organizations}
          users={users}
          selectedProjectId={selectedProjectId}
          selectedDepartmentId={selectedDepartmentId}
          onSelectProject={setSelectedProjectId}
        />

        {/* RIGHT COLUMN: Project Detail Pane */}
        <GlassCard className="w-2/3">
          {selectedProject ? (
            <ProjectDetailPane
              project={selectedProject}
              health={health}
              insights={insights}
              canUpdateProject={() => { }}
              onStatusChange={handleStatusChange}
              onEdit={canManageProjects ? openEditModal : undefined}
              onDelete={canManageProjects ? () => setShowDeleteConfirm(true) : undefined}
              formatMoney={formatMoney}
              authToken={auth?.token}
              users={users}
            >
              <MilestonesTab
                key={selectedProject.id}
                projectId={selectedProject.id}
                authToken={auth?.token}
              />
            </ProjectDetailPane>

          ) : (
            <div className="flex-1 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-8 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">
                    folder_open
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No project selected</h3>
                <p className="text-sm text-slate-400 ">
                  Choose a project from the board to view details, milestones, and AI insights
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>


      {/* Compact Project Cards Panel */}
      {/* <ProjectsBoardK
        projects={filteredProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onViewProject={(project) => setSelectedProjectId(project.id)}
        milestonesCountByProject={milestonesCountByProject}
      /> */}

      {/* Modals */}
      <CreateProjectModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        form={form}
        setForm={setForm}
        departments={isSuperAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={isSuperAdmin}
        users={users}
      />

      <EditProjectModal
        show={showEditModal}
        project={selectedProject}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditProject}
        form={form}
        setForm={setForm}
        departments={isSuperAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={isSuperAdmin}
        users={users}
      />

      <DeleteProjectModal
        show={showDeleteConfirm}
        project={selectedProject}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
