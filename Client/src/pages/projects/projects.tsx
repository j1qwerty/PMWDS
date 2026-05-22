import { useEffect, useState, useMemo, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, ProjectHealth, User } from "../../types";
import { classNames, formatMoney } from "../../ui";
import { MilestonesTab } from "../shared/MilestonesTab";
import { GlassCard, LoadingPage, PageHeader, getDepartmentColor, OrganizationDepartmentFilter, useRoleAccess } from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import {
  ProjectsBoard,
  ProjectDetailPane,
  CreateProjectModal,
  EditProjectModal,
  DeleteProjectModal,
} from "./components";
import { DepartmentCards } from "./components/DepartmentCards";


export function ProjectsPage() {
  const { auth, hasRole } = useAuth();
  const access = useRoleAccess();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
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
    projectManagerId: "",
    priority: "Medium",
  });

  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function loadProjects() {
    if (!auth) return;
    setLoading(true);
    try {
      const [projectData, departmentData, orgData, userData] = await Promise.all([
        api.getProjects(auth.token),
        api.getDepartments(auth.token),
        api.getOrganizations(auth.token),
        api.getUsers(auth.token),
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
  }, [auth]);

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
      access.canManageProjects
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
      filtered = filtered.filter(p => orgDepartmentIds.includes(p.departmentId));
    }

    if (selectedOrgId) {
      const orgDepartmentIds = departments
        .filter(d => d.organizationId === selectedOrgId)
        .map(d => d.id);
      filtered = filtered.filter(p => orgDepartmentIds.includes(p.departmentId));
    }

    if (selectedDepartmentId) {
      filtered = filtered.filter(p => p.departmentId === selectedDepartmentId);
    }

    return filtered;
  }, [projects, selectedOrgId, selectedDepartmentId, departments, shouldFilterByOrg, userOrganizationId]);

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
    await loadProjects();
  }

  async function handleEditProject(event: FormEvent) {
    event.preventDefault();
    if (!auth || !selectedProject) return;
    await api.updateProject(auth.token, selectedProject.id, form);
    setMessage("Project updated.");
    setShowEditModal(false);
    await loadProjects();
  }

  async function handleDeleteProject() {
    if (!auth || !selectedProject) return;
    await api.deleteProject(auth.token, selectedProject.id);
    setMessage("Project deleted.");
    setShowDeleteConfirm(false);
    setSelectedProjectId("");
    await loadProjects();
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
      organizationId: departments.find((department) => department.id === selectedProject.departmentId)?.organizationId || "",
      departmentId: selectedProject.departmentId || "",
      projectManagerId: selectedProject.projectManagerId || "",
      priority: selectedProject.priority || "Medium",
    });
    setShowEditModal(true);
  };

  const handleStatusChange = async (status: string) => {
    if (!auth || !selectedProject) return;
    await api.updateProjectStatus(auth.token, selectedProject.id, status);
    await loadProjects();
  };

  if (loading) return <LoadingPage label="Loading projects..." />;

  return (
    <div className="p-2 flex flex-col gap-5 min-h-screen">
      {/* Page Header */}
      <PageHeader
        title="Projects"
        description="Manage and track projects across departments"
        action={access.canManageProjects ? {
          label: "Create New Project",
          onClick: () => setShowCreateModal(true),
          icon: "add_circle",
        } : undefined}
      />

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
              hasRole={hasRole}
              canUpdateProject={() => { }}
              onStatusChange={handleStatusChange}
              onEdit={access.canManageProjects ? openEditModal : undefined}
              onDelete={access.canManageProjects ? () => setShowDeleteConfirm(true) : undefined}
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


      {/* Modals */}
      <CreateProjectModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        form={form}
        setForm={setForm}
        departments={access.isAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={access.isAdmin}
        users={users}
      />

      <EditProjectModal
        show={showEditModal}
        project={selectedProject}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditProject}
        form={form}
        setForm={setForm}
        departments={access.isAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={access.isAdmin}
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
