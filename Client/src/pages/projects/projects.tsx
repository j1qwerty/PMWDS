import { useEffect, useState, useMemo, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, ProjectHealth, User } from "../../types";
import { classNames, formatMoney } from "../../ui";
import { MilestonesTab } from "../shared/MilestonesTab";
import { PageHeader, getDepartmentColor } from "../shared";
import { 
  ProjectsBoard, 
  ProjectDetailPane, 
  CreateProjectModal,
  EditProjectModal,
  DeleteProjectModal 
} from "./components";

export function ProjectsPage() {
  const { auth, hasRole } = useAuth();
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
    departmentId: "",
    projectManagerId: "",
    priority: "Medium",
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  async function loadProjects() {
    if (!auth) return;
    setLoading(true);
    try {
      const [projectData, departmentData, orgData, userData] = await Promise.all([
        api.getProjects(auth.token),
        api.getDepartments(auth.token),
        api.getOrganizations(auth.token),
        hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
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
    if (!auth || !selectedProjectId) return;
    Promise.allSettled([
      api.getMilestonesByProject(auth.token, selectedProjectId),
      api.getProjectInsights(auth.token, selectedProjectId),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")
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
  }, [projects, selectedOrgId, selectedDepartmentId, departments]);

  // Filtered departments based on organization selection
  const filteredDepartments = useMemo(() => {
    if (!selectedOrgId) return departments;
    return departments.filter(d => d.organizationId === selectedOrgId);
  }, [departments, selectedOrgId]);

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

  if (loading) {
    return (
      <div className="min-h-screen p-7 relative">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm font-medium">Loading projects...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 flex flex-col gap-5 min-h-screen">
      {/* Page Header */}
      <PageHeader
        title="Projects"
        description="Manage and track projects across departments"
        action={{
          label: "Create New Project",
          onClick: () => setShowCreateModal(true),
          icon: "add_circle",
        }}
      />

      {/* Organization Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 items-center">
        {/* All Organizations Tab */}
        <button
          onClick={() => {
            setSelectedOrgId("");
            setSelectedDepartmentId("");
          }}
          className={`
            px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2
            ${!selectedOrgId
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
              : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-200 hover:text-emerald-600"
            }
          `}
        >
          <span className="material-symbols-outlined text-lg">grid_view</span>
          All Organizations
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            !selectedOrgId ? "bg-emerald-500 text-emerald-100" : "bg-slate-100 text-slate-400"
          }`}>
            {projects.length}
          </span>
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-slate-200 self-center mx-1"></div>

        {/* Organization Tabs */}
        {organizations.map((org, index) => {
          const orgDeptIds = departments
            .filter(d => d.organizationId === org.id)
            .map(d => d.id);
          const orgProjectCount = projects.filter(p => orgDeptIds.includes(p.departmentId)).length;
          
          return (
            <button
              key={org.id}
              onClick={() => {
                setSelectedOrgId(org.id);
                setSelectedDepartmentId("");
              }}
              className={`
                px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2
                ${selectedOrgId === org.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
                }
              `}
            >
              <span className="material-symbols-outlined text-lg">business</span>
              {org.name}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                selectedOrgId === org.id ? "bg-indigo-500 text-indigo-100" : "bg-slate-100 text-slate-400"
              }`}>
                {orgProjectCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Department Cards Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-indigo-500">account_tree</span>
            Departments
          </h3>
          {(selectedDepartmentId || selectedOrgId) && (
            <button
              onClick={() => {
                setSelectedDepartmentId("");
                setSelectedOrgId("");
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* All Departments Button */}
          <button
            onClick={() => setSelectedDepartmentId("")}
            className={`
              shrink-0 p-4 rounded-xl border transition-all duration-200 min-w-[180px]
              ${!selectedDepartmentId
                ? "border-indigo-300 bg-indigo-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm"
              }
            `}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`material-symbols-outlined text-xl ${!selectedDepartmentId ? "text-indigo-600" : "text-slate-400"}`}>
                layers
              </span>
              <span className={`text-sm font-bold ${!selectedDepartmentId ? "text-indigo-700" : "text-slate-700"}`}>
                All Departments
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${!selectedDepartmentId ? "text-indigo-700" : "text-slate-700"}`}>
                {filteredProjects.length}
              </span>
              <span className="text-[11px] text-slate-400">projects</span>
            </div>
          </button>

          {/* Department Cards */}
          {filteredDepartments.map((dept, index) => {
            const deptProjects = filteredProjects.filter(p => p.departmentId === dept.id);
            const colors = getDepartmentColor(index);
            const isSelected = selectedDepartmentId === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartmentId(isSelected ? "" : dept.id)}
                className={`
                  shrink-0 p-4 rounded-xl border-2 transition-all duration-200 min-w-[180px]
                  ${isSelected
                    ? `${colors.border} ${colors.bg} shadow-md`
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-bold ${isSelected ? colors.text : 'text-slate-700'}`}>
                    {dept.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${isSelected ? colors.text : 'text-slate-700'}`}>
                    {deptProjects.length}
                  </span>
                  <span className="text-[11px] text-slate-400">projects</span>
                </div>
                {/* Mini progress indicator */}
                <div className="mt-3 w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${colors.dot}`}
                    style={{ width: `${deptProjects.length > 0 ? Math.min((deptProjects.length / projects.length) * 100, 100) : 0}%` }}
                  />
                </div>
              </button>
            );
          })}

          {filteredDepartments.length === 0 && selectedOrgId && (
            <div className="shrink-0 p-4 rounded-xl border border-slate-200 bg-slate-50 min-w-[200px] flex items-center justify-center">
              <span className="text-sm text-slate-400">No departments in this organization</span>
            </div>
          )}
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex-1 flex overflow-hidden gap-5 min-h-[500px]">
        {/* LEFT COLUMN: Projects Board */}
        <ProjectsBoard
          projects={filteredProjects}
          selectedProjectId={selectedProjectId}
          selectedDepartmentId={selectedDepartmentId}
          onSelectProject={setSelectedProjectId}
        />

        {/* RIGHT COLUMN: Project Detail Pane */}
        {selectedProject ? (
          <ProjectDetailPane
            project={selectedProject}
            health={health}
            insights={insights}
            hasRole={hasRole}
            canUpdateProject={() => {}}
            onStatusChange={handleStatusChange}
            onEdit={openEditModal}
            onDelete={() => setShowDeleteConfirm(true)}
            formatMoney={formatMoney}
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
      </div>

      {/* Modals */}
      <CreateProjectModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        form={form}
        setForm={setForm}
        departments={filteredDepartments}
        users={users}
      />

      <EditProjectModal
        show={showEditModal}
        project={selectedProject}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditProject}
        form={form}
        setForm={setForm}
        departments={filteredDepartments}
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