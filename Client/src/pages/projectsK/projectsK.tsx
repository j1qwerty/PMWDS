import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, Project, ProjectHealth, User } from "../../types";
import {
  AnimatedBackground,
  LoadingPage,
  useNavHeader,
  PERMISSION_GROUPS,
  usePermission,
  useToast,
  getProjectDepartmentIds,
  projectBelongsToAnyDepartment,
  projectBelongsToDepartment,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import { formatMoney } from "../../ui";
import DashboardStats from "../dashboard/dashbaordStats";
import {
  ConfirmDeleteModal,
  ProjectFormModal,
  type ProjectFormState,
  ProjectDetailModal,
  ProjectDetailk,
  ProjectSidebar,
} from "./components";
import { CustomDropdown } from "../shared/customDropdown";

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

export function ProjectsKPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { data, loading: appDataLoading, refresh: refreshAppData } = useAppData();
  const perm = usePermission();
  const canManageProjects = perm.has(PERMISSION_GROUPS.project.manage);
  const isSuperAdmin = perm.isSuperAdmin;
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [viewProject, setViewProject] = useState<Project | null>(null);

  const [loading, setLoading] = useState(true);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);

  const { setNavHeader } = useNavHeader();
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

  useEffect(() => {
    const actions = [];
    if (canManageProjects) {
      actions.push({ label: "New Project", onClick: () => navigate("/new-project"), icon: "add_circle" });
    }
    setNavHeader({
      title: "Project Workspace",
      description: "Manage projects, milestones, and tasks in one place",
      actions,
    });
  }, [setNavHeader, canManageProjects]);

  const loadProjects = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const [projectData, deptData, orgData, userData] = await Promise.all([
        Promise.resolve(data.projects),
        Promise.resolve(data.departments),
        Promise.resolve(data.organizations),
        Promise.resolve(data.users),
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

  const refreshProjectDetails = useCallback(async (projectId: string) => {
    if (!auth || !projectId) return;
    try {
      const [insightResult, healthResult] = await Promise.allSettled([
        api.getProjectInsights(auth.token, projectId),
        api.getProjectHealth(auth.token, projectId),
      ]);
      if (insightResult.status === "fulfilled") setInsights(insightResult.value);
      if (healthResult.status === "fulfilled") setHealth(healthResult.value as ProjectHealth | null);
      const fresh = await api.getProject(auth.token, projectId);
      if (fresh) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? fresh : p)));
      }
    } catch {
      // silent
    }
  }, [auth]);

  useEffect(() => {
    void loadProjects();
  }, [auth, data]);

  useEffect(() => {
    if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
      setSelectedOrgId(userOrganizationId);
    }
  }, [shouldFilterByOrg, userOrganizationId]);

  useEffect(() => {
    if (selectedProjectId) {
      void refreshProjectDetails(selectedProjectId);
    }
  }, [auth, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = departments.filter((d) => d.organizationId === userOrganizationId).map((d) => d.id);
      filtered = filtered.filter((p) => projectBelongsToAnyDepartment(p, orgDeptIds));
    }
    if (selectedOrgId) {
      const orgDeptIds = departments.filter((d) => d.organizationId === selectedOrgId).map((d) => d.id);
      filtered = filtered.filter((p) => projectBelongsToAnyDepartment(p, orgDeptIds));
    }
    if (selectedDeptId) {
      filtered = filtered.filter((p) => projectBelongsToDepartment(p, selectedDeptId));
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
      organizationId: departments.find((d) => d.id === (target.departmentId || getProjectDepartmentIds(target)[0]))?.organizationId || "",
      departmentId: target.departmentId || "",
      departmentIds: getProjectDepartmentIds(target),
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
    await refreshAppData();
  };

  const handleEditProject = async (e: FormEvent) => {
    e.preventDefault();
    const targetId = viewProject?.id ?? selectedProject?.id;
    if (!auth || !targetId) return;
    await api.updateProject(auth.token, targetId, projectForm);
    setEditProjectOpen(false);
    setViewProject(null);
    addToast("Project updated");
    await refreshAppData();
    await refreshProjectDetails(targetId);
  };

  const handleDeleteProject = async () => {
    const target = deleteProjectTarget ?? selectedProject;
    if (!auth || !target) return;
    await api.deleteProject(auth.token, target.id);
    setDeleteProjectOpen(false);
    setViewProject(null);
    if (selectedProjectId === target.id) setSelectedProjectId("");
    addToast("Project deleted");
    await refreshAppData();
  };

  const handleProjectStatus = async (status: string) => {
    const target = viewProject ?? selectedProject;
    if (!auth || !target) return;
    const updated = await api.updateProjectStatus(auth.token, target.id, status);
    addToast("Status updated");
    if (viewProject?.id === target.id) setViewProject(updated);
    await refreshAppData();
  };

  useEffect(() => {
    if (viewProject) {
      const fresh = projects.find((p) => p.id === viewProject.id);
      if (fresh) setViewProject(fresh);
    }
  }, [projects]);

  const visibleOrganizations = useMemo(() => {
    if (shouldFilterByOrg && userOrganizationId) {
      return organizations.filter((org) => org.id === userOrganizationId);
    }
    return organizations;
  }, [organizations, shouldFilterByOrg, userOrganizationId]);

  const orgOptions = useMemo(
    () => [
      { value: "", label: "All Organizations" },
      ...visibleOrganizations.map((o) => ({ value: o.id, label: o.name })),
    ],
    [visibleOrganizations]
  );

  const effectiveOrgId = useMemo(() => {
    if (shouldFilterByOrg && userOrganizationId) return userOrganizationId;
    return selectedOrgId;
  }, [shouldFilterByOrg, userOrganizationId, selectedOrgId]);

  const visibleDepartments = useMemo(() => {
    return departments.filter((dept) => {
      if (effectiveOrgId) return dept.organizationId === effectiveOrgId;
      return true;
    });
  }, [departments, effectiveOrgId]);

  const deptOptions = useMemo(
    () => [
      { value: "", label: "All Departments" },
      ...visibleDepartments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [visibleDepartments]
  );

  if (loading || appDataLoading) return <LoadingPage label="Loading workspace..." />;

  return (
    <div>
      <AnimatedBackground />

      <div className="mb-5">
        <DashboardStats projects={projects} />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-2 min-h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-5 h-full">
          <ProjectSidebar
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onViewProject={setViewProject}
            canEdit={canManageProjects}
            onEditProject={openEditProject}
            onAdd={() => setCreateProjectOpen(true)}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap pb-4">
            {isSuperAdmin && (
              <CustomDropdown
                value={selectedOrgId}
                onChange={(val) => {
                  setSelectedOrgId(val);
                  setSelectedDeptId("");
                  setSelectedProjectId("");
                }}
                options={orgOptions}
                placeholder="All Organizations"
              />
            )}
            <CustomDropdown
              value={selectedDeptId}
              onChange={(val) => {
                setSelectedDeptId(val);
                setSelectedProjectId("");
              }}
              options={deptOptions}
              placeholder="All Departments"
            />
            {selectedProject && canManageProjects && (
              <button
                onClick={() => {
                  setDeleteProjectTarget(selectedProject);
                  setDeleteProjectOpen(true);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                title="Delete project"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {selectedProject ? (
            <ProjectDetailk
              project={selectedProject}
              health={health}
              insights={insights}
              canManageProjects={canManageProjects}
              onStatusChange={handleProjectStatus}
              onEdit={canManageProjects ? openEditProject : undefined}
              onDelete={canManageProjects ? () => {
                setDeleteProjectTarget(selectedProject);
                setDeleteProjectOpen(true);
              } : undefined}
              formatMoney={formatMoney}
              authToken={auth?.token}
              users={users}
            />
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
        departments={isSuperAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={isSuperAdmin}
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
        departments={isSuperAdmin ? departments : filteredDepartments}
        organizations={organizations}
        showOrganizationFilter={isSuperAdmin}
        users={users}
        onSubmit={handleEditProject}
        onClose={() => setEditProjectOpen(false)}
      />

      <ProjectDetailModal
        project={viewProject}
        canManage={canManageProjects}
        onClose={() => setViewProject(null)}
        authToken={auth?.token}
        onEdit={
          canManageProjects && viewProject
            ? () => {
              openEditProject(viewProject);
              setViewProject(null);
            }
            : undefined
        }
        onDelete={
          canManageProjects && viewProject
            ? () => {
              setDeleteProjectTarget(viewProject);
              setDeleteProjectOpen(true);
            }
            : undefined
        }
        onStatusChange={canManageProjects ? handleProjectStatus : undefined}
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
    </div>
  );
}
