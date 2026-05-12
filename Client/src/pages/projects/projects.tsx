import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, Project, ProjectHealth, User } from "../../types";
import { classNames, formatMoney } from "../../ui";
import { MilestonesTab } from "../shared/MilestonesTab";
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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [_message, setMessage] = useState("");
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
    const [projectData, departmentData, userData] = await Promise.all([
      api.getProjects(auth.token),
      api.getDepartments(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
    ]);
    setProjects(projectData);
    setDepartments(departmentData);
    setUsers(userData as User[]);
    if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
  }

  useEffect(() => {
    void loadProjects().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load projects."));
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

  const departmentColors = [
    { bg: "bg-primary/5", border: "border-primary/30", text: "text-primary", dot: "bg-primary" },
    { bg: "bg-secondary/5", border: "border-secondary/30", text: "text-secondary", dot: "bg-secondary" },
    { bg: "bg-tertiary/5", border: "border-tertiary/30", text: "text-tertiary", dot: "bg-tertiary" },
    { bg: "bg-error/5", border: "border-error/30", text: "text-error", dot: "bg-error" },
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  ];

  return (
    <div className="mx-4 my-2 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
        <button
          onClick={() => setShowCreateModal(true)}
          className="group px-5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface hover:border-primary/50 hover:shadow-md transition-all duration-200 text-sm font-medium flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">add_circle</span>
          Create New Project
        </button>
      </div>

      {/* Department Cards Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-h2 text-h2 text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            Departments
          </h2>
          {selectedDepartmentId && (
            <button
              onClick={() => setSelectedDepartmentId("")}
              className="text-xs font-bold text-primary hover:text-primary/70 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Clear Filter
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {/* All Departments Card */}
          <button
            onClick={() => setSelectedDepartmentId("")}
            className={classNames(
              "shrink-0 p-4 rounded-xl transition-all duration-200 min-w-50",
              !selectedDepartmentId
                ? "border-primary bg-primary/5 shadow-md"
                : "border-outline-variant/30 bg-surface-container-lowest hover:border-primary/30 hover:shadow-sm"
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">grid_view</span>
              <span className="text-sm font-bold text-on-surface">All Departments</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-on-surface">{projects.length}</span>
              <span className="text-[11px] text-outline">projects</span>
            </div>
          </button>

          {/* Department Cards */}
          {departments.map((dept, index) => {
            const deptProjects = projects.filter(p => p.departmentId === dept.id);
            const colors = departmentColors[index % departmentColors.length];
            const isSelected = selectedDepartmentId === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartmentId(isSelected ? "" : dept.id)}
                className={classNames(
                  "shrink-0 p-4 rounded-xl border-2 transition-all duration-200 min-w-50",
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-md`
                    : "border-outline-variant/30 bg-surface-container-lowest hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-bold ${isSelected ? colors.text : 'text-on-surface'}`}>{dept.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${isSelected ? colors.text : 'text-on-surface'}`}>
                    {deptProjects.length}
                  </span>
                  <span className="text-[11px] text-outline">projects</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex-1 flex overflow-hidden gap-lg">
        {/* LEFT COLUMN: Projects Board */}
        <ProjectsBoard
          projects={projects}
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
          <section className="flex-1 glass-card rounded-xl p-lg flex items-center justify-center">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                folder_open
              </span>
              <p className="text-on-surface-variant">No project selected</p>
              <p className="text-sm text-outline mt-1">Choose a project to inspect milestones and AI signals.</p>
            </div>
          </section>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        form={form}
        setForm={setForm}
        departments={departments}
        users={users}
      />

      <EditProjectModal
        show={showEditModal}
        project={selectedProject}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditProject}
        form={form}
        setForm={setForm}
        departments={departments}
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