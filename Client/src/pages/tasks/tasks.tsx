import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, Task, User } from "../../types";
import { formatPercent, formatDate } from "../../ui";
import {
  GlassCard,
  GradientButton,
  useNavHeader,
  LoadingPage,
  Avatar,
  AvatarStack,
  PERMISSION_GROUPS,
  usePermission,
  getStatusColor,
  useToast,
  StatusBadge,
  PriorityBadge,
  FilterButtons,
  AnimatedBackground,
  OrganizationDepartmentFilter,
  projectBelongsToAnyDepartment,
  projectBelongsToDepartment,
  getProjectDepartments,
  StatCard,
  MessageBanner,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import { TaskSubtaskDetails } from "./TaskSubtaskDetails";
import { TaskFormModal } from "./TaskFormModal";

export function TasksPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const { addToast } = useToast();
  const canManageTasks = perm.has(PERMISSION_GROUPS.task.manage);

  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);
  
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assigneeId: "",
  });
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "Tasks",
      description: "Manage and track all tasks across projects and milestones",
      action: canManageTasks ? {
        label: "New Task",
        onClick: () => setTaskModal({ open: true }),
        icon: "add_task",
      } : undefined,
    });
  }, [setNavHeader, canManageTasks]);

  const [taskModal, setTaskModal] = useState<{ open: boolean; editTask?: Task }>({ open: false });
  const [recommendation, setRecommendation] = useState<any>(null);
  const [delay, setDelay] = useState<any>(null);

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getProjects(auth.token),
      api.getOrganizations(auth.token),
      api.getDepartments(auth.token),
      api.getUsers(auth.token),
    ]).then(([projectData, orgData, deptData, userData]) => {
      setProjects(projectData);
      setOrganizations(orgData);
      setDepartments(deptData);
      setUsers(userData as User[]);
      
      if (projectData.length > 0) {
        loadAllTasks(projectData);
      }
    }).catch((cause) => {
      setMessage(cause instanceof Error ? cause.message : "Failed to load data.");
    }).finally(() => setLoading(false));
  };

  const loadAllTasks = async (projectList: Project[]) => {
    if (!auth) return;
    try {
      const allTasks: Task[] = [];
      const allMilestones: Milestone[] = [];
      
      for (const project of projectList) {
        const [projectTasks, projectMilestones] = await Promise.all([
          api.getTasksByProject(auth.token, project.id),
          api.getMilestonesByProject(auth.token, project.id).catch(() => []),
        ]);
        allTasks.push(...projectTasks);
        allMilestones.push(...projectMilestones);
      }
      
      setTasks(allTasks);
      setMilestones(allMilestones);
    } catch (e) {
      setMessage("Failed to load tasks");
    }
  };

  useEffect(() => { loadData(); }, [auth]);

  useEffect(() => {
    if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
      setSelectedOrgId(userOrganizationId);
    }
  }, [shouldFilterByOrg, userOrganizationId]);

  // Load AI insights for selected task
  useEffect(() => {
    if (!auth || !selectedTaskId || !canManageTasks) return;
    Promise.all([
      api.getTaskRecommendation(auth.token, selectedTaskId),
      api.getTaskDelayPrediction(auth.token, selectedTaskId),
    ]).then(([rec, del]) => {
      setRecommendation(rec);
      setDelay(del);
    }).catch(() => {
      setRecommendation(null);
      setDelay(null);
    });
  }, [auth, selectedTaskId]);

  // Filtered data
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === userOrganizationId)
        .map(d => d.id);
      filtered = filtered.filter(p => projectBelongsToAnyDepartment(p, orgDeptIds));
    }
    if (selectedOrgId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === selectedOrgId)
        .map(d => d.id);
      filtered = filtered.filter(p => projectBelongsToAnyDepartment(p, orgDeptIds));
    }
    if (selectedDeptId) {
      filtered = filtered.filter(p => projectBelongsToDepartment(p, selectedDeptId));
    }
    return filtered;
  }, [projects, selectedOrgId, selectedDeptId, departments, shouldFilterByOrg, userOrganizationId]);

  const filteredMilestones = useMemo(() => {
    let result = milestones;
    if (selectedProjectId) {
      result = result.filter(m => {
        const milestoneProject = projects.find(p => p.id === (m as any).projectId || m.projectId);
        return milestoneProject?.id === selectedProjectId;
      });
    } else if (selectedOrgId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === selectedOrgId)
        .map(d => d.id);
      const orgProjectIds = projects
        .filter(p => projectBelongsToAnyDepartment(p, orgDeptIds))
        .map(p => p.id);
      result = result.filter(m => {
        const milestoneProjectId = (m as any).projectId || m.projectId;
        return orgProjectIds.includes(milestoneProjectId);
      });
    } else if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === userOrganizationId)
        .map(d => d.id);
      const orgProjectIds = projects
        .filter(p => projectBelongsToAnyDepartment(p, orgDeptIds))
        .map(p => p.id);
      result = result.filter(m => {
        const milestoneProjectId = (m as any).projectId || m.projectId;
        return orgProjectIds.includes(milestoneProjectId);
      });
    }
    return result;
  }, [milestones, selectedProjectId, selectedOrgId, departments, projects, shouldFilterByOrg, userOrganizationId]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => !t.parentTaskId);

    // Filter by project
    if (selectedProjectId) {
      result = result.filter(t => t.projectId === selectedProjectId);
    } else if (selectedOrgId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === selectedOrgId)
        .map(d => d.id);
      const orgProjectIds = projects
        .filter(p => projectBelongsToAnyDepartment(p, orgDeptIds))
        .map(p => p.id);
      result = result.filter(t => orgProjectIds.includes(t.projectId));
    } else if (shouldFilterByOrg && userOrganizationId) {
      const orgDeptIds = departments
        .filter(d => d.organizationId === userOrganizationId)
        .map(d => d.id);
      const orgProjectIds = projects
        .filter(p => projectBelongsToAnyDepartment(p, orgDeptIds))
        .map(p => p.id);
      result = result.filter(t => orgProjectIds.includes(t.projectId));
    }

    // Filter by milestone
    if (selectedMilestoneId) {
      result = result.filter(t => t.milestoneId === selectedMilestoneId);
    }

    // Apply additional filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        (t.description && t.description.toLowerCase().includes(search))
      );
    }
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.assigneeId) {
      result = result.filter(t => t.assignedToUserId === filters.assigneeId);
    }

    return result;
  }, [tasks, selectedProjectId, selectedOrgId, selectedMilestoneId, filters, departments, projects, shouldFilterByOrg, userOrganizationId]);

  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  const searchResults = useMemo(() => {
    if (!filters.search.trim()) return [];
    const query = filters.search.toLowerCase();
    return tasks
      .filter(t => {
        const proj = getProject(t.projectId);
        const dept = proj ? getProjectDepartments(proj, departments)[0] : null;
        return (
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          (proj && proj.name.toLowerCase().includes(query)) ||
          (dept && dept.name.toLowerCase().includes(query))
        );
      })
      .slice(0, 10);
  }, [tasks, filters.search, projects, departments]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;
  const selectedMilestone = milestones.find(m => m.id === selectedMilestoneId) ?? null;
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Stats
  const completedTasks = filteredTasks.filter(t => t.status === "Completed").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "InProgress").length;
  const overdueTasks = filteredTasks.filter(t => t.isOverdue).length;
  const avgProgress = filteredTasks.length 
    ? filteredTasks.reduce((sum, t) => sum + (t.progressPercentage || 0), 0) / filteredTasks.length 
    : 0;

  // Get tasks for selected milestone
  const milestoneTasks = useMemo(() => {
    if (!selectedMilestoneId) return [];
    return filteredTasks.filter(t => t.milestoneId === selectedMilestoneId);
  }, [filteredTasks, selectedMilestoneId]);

  // Get unassigned tasks (no milestone)
  const unassignedTasks = useMemo(() => {
    return filteredTasks.filter(t => !t.milestoneId);
  }, [filteredTasks]);

const handleTaskSubmit = async (form: Record<string, unknown>) => {
    if (!auth) return;
    try {
        const assigneeIds = Array.isArray(form.assignedToUserIds)
            ? form.assignedToUserIds.filter((value): value is string => typeof value === "string")
            : [];
        
        // Build the task data with explicit IDs from the current context
        const taskData: Record<string, unknown> = { ...form };
        
        if (taskData.projectId === "") {
            delete taskData.projectId;
        }

        if (selectedProjectId) {
            taskData.projectId = selectedProjectId;
        }

        if (!taskData.projectId) {
            const milestoneProjectId = selectedMilestone?.projectId;
            if (milestoneProjectId) {
                taskData.projectId = milestoneProjectId;
            }
        }

        if (!taskData.projectId) {
            throw new Error("Select a project before saving the task.");
        }
        
        // Add milestoneId if a specific milestone is selected (and not "unassigned")
        if (selectedMilestoneId && selectedMilestoneId !== "unassigned") {
            taskData.milestoneId = selectedMilestoneId;
        }
        
        if (taskModal.editTask) {
            await api.updateTask(auth.token, taskModal.editTask.id, taskData);
            if (assigneeIds.length > 0) {
                await api.assignTaskMembers(auth.token, taskModal.editTask.id, assigneeIds);
            }
            setMessage("Task updated.");
            addToast("Task updated.");
        } else {
            await api.createTask(auth.token, taskData);
            setMessage("Task created.");
            addToast("Task created.");
        }
        
        setTaskModal({ open: false });
        
        // Refresh logic...
        if (selectedProjectId) {
            const projectTasks = await api.getTasksByProject(auth.token, selectedProjectId);
            setTasks(prev => {
                const otherTasks = prev.filter(t => t.projectId !== selectedProjectId);
                return [...otherTasks, ...projectTasks];
            });
        } else {
            loadData();
        }
    } catch (e) {
        const errorMsg = `Error: ${e instanceof Error ? e.message : "Save failed"}`;
        setMessage(errorMsg);
        addToast(errorMsg, "error");
    }
};

  const handleStatusChange = async (taskId: string, status: string, options?: { confirmReset?: boolean }) => {
    if (!auth) return;
    try {
      await api.updateTaskStatus(auth.token, taskId, status, { confirmReset: options?.confirmReset });
      if (options?.confirmReset) {
        addToast("Status updated and progress reset.");
        setMessage("Status updated and progress reset.");
      } else {
        addToast("Status updated.");
        setMessage("Status updated.");
      }
      loadData();
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : "Update failed"}`;
      setMessage(errorMsg);
      addToast(errorMsg, "error");
    }
  };

  const handleEscalate = async (taskId: string) => {
    if (!auth) return;
    try {
      await api.escalateTask(auth.token, taskId);
      addToast("Task escalated.");
      setMessage("Task escalated.");
      loadData();
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : "Escalation failed"}`;
      setMessage(errorMsg);
      addToast(errorMsg, "error");
    }
  };

  const handleUpdateProgress = async (taskId: string, progress: number, notes: string) => {
    if (!auth) return;
    try {
      await api.updateTaskProgress(auth.token, taskId, progress, notes);
      addToast("Progress updated.");
      setMessage("Progress updated.");
      loadData();
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : "Update failed"}`;
      setMessage(errorMsg);
      addToast(errorMsg, "error");
    }
  };

  if (loading) return <LoadingPage label="Loading tasks..." />;

  return (
    <div>
      <AnimatedBackground />



      {message && (
        <MessageBanner message={message} onDismiss={() => setMessage("")} />
      )}

      {/* Stats Row */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Tasks" value={filteredTasks.length} color="indigo" icon="task_alt" />
        <StatCard label="In Progress" value={inProgressTasks} color="amber" icon="pending" />
        <StatCard label="Completed" value={completedTasks} color="emerald" icon="check_circle" />
        <StatCard label="Avg Progress" value={`${Math.round(avgProgress)}%`} color="blue" icon="trending_up" />
      </div>

      {/* Filters Section */}
      <div className="relative z-10 mb-5 space-y-3">
        <OrganizationDepartmentFilter
          organizations={organizations}
          departments={departments}
          users={users}
          selectedOrganizationId={selectedOrgId}
          selectedDepartmentId={selectedDeptId}
          allOrganizationsLabel="All Tasks"
          onOrganizationChange={(organizationId) => {
            setSelectedOrgId(organizationId);
            setSelectedProjectId("");
            setSelectedMilestoneId("");
          }}
          onDepartmentChange={(departmentId) => {
            setSelectedDeptId(departmentId);
            setSelectedProjectId("");
            setSelectedMilestoneId("");
          }}
        />

        {/* Department, Project & Search Row */}
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedMilestoneId("");
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 bg-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="">All Projects</option>
            {filteredProjects.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search tasks by title, project, or department..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-[13px] outline-none bg-white placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
            {filters.search && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 max-h-72 overflow-y-auto z-50">
                {searchResults.map((task) => {
                  const proj = getProject(task.projectId);
                  const dept = proj ? getProjectDepartments(proj, departments)[0] : null;
                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setSelectedProjectId(task.projectId);
                        setFilters({ ...filters, search: "" });
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} />
                        <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 ml-4">
                        {proj && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">folder</span>
                            {proj.name}
                          </span>
                        )}
                        {dept && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">business</span>
                            {dept.name}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status & Priority Filters */}
        <div className="flex gap-4 flex-wrap items-center">
          <FilterButtons
            options={["NotStarted", "InProgress", "Completed", "Delayed", "OnHold", "Cancelled"]}
            selected={filters.status}
            onChange={(status) => setFilters({ ...filters, status })}
            allLabel="All Status"
            colorMap={{
              NotStarted: { bg: getStatusColor('Not Started').bg, text: getStatusColor('Not Started').text, dot: getStatusColor('Not Started').dot },
              InProgress: { bg: getStatusColor('In Progress').bg, text: getStatusColor('In Progress').text, dot: getStatusColor('In Progress').dot },
              Completed: { bg: getStatusColor('Completed').bg, text: getStatusColor('Completed').text, dot: getStatusColor('Completed').dot },
              Delayed: { bg: getStatusColor('Delayed').bg, text: getStatusColor('Delayed').text, dot: getStatusColor('Delayed').dot },
              OnHold: { bg: getStatusColor('On Hold').bg, text: getStatusColor('On Hold').text, dot: getStatusColor('On Hold').dot },
              Cancelled: { bg: getStatusColor('Cancelled').bg, text: getStatusColor('Cancelled').text, dot: getStatusColor('Cancelled').dot },
            }}
          />
          <span className="mx-4">|</span>
          <FilterButtons
            options={["Low", "Medium", "High", "Critical"]}
            selected={filters.priority}
            onChange={(priority) => setFilters({ ...filters, priority })}
            allLabel="All Priority"
            colorMap={{
              Low: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
              Medium: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
              High: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
              Critical: { bg: "bg-error-container", text: "text-error", dot: "bg-error" },
            }}
          />
        </div>
      </div>

     {/* 3-Column Layout */}
<div className="relative z-10 grid grid-cols-[25%_30%_45%] gap-5 h-[calc(100vh-200px)]">
  
  {/* Column 1: Milestones List (25%) */}
  <GlassCard className="p-4 flex flex-col overflow-hidden">
    <div className="mb-3 flex items-center justify-between shrink-0">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Milestones
      </h3>
      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
        {filteredMilestones.length}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
      {/* All Milestones Option */}
      <button
        onClick={() => setSelectedMilestoneId("")}
        className={`
          w-full text-left p-2.5 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-2
          ${!selectedMilestoneId
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "hover:bg-slate-50 text-slate-600"
          }
        `}
      >
        <span className="material-symbols-outlined text-lg">layers</span>
        <span className="text-sm">All Milestones</span>
        <span className="ml-auto text-[10px] text-slate-400">{filteredTasks.length}</span>
      </button>

      {/* Unassigned Tasks */}
      <button
        onClick={() => setSelectedMilestoneId("unassigned")}
        className={`
          w-full text-left p-2.5 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-2
          ${selectedMilestoneId === "unassigned"
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "hover:bg-slate-50 text-slate-600"
          }
        `}
      >
        <span className="material-symbols-outlined text-lg">link_off</span>
        <span className="text-sm">Unassigned</span>
        <span className="ml-auto text-[10px] text-slate-400">{unassignedTasks.length}</span>
      </button>

      <div className="my-2 border-t border-slate-100"></div>

      {/* Milestone Items */}
      {filteredMilestones.map((milestone) => {
        const mTasks = filteredTasks.filter(t => t.milestoneId === milestone.id);
        const isSelected = selectedMilestoneId === milestone.id;
        const progress = milestone.progressPercentage || 0;

        return (
  <button
    key={milestone.id}
    onClick={() => setSelectedMilestoneId(milestone.id)}
    className={`
      w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-200
      ${isSelected
        ? "bg-indigo-50 border border-indigo-200 shadow-sm"
        : "bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm"
      }
    `}
  >
    {/* Milestone Header */}
    <div className="flex items-start gap-2.5 mb-2">
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
        ${isSelected ? "bg-indigo-100" : "bg-slate-100"}
      `}>
        <span className={`material-symbols-outlined text-lg ${
          isSelected ? "text-indigo-600" : "text-slate-400"
        }`}>
          {milestone.status === "Completed" ? "check_circle" : "flag"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-sm font-semibold truncate ${
            isSelected ? "text-indigo-800" : "text-slate-700"
          }`}>
            {milestone.name}
          </span>
          {milestone.isCritical && (
            <span className="material-symbols-outlined text-sm text-red-500 shrink-0">priority_high</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={milestone.status} />
          {milestone.dueDate && (
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[10px]">calendar_today</span>
              {formatDate(milestone.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Progress Section */}
    <div className="ml-10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-slate-400 font-medium">Progress</span>
        <span className="text-[9px] font-bold text-slate-600">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            milestone.status === "Completed"
              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
              : milestone.isCritical
              ? "bg-gradient-to-r from-red-400 to-red-500"
              : "bg-gradient-to-r from-indigo-400 to-violet-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    {/* Task Count & Critical Badge */}
    <div className="ml-10 mt-2 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs text-slate-400">task_alt</span>
        <span className="text-[10px] text-slate-500 font-medium">
          {mTasks.length} task{mTasks.length !== 1 ? "s" : ""}
        </span>
      </div>
      {milestone.isCritical && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600 border border-red-100">
          <span className="w-1 h-1 rounded-full bg-red-500"></span>
          Critical
        </span>
      )}
    </div>
  </button>
);
      })}

      {filteredMilestones.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <span className="material-symbols-outlined text-2xl mb-2 block">flag</span>
          <p className="text-xs">No milestones</p>
        </div>
      )}
    </div>
  </GlassCard>

  {/* Column 2: Tasks List (35%) */}
  <GlassCard className="p-4 flex flex-col overflow-hidden">
    <div className="mb-3 flex items-center justify-between shrink-0">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Tasks
      </h3>
      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
        {selectedMilestoneId === "unassigned" 
          ? unassignedTasks.length 
          : selectedMilestoneId 
            ? milestoneTasks.length 
            : filteredTasks.length}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {(selectedMilestoneId === "unassigned" 
        ? unassignedTasks 
        : selectedMilestoneId 
          ? milestoneTasks 
          : filteredTasks
      ).map((task, index) => {
        const isSelected = selectedTaskId === task.id;
        const statusColors = getStatusColor(task.status);
        const assignedUsers = (task.assignees && task.assignees.length > 0)
          ? task.assignees.map(a => ({ id: a.userId, fullName: a.fullName ?? undefined }))
          : (task.assignedToUserId ? [{ id: task.assignedToUserId, fullName: task.assignedToUserName ?? undefined }] : []);
        const assignedUsersResolved = assignedUsers.map(u => {
          const matchedUser = users.find(usr => usr.id === u.id);
          return {
            id: u.id,
            fullName: u.fullName || (matchedUser?.fullName ?? undefined),
            profilePictureUrl: matchedUser?.profilePictureUrl ?? null,
          };
        });
        const proj = getProject(task.projectId);
        const dept = proj ? getProjectDepartments(proj, departments)[0] : null;

        return (
          <button
            key={task.id}
            onClick={() => setSelectedTaskId(task.id)}
            className={`
              w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-200
              ${isSelected
                ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                : "bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm"
              }
            `}
            style={{ animation: `slideIn 0.3s ease ${index * 0.03}s both` }}
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${statusColors.dot}`} />
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-sm text-slate-800 truncate">
                    {task.title}
                  </span>
                  {task.isOverdue && (
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded shrink-0">
                      Due
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500">
                  {proj && (
                    <span className="flex items-center gap-0.5 truncate">
                      <span className="material-symbols-outlined text-[10px]">folder</span>
                      {proj.name}
                    </span>
                  )}
                  {dept && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">business</span>
                      {dept.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusColors.dot}`}
                      style={{ width: `${task.progressPercentage || 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                    {task.progressPercentage || 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  {assignedUsersResolved.length > 0 ? (
                    <AvatarStack people={assignedUsersResolved} size="xs" />
                  ) : (
                    <span className="text-[9px] text-slate-400 italic">Unassigned</span>
                  )}
                  {task.dueDate && (
                    <span className="text-[9px] text-slate-400">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {((selectedMilestoneId === "unassigned" 
        ? unassignedTasks 
        : selectedMilestoneId 
          ? milestoneTasks 
          : filteredTasks
      ).length === 0) && (
        <div className="text-center py-12 text-slate-400">
          <span className="material-symbols-outlined text-3xl mb-2 block">
            {filters.search ? "search_off" : "task_alt"}
          </span>
          <p className="text-xs font-medium">
            {filters.search ? "No tasks found" : "No tasks"}
          </p>
          <p className="text-[10px] mt-1">
            {filters.search ? "Try adjusting your search" : "Select a milestone or create a task"}
          </p>
        </div>
      )}
    </div>
  </GlassCard>

  {/* Column 3: Task Detail (40%) */}
  <div className="overflow-hidden">
    {selectedTask ? (
      <TaskSubtaskDetails
        task={selectedTask}
        users={users}
        project={projects.find(p => p.id === selectedTask.projectId)}
        milestone={milestones.find(m => m.id === selectedTask.milestoneId)}
        recommendation={recommendation}
        delay={delay}
        isAdmin={canManageTasks}
        onStatusChange={(status, options) => handleStatusChange(selectedTask.id, status, options)}
        onEdit={() => setTaskModal({ open: true, editTask: selectedTask })}
        onUpdateProgress={(progress, notes) => handleUpdateProgress(selectedTask.id, progress, notes)}
        onAddComment={async (comment) => {
          if (!auth) return;
          await api.addTaskComment(auth.token, selectedTask.id, comment);
          setMessage("Comment added.");
          addToast("Comment added.");
        }}
        onStartTimer={async (description) => {
          if (!auth) return;
          await api.startTaskTimer(auth.token, selectedTask.id, description);
          setMessage("Timer started.");
          addToast("Timer started.");
        }}
        onRefresh={loadData}
        onEscalate={() => handleEscalate(selectedTask.id)}
        onMessage={setMessage}
      />
    ) : (
      <GlassCard className="p-10 h-full text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">task_alt</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Select a Task</h3>
        <p className="text-xs text-slate-400 ">
          Choose a task from the list to view details, update progress, and manage attachments
        </p>
      </GlassCard>
    )}
  </div>
</div>

      {/* Task Form Modal */}
      {taskModal.open && (
    <TaskFormModal
        open={taskModal.open}
        initialData={taskModal.editTask}
        projects={filteredProjects}
        departments={departments}
        milestones={filteredMilestones}
        users={users}
        onSubmit={handleTaskSubmit}
        onClose={() => setTaskModal({ open: false })}
    />
)}
    </div>
  );
}


