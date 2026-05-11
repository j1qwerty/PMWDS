import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, Project, ProjectHealth, User } from "../../types";
import { classNames, formatMoney, formatPercent } from "../../ui";
import { projectStatuses, priorities } from "../constants";

export function ProjectsPage() {
  const { auth, hasRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [_message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    order: 1,
    isCritical: false,
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

  const handleCreateMilestone = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth || !selectedProjectId) return;
    await api.createMilestone(auth.token, { ...milestoneForm, projectId: selectedProjectId });
    setMessage("Milestone created.");
    // Optionally reload milestones
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "InProgress": return { label: "On Track", dot: "bg-green-500", pill: "bg-green-100 text-green-700" };
      case "Delayed": return { label: "At Risk", dot: "bg-orange-400", pill: "bg-orange-100 text-orange-700" };
      case "Completed": return { label: "Completed", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700" };
      default: return { label: status, dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600" };
    }
  };

  const healthScore = selectedProject?.aiHealthScore != null ? Math.round(selectedProject.aiHealthScore * 100) : null;
  const progress = selectedProject?.progressPercentage || 0;
  const delayRisk = selectedProject?.aiDelayRiskScore != null ? Math.round(selectedProject.aiDelayRiskScore * 100) : null;

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

      {/* Dual Pane Layout */}
      <div className="flex-1 flex overflow-hidden gap-lg">
       {/* LEFT COLUMN: Projects Board */}
      <section className="w-2/5 min-w-[380px] flex flex-col gap-md overflow-y-auto custom-scrollbar pr-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-h2 text-h2 text-on-surface font-bold">Projects Board</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-outline-variant tracking-widest uppercase">{projects.length} Active</span>
            <button className="text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full bg-surface border border-outline-variant rounded-md py-2 pl-10 pr-3 text-sm text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow outline-none shadow-sm"
            placeholder="Filter projects..."
            type="text"
          />
        </div>

        {projects.map((project) => {
          const projProgress = project.progressPercentage || 0;
          const projHealth = project.aiHealthScore != null ? Math.round(project.aiHealthScore * 100) : null;
          const isSelected = project.id === selectedProjectId;
          
          const getStatusStyles = (status: string) => {
            const styles: Record<string, { 
              label: string; 
              dot: string; 
              border: string;
              borderSelected: string;
              ring: string;
              progressColor: string;
              bgHover: string;
              bgSelected: string;
              textColor: string;
              badge: string;
              shadow: string;
            }> = {
              NotStarted: { 
                label: "Not Started",
                dot: "bg-slate-400",
                border: "border-slate-200",
                borderSelected: "border-slate-400",
                ring: "ring-slate-200",
                progressColor: "stroke-slate-400",
                bgHover: "hover:bg-slate-50",
                bgSelected: "bg-slate-50",
                textColor: "text-slate-600",
                badge: "bg-slate-100 text-slate-600",
                shadow: "shadow-sm hover:shadow-md",
              },
              Assigned: { 
                label: "Assigned",
                dot: "bg-blue-500",
                border: "border-blue-200",
                borderSelected: "border-blue-400",
                ring: "ring-blue-200",
                progressColor: "stroke-blue-500",
                bgHover: "hover:bg-blue-50",
                bgSelected: "bg-blue-50",
                textColor: "text-blue-700",
                badge: "bg-blue-50 text-blue-700",
                shadow: "shadow-sm hover:shadow-md",
              },
              InProgress: { 
                label: "On Track",
                dot: "bg-primary",
                border: "border-outline-variant/30",
                borderSelected: "border-primary",
                ring: "ring-primary/20",
                progressColor: "stroke-primary",
                bgHover: "hover:bg-primary/5",
                bgSelected: "bg-primary/5",
                textColor: "text-primary",
                badge: "bg-primary/10 text-primary",
                shadow: "shadow-sm hover:shadow-md",
              },
              Completed: { 
                label: "Completed",
                dot: "bg-emerald-500",
                border: "border-emerald-200",
                borderSelected: "border-emerald-400",
                ring: "ring-emerald-200",
                progressColor: "stroke-emerald-500",
                bgHover: "hover:bg-emerald-50",
                bgSelected: "bg-emerald-50",
                textColor: "text-emerald-700",
                badge: "bg-emerald-50 text-emerald-700",
                shadow: "shadow-sm hover:shadow-md",
              },
              Delayed: { 
                label: "At Risk",
                dot: "bg-error",
                border: "border-error/20",
                borderSelected: "border-error",
                ring: "ring-error/20",
                progressColor: "stroke-error",
                bgHover: "hover:bg-error/5",
                bgSelected: "bg-error/5",
                textColor: "text-error",
                badge: "bg-error-container text-error",
                shadow: "shadow-sm hover:shadow-md",
              },
              OnHold: { 
                label: "On Hold",
                dot: "bg-amber-500",
                border: "border-amber-200",
                borderSelected: "border-amber-400",
                ring: "ring-amber-200",
                progressColor: "stroke-amber-500",
                bgHover: "hover:bg-amber-50",
                bgSelected: "bg-amber-50",
                textColor: "text-amber-700",
                badge: "bg-amber-50 text-amber-700",
                shadow: "shadow-sm hover:shadow-md",
              },
              Cancelled: { 
                label: "Cancelled",
                dot: "bg-slate-400",
                border: "border-slate-100",
                borderSelected: "border-slate-300",
                ring: "ring-slate-100",
                progressColor: "stroke-slate-400",
                bgHover: "hover:bg-slate-50",
                bgSelected: "bg-slate-50",
                textColor: "text-slate-500",
                badge: "bg-slate-100 text-slate-500",
                shadow: "shadow-sm hover:shadow-md",
              },
            };
            return styles[status] || styles.NotStarted;
          };

          const statusStyle = getStatusStyles(project.status);

          const getHealthColor = (score: number) => {
            if (score >= 80) return "bg-green-100 text-green-700";
            if (score >= 50) return "bg-orange-100 text-orange-700";
            return "bg-red-100 text-red-700";
          };

          return (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={classNames(
                "p-md rounded-xl cursor-pointer relative overflow-hidden group border shadow-sm transition-all duration-200",
                isSelected 
                  ? `${statusStyle.borderSelected} ${statusStyle.bgSelected} shadow-md border-2` 
                  : `${statusStyle.border} bg-white ${statusStyle.shadow}`,
                statusStyle.bgHover,
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col min-w-0 flex-1 mr-3">
                  <span className={`text-[10px] font-bold tracking-widest ${statusStyle.textColor}`}>
                    {project.id}
                  </span>
                  <h3 className="text-lg font-bold text-on-surface truncate">
                    {project.name}
                  </h3>
                </div>
                
                <div className="size-12 relative flex items-center justify-center flex-shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <circle 
                      className="stroke-surface-container" 
                      cx="18" cy="18" fill="none" r="16" strokeWidth="3" 
                    />
                    <circle
                      className={`${statusStyle.progressColor} transition-all duration-700`}
                      cx="18" cy="18" fill="none" r="16"
                      strokeDasharray="100"
                      strokeDashoffset={100 - projProgress}
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                  </svg>
                  <span className={`absolute text-[10px] font-bold ${statusStyle.textColor}`}>
                    {projProgress}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-4">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${statusStyle.dot} ${project.status === 'Delayed' ? 'animate-pulse' : ''}`} />
                  <span className={`font-medium ${statusStyle.textColor}`}>{statusStyle.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="truncate">
                    {project.plannedStartDate && project.plannedEndDate 
                      ? `${new Date(project.plannedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(project.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : "No dates set"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3">
                <div className="flex -space-x-2">
                  <img 
                    className="size-7 rounded-full border-2 border-white" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH7I8--A4X3bMb2GA7rQzdC7-2jNm_mCdJRLa6ZL6SdNt18YUGrdfY-DqK2MBC2ZQTN-tVpRzN4RSkG4JJ2AnWGFE2seXiAVI0lSIUy_-DnukmKmhiz68FMexzkx3N-TPa2R8DFC4XojhiMAq4JOrOGnnAmib6ul7qb2zL8zfvOEx3QVdnHhHyos4GweTRuE2CJBBPCqRsDsvhuiaorRENV1LeUp6NluUA2KKDNI9cldhsfmmKFQLRaybGIprk_-BGMAJnTxzHztk" 
                    alt="" 
                  />
                  <img 
                    className="size-7 rounded-full border-2 border-white" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDq7aiGGBXrem7dlepCOoYtG_gf419xnUzZbg3HiIaDvVLG8lrtSUiAx02OTiNP1aa4UUPO5yYPQ51wBWSdmH7wfZawua3q2kYGqjvLIEzHfLMBdtkO6LD8REAdAieETXdYHatSe_e09hPc5p5g5LFWJNNbMZj29WuzEZPPTJ0URAuMDgqKAE2o4EtBLy95CNSqKWUFMcoc1jtdt0DOnOZJBFNkQeSq3zqWu-xY0vZPGQMsWld1IcO7SsuLbGkbRTrNZbUfactXvCM" 
                    alt="" 
                  />
                  <div className="size-7 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold border-2 border-white">
                    +2
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-outline">Health</span>
                  {projHealth != null ? (
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getHealthColor(projHealth)}`}>
                      {projHealth}
                    </div>
                  ) : (
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      N/A
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </section>

        {/* RIGHT COLUMN: Project Detail Pane */}
        <section className="flex-1 glass-card rounded-xl p-lg flex flex-col gap-lg overflow-y-auto custom-scrollbar">
          {selectedProject ? (
            <>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-bold tracking-widest text-primary bg-primary-fixed px-2 py-0.5 rounded">{selectedProject.id}</span>
                    <span className="text-sm font-medium text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">history</span>
                      Updated 2h ago
                    </span>
                  </div>
                  <h1 className="text-h1 text-on-surface font-bold">{selectedProject.name}</h1>
                  <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
                    {selectedProject.description || "No description provided."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasRole("SuperAdmin") && (
                    <button
                      onClick={async () => {
                        if (!auth) return;
                        await api.deleteProject(auth.token, selectedProject.id);
                        setSelectedProjectId("");
                        await loadProjects();
                      }}
                      className="size-10 rounded-lg flex items-center justify-center bg-white border border-outline-variant/30 hover:bg-surface-container transition-colors text-error"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                  <button className="size-10 rounded-lg flex items-center justify-center bg-white border border-outline-variant/30 hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">edit</span>
                  </button>
                  {/* <button className="size-10 rounded-lg flex items-center justify-center bg-white border border-outline-variant/30 hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">share</span>
                  </button> */}
                </div>
              </div>

              {/* AI Insights Tags */}
              {insights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                      <span className="text-xs font-bold text-primary tracking-wide uppercase">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
              {insights.length == 0 && (
                    <div className="flex flex-wrap gap-2">
                        <div className="px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                            <span className="text-xs font-bold text-primary tracking-wide uppercase">AI Insight: Optimized Path</span>
                        </div>
                        <div className="px-3 py-1.5 bg-secondary/5 border border-secondary/20 rounded-full flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                            <span className="text-xs font-bold text-secondary tracking-wide uppercase">Resource Efficiency High</span>
                        </div>
                        <div className="px-3 py-1.5 bg-tertiary/5 border border-tertiary/20 rounded-full flex items-center gap-2">
                            <span className="material-symbols-outlined text-tertiary text-[18px]">auto_awesome</span>
                            <span className="text-xs font-bold text-tertiary tracking-wide uppercase">AI Insight: On Pace</span>
                        </div>
                    </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Budget</span>
                  <span className="text-lg font-bold text-on-surface">{formatMoney(selectedProject.plannedBudget)}</span>
                  <div className="w-full h-1 bg-surface-container rounded-full mt-2 overflow-hidden">
                    <div className="bg-primary w-[65%] h-full"></div>
                  </div>
                </div>
                <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Actual Cost</span>
                  <span className="text-lg font-bold text-on-surface">{formatMoney(selectedProject.actualCost)}</span>
                  {selectedProject.actualCost != null && selectedProject.plannedBudget != null && (
                    <span className="text-[10px] text-green-600 font-bold mt-1">
                      {Math.round((selectedProject.actualCost / selectedProject.plannedBudget) * 100)}% of budget
                    </span>
                  )}
                </div>
                <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Delay Risk</span>
                  <span className={`text-lg font-bold ${delayRisk && delayRisk > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                    {delayRisk != null ? `${delayRisk}%` : "—"}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium mt-1">Buffer: —</span>
                </div>
                <div className="bg-surface-container-low/50 p-md rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Progress Health</span>
                  <span className="text-lg font-bold text-on-surface">{healthScore ?? "—"}</span>
                  <span className="text-[10px] text-primary font-bold mt-1">AI assessed</span>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="w-full">
                <div className="glass-card rounded-xl p-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="inline-flex items-center space-x-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-1 rounded-full text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>AI Insight: On Pace</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-center">
                    <div className="flex justify-center items-center flex-col">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progress}, 100`} strokeWidth="3" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="font-h1 text-h1 text-on-surface">{progress}%</span>
                        </div>
                      </div>
                      <span className="text-sm text-outline mt-2 font-medium">Overall Completion</span>
                    </div>
                    <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-md">
                      <div className="bg-surface/50 p-md rounded-lg border border-surface-variant/50">
                        <div className="text-sm text-outline mb-1 font-label-caps">Budget Utilized</div>
                        <div className="font-h2 text-h2 text-on-surface mb-2">
                          {formatMoney(selectedProject.actualCost)} 
                          <span className="text-sm text-outline font-normal"> / {formatMoney(selectedProject.plannedBudget)}</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${selectedProject.plannedBudget ? Math.min((selectedProject.actualCost??0) / selectedProject.plannedBudget * 100, 100) : 0}%` }} />
                        </div>
                      </div>
                      <div className="bg-surface/50 p-md rounded-lg border border-surface-variant/50">
                        <div className="text-sm text-outline mb-1 font-label-caps">Delay Risk</div>
                        <div className="font-h2 text-h2 text-on-surface mb-2">{delayRisk != null ? `${delayRisk}%` : "—"}</div>
                        <div className="text-xs text-green-600 flex items-center">
                          <span className="material-symbols-outlined text-[14px] mr-1">trending_down</span>
                          {delayRisk && delayRisk < 30 ? 'Low risk' : 'Moderate risk'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Change Buttons (Manager only) */}
              <div className="flex flex-wrap gap-2">
                {projectStatuses.map((status) => {
                  const canUpdate = hasRole("SuperAdmin", "ProjectManager", "DepartmentHead");
                  
                  const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
                    NotStarted: { 
                      bg: "bg-slate-100", 
                      text: "text-slate-600", 
                      border: "border-slate-300",
                      dot: "bg-slate-400" 
                    },
                    Assigned: { 
                      bg: "bg-blue-50", 
                      text: "text-blue-700", 
                      border: "border-blue-200",
                      dot: "bg-blue-500" 
                    },
                    InProgress: { 
                      bg: "bg-primary/10", 
                      text: "text-primary", 
                      border: "border-primary/30",
                      dot: "bg-primary" 
                    },
                    Completed: { 
                      bg: "bg-emerald-50", 
                      text: "text-emerald-700", 
                      border: "border-emerald-200",
                      dot: "bg-emerald-500" 
                    },
                    Delayed: { 
                      bg: "bg-error-container", 
                      text: "text-error", 
                      border: "border-error/30",
                      dot: "bg-error" 
                    },
                    OnHold: { 
                      bg: "bg-amber-50", 
                      text: "text-amber-700", 
                      border: "border-amber-200",
                      dot: "bg-amber-500" 
                    },
                    Cancelled: { 
                      bg: "bg-slate-100", 
                      text: "text-slate-500", 
                      border: "border-slate-200",
                      dot: "bg-slate-400" 
                    },
                  };

                  const styles = statusStyles[status] || statusStyles.NotStarted;
                  const isActive = selectedProject?.status === status;

                  return (
                    <button
                      key={status}
                      onClick={canUpdate ? async () => {
                        if (!auth) return;
                        await api.updateProjectStatus(auth.token, selectedProject!.id, status);
                        await loadProjects();
                      } : undefined}
                      disabled={!canUpdate}
                      className={classNames(
                        "px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5",
                        styles.bg,
                        styles.text,
                        isActive ? `${styles.border} ring-2 ring-offset-1 ${styles.border}` : "border-transparent",
                        canUpdate 
                          ? "cursor-pointer hover:shadow-md hover:scale-105" 
                          : "cursor-default opacity-90"
                      )}
                      title={canUpdate ? `Change status to ${status}` : `Status: ${status}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
                      {status}
                      {isActive && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  );
                })}
              </div>

                {/* Health Matrix & Activity Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                {/* Left: Project Health Matrix */}
                <div className="flex flex-col gap-md">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">health_metrics</span>
                    Project Health Matrix
                  </h3>
                  <div className="grid grid-cols-2 gap-sm">
                    {(() => {
                      // TODO: Replace with real AI health data when available
                      // Currently calculating dummy health metrics based on project data
                      const calculateDummyHealth = () => {
                        const progress = selectedProject?.progressPercentage || 0;
                        const delayRisk = selectedProject?.aiDelayRiskScore || 0;
                        const budgetRatio = selectedProject?.plannedBudget 
                          ? (selectedProject.actualCost || 0) / selectedProject.plannedBudget 
                          : 0;
                        
                        const scheduleScore = Math.max(0, Math.min(1, 
                          (progress / 100) * 0.7 + (1 - delayRisk) * 0.3
                        ));
                        
                        const budgetScore = Math.max(0, Math.min(1, 
                          budgetRatio <= 1 ? 1 - (budgetRatio * 0.5) : Math.max(0, 1.5 - budgetRatio)
                        ));
                        
                        const teamScore = 0.75;
                        
                        const qualityScore = Math.max(0, Math.min(1, 
                          progress > 0 ? 0.5 + (progress / 200) : 0.5
                        ));
                        
                        return [
                          { label: "Schedule", value: scheduleScore },
                          { label: "Budget", value: budgetScore },
                          { label: "Team", value: teamScore },
                          { label: "Quality", value: qualityScore },
                        ];
                      };

                      const healthMetrics = health 
                        ? [
                            { label: "Schedule", value: health.scheduleHealth },
                            { label: "Budget", value: health.budgetHealth },
                            { label: "Team", value: health.teamHealth },
                            { label: "Quality", value: health.qualityHealth },
                          ]
                        : calculateDummyHealth();

                      return healthMetrics.map((item, index) => {
                        const getHealthColor = (value: number) => {
                          if (value >= 0.8) return { dot: 'bg-green-500', text: 'text-green-700', label: 'Good' };
                          if (value >= 0.6) return { dot: 'bg-yellow-400', text: 'text-yellow-700', label: 'Fair' };
                          return { dot: 'bg-red-500', text: 'text-red-700', label: 'Poor' };
                        };
                        
                        const healthColor = getHealthColor(item.value);

                        return (
                          <div 
                            key={item.label} 
                            className="p-md bg-white rounded-lg border border-outline-variant/10 flex flex-col gap-2 relative"
                          >
                            {!health && index === 0 && (
                              <div className="absolute -top-2 -right-2">
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                  Estimated
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-on-surface-variant">{item.label}</span>
                              <div className={`size-2 rounded-full ${healthColor.dot} status-beacon on-track`} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-base font-bold">{Math.round(item.value * 100)}%</span>
                              <span className={`text-[10px] font-medium ${healthColor.text}`}>
                                {healthColor.label}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full transition-all ${item.value >= 0.8 ? 'bg-green-500' : item.value >= 0.6 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                style={{ width: `${item.value * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {!health && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                      <span className="material-symbols-outlined text-amber-600 text-[16px]">auto_awesome</span>
                      <p className="text-[11px] text-amber-700">
                        <span className="font-semibold">AI Health Metrics Coming Soon</span> — Currently showing estimates based on project progress, budget, and timeline data.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Recent Activity & Quick Actions */}
                <div className="flex flex-col gap-lg">
                  {/* Recent Activity */}
                  <div className="flex flex-col gap-md">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">timeline</span>
                      Recent Activity
                    </h3>
                    <div className="flex flex-col gap-sm">
                      <div className="flex gap-3">
                        <div className="h-10 w-1 bg-primary rounded-full"></div>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-on-surface">Infrastructure blueprint approved by architecture lead.</p>
                          <span className="text-[10px] text-outline">Yesterday, 4:30 PM • Ishani Gupta</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="h-10 w-1 bg-surface-container-highest rounded-full"></div>
                        <div className="flex flex-col opacity-60">
                          <p className="text-sm font-medium text-on-surface">Database migration script finalized for staging.</p>
                          <span className="text-[10px] text-outline">Oct 24, 11:20 AM • Aarav Sharma</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="h-10 w-1 bg-surface-container-highest rounded-full"></div>
                        <div className="flex flex-col opacity-40">
                          <p className="text-sm font-medium text-on-surface">Initial security audit completed for cloud infrastructure.</p>
                          <span className="text-[10px] text-outline">Oct 22, 3:15 PM • Vihaan Malhotra</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions - Create Milestone */}
                  {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
                    <div className="bg-surface-container-lowest/80 p-md rounded-xl border border-outline-variant/20 flex flex-col gap-md">
                      <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">bolt</span>
                        Quick Actions
                      </h3>
                      <form onSubmit={handleCreateMilestone} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Milestone Name</label>
                          <input
                            value={milestoneForm.name}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                            className="bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            placeholder="e.g. UAT Phase Completion"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Due Date</label>
                            <input
                              type="date"
                              value={milestoneForm.dueDate}
                              onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                              className="bg-surface-container-low border-none rounded-lg text-sm px-2 py-2 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Critical</label>
                            <select
                              value={milestoneForm.isCritical ? "true" : "false"}
                              onChange={(e) => setMilestoneForm({ ...milestoneForm, isCritical: e.target.value === "true" })}
                              className="bg-surface-container-low border-none rounded-lg text-sm px-2 py-2 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            >
                              <option value="false">Standard</option>
                              <option value="true">Critical</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Description</label>
                          <textarea
                            value={milestoneForm.description}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                            className="bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            rows={2}
                          />
                        </div>
                        <button type="submit" className="primary-gradient text-white font-bold py-2 rounded-lg text-sm ambient-glow flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          Create Milestone
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-surface-container-lowest/80 p-md rounded-xl border border-outline-variant/20 flex flex-col gap-md">
                      <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">bolt</span>
                        Quick Actions
                      </h3>
                      <div className="flex flex-col items-center justify-center gap-3 text-center py-4">
                        <span className="material-symbols-outlined text-outline text-3xl">shield_person</span>
                        <div>
                          <p className="text-sm font-medium text-on-surface">Milestone Management</p>
                          <p className="text-xs text-on-surface-variant mt-1">Contact your project manager to add milestones</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              

              {/* File Upload & Actions */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="text-sm" />
                <button
                  onClick={async () => {
                    if (!auth || !uploadFile) return;
                    await api.uploadProjectDocument(auth.token, selectedProject.id, uploadFile);
                    setMessage("Project document uploaded.");
                  }}
                  disabled={!uploadFile}
                  className="rounded-md border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  Upload Document
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                folder_open
              </span>
              <p className="text-on-surface-variant">No project selected</p>
              <p className="text-sm text-outline mt-1">Choose a project to inspect milestones and AI signals.</p>
            </div>
          )}
        </section>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl ambient-glow">
            <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
              <h2 className="font-h2 text-h2 text-on-surface">Create New Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="material-symbols-outlined text-outline hover:text-primary">close</button>
            </div>
            <form onSubmit={handleCreateProject} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Project Code</span>
                <input value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" required />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" required />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Description</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" rows={3} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Category</span>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Priority</span>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm">
                  {priorities.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Start Date</span>
                <input type="date" value={form.plannedStartDate} onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">End Date</span>
                <input type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Budget</span>
                <input type="number" value={form.plannedBudget} onChange={(e) => setForm({ ...form, plannedBudget: Number(e.target.value) })} className="border border-outline-variant rounded-lg p-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Department</span>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm">
                  <option value="">Choose</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Project Manager</span>
                <select value={form.projectManagerId} onChange={(e) => setForm({ ...form, projectManagerId: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm">
                  <option value="">Choose</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant">Cancel</button>
                <button type="submit" className="px-6 py-2 primary-gradient text-white font-bold rounded-lg text-sm">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}