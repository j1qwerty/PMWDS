import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, OrganizationRecord, Project, Task, User } from "../../types";
import { formatPercent } from "../../ui";
import { TaskFormModal } from "../tasks/TaskFormModal";
import {
    AnimatedBackground,
    GlassCard,
    GradientButton,
    LoadingPage,
    useNavHeader,
    ModalOverlay,
    DeleteConfirmationModal,
    getDepartmentColor,
    getStatusColor,
    useRoleAccess,
} from "../shared";
import { useUserOrganization } from "../shared/useUserOrganization";
import { MilestoneDetail } from "./MilestoneDetail";
// import { MilestoneList } from "./MilestoneList";
import { MilestoneFormModal } from "./MilestoneFormModal";

export function MilestonesPage() {
    const { auth } = useAuth();
    const access = useRoleAccess();
    const isAdmin = access.canManageMilestones;

    const [projects, setProjects] = useState<Project[]>([]);
    const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [taskModal, setTaskModal] = useState<{ open: boolean }>({ open: false });

    const { isOrgAdmin, userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);

    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; editMilestone?: Milestone }>({ open: false });
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; milestone: Milestone | null }>({ open: false, milestone: null });

    const { setNavHeader } = useNavHeader();

    useEffect(() => {
      setNavHeader({
        title: "Milestones",
        description: "Track project milestones, critical paths, and delivery progress",
        action: isAdmin && selectedProjectId ? {
          label: "New Milestone",
          onClick: () => setMilestoneModal({ open: true }),
          icon: "flag",
        } : undefined,
      });
    }, [setNavHeader, isAdmin, selectedProjectId]);

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
        }).catch((cause) => {
            setMessage(cause instanceof Error ? cause.message : "Failed to load data.");
        }).finally(() => setLoading(false));
    };

    const handleTaskSubmit = async (form: Record<string, unknown>) => {
        if (!auth) return;
        try {
            await api.createTask(auth.token, {
                ...form,
                milestoneId: selectedMilestoneId,
                projectId: selectedProjectId,
            });
            setMessage("Task created successfully.");
            setTaskModal({ open: false });
            // Reload tasks for the milestone
            if (selectedProjectId) {
                const taskData = await api.getTasksByProject(auth.token, selectedProjectId);
                setTasks(taskData);
            }
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Failed to create task"}`);
        }
    };

    useEffect(() => { loadData(); }, [auth]);

    useEffect(() => {
        if (shouldFilterByOrg && userOrganizationId && !selectedOrgId) {
            setSelectedOrgId(userOrganizationId);
        }
    }, [shouldFilterByOrg, userOrganizationId]);

    // Load milestones when project changes
    useEffect(() => {
        if (!auth || !selectedProjectId) {
            setMilestones([]);
            setTasks([]);
            return;
        }
        Promise.all([
            api.getMilestonesByProject(auth.token, selectedProjectId),
            api.getTasksByProject(auth.token, selectedProjectId),
        ]).then(([milestoneData, taskData]) => {
            setMilestones(milestoneData);
            setTasks(taskData);
            if (!selectedMilestoneId && milestoneData.length) {
                setSelectedMilestoneId(milestoneData[0].id);
            }
        }).catch((cause) => {
            setMessage(cause instanceof Error ? cause.message : "Failed to load milestones.");
        });
    }, [auth, selectedProjectId]);

    // Filtered data
    const filteredOrganizations = useMemo(() => {
        if (shouldFilterByOrg && userOrganizationId) {
            return organizations.filter(o => o.id === userOrganizationId);
        }
        return organizations;
    }, [organizations, shouldFilterByOrg, userOrganizationId]);

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

    const filteredProjects = useMemo(() => {
        let filtered = projects;

        if (shouldFilterByOrg && userOrganizationId) {
            const orgDeptIds = departments
                .filter(d => d.organizationId === userOrganizationId)
                .map(d => d.id);
            filtered = filtered.filter(p => orgDeptIds.includes(p.departmentId));
        }

        if (selectedOrgId) {
            const orgDeptIds = departments
                .filter(d => d.organizationId === selectedOrgId)
                .map(d => d.id);
            filtered = filtered.filter(p => orgDeptIds.includes(p.departmentId));
        }

        if (selectedDeptId) {
            filtered = filtered.filter(p => p.departmentId === selectedDeptId);
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.projectCode?.toLowerCase().includes(search)
            );
        }

        return filtered;
    }, [projects, selectedOrgId, selectedDeptId, searchTerm, departments, shouldFilterByOrg, userOrganizationId]);

    const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;
    const selectedMilestone = milestones.find(m => m.id === selectedMilestoneId) ?? null;

    const milestoneTasks = useMemo(() => {
        if (!selectedMilestoneId) return [];
        return tasks.filter(t => t.milestoneId === selectedMilestoneId);
    }, [tasks, selectedMilestoneId]);

    // Stats
    const completedMilestones = milestones.filter(m => m.status === "Completed").length;
    const criticalMilestones = milestones.filter(m => m.isCritical).length;
    const averageProgress = milestones.length
        ? milestones.reduce((sum, m) => sum + (m.progressPercentage || 0), 0) / milestones.length
        : 0;

    const handleMilestoneSubmit = async (form: Record<string, unknown>) => {
        if (!auth) return;
        try {
            if (milestoneModal.editMilestone) {
                await api.updateMilestone(auth.token, milestoneModal.editMilestone.id, form);
                setMessage("Milestone updated.");
            } else {
                await api.createMilestone(auth.token, { ...form, projectId: selectedProjectId });
                setMessage("Milestone created.");
            }
            setMilestoneModal({ open: false });
            // Reload milestones
            const milestoneData = await api.getMilestonesByProject(auth.token, selectedProjectId);
            setMilestones(milestoneData);
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
        }
    };

    const handleCompleteMilestone = async (milestoneId: string) => {
        if (!auth) return;
        try {
            await api.completeMilestone(auth.token, milestoneId);
            setMessage("Milestone completed.");
            const milestoneData = await api.getMilestonesByProject(auth.token, selectedProjectId);
            setMilestones(milestoneData);
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Action failed"}`);
        }
    };

    const handleDeleteMilestone = (milestone: Milestone) => {
        setDeleteConfirm({ open: true, milestone });
    };

    const handleConfirmDelete = async () => {
        if (!auth || !deleteConfirm.milestone) return;
        const milestoneId = deleteConfirm.milestone.id;
        const taskCount = tasks.filter(t => t.milestoneId === milestoneId).length;
        try {
            await api.deleteMilestone(auth.token, milestoneId);
            setMessage("Milestone deleted.");
            if (selectedMilestoneId === milestoneId) setSelectedMilestoneId("");
            setDeleteConfirm({ open: false, milestone: null });
            const milestoneData = await api.getMilestonesByProject(auth.token, selectedProjectId);
            setMilestones(milestoneData);
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
        }
    };

    if (loading) return <LoadingPage label="Loading milestones..." />;

    return (
        <div>
            <AnimatedBackground />



            {/* Message */}
            {message && (
                <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
                    <span className="material-symbols-outlined">check_circle</span>
                    {message}
                    <button
                        className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
                        onClick={() => setMessage("")}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Filters Section */}
            <div className="relative z-10 mb-5 space-y-3">
                {/* Organization Tabs - only for admin users */}
                {isOrgAdmin && (
                <div className="flex gap-2 overflow-x-auto pb-2 items-center">
                    <button
                        onClick={() => {
                            setSelectedOrgId("");
                            setSelectedDeptId("");
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
                    </button>
                    <div className="w-px h-8 bg-slate-200 self-center mx-1"></div>
                    {filteredOrganizations.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => {
                                setSelectedOrgId(org.id);
                                setSelectedDeptId("");
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
                        </button>
                    ))}
                </div>
                )}

                {/* Department & Search Row */}
                <div className="flex gap-3 items-center">
                    {/* Department Dropdown */}
                    <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 bg-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all min-w-[200px]"
                    >
                        <option value="">All Departments</option>
                        {filteredDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 max-w-[300px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-[13px] outline-none bg-white placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-[320px_1fr] gap-6 relative z-10">
                {/* Left Panel: Project & Milestone List */}
                <GlassCard className="p-4 max-h-[calc(100vh-340px)] flex flex-col">
                    <div className="mb-3 px-1">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {selectedProjectId ? "Milestones" : "Projects"}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                        {!selectedProjectId ? (
                            // Project List
                            <>
                                {filteredProjects.map((project, index) => {
                                    const projectMilestoneCount = milestones.length; // This will be 0 until a project is selected
                                    const isSelected = selectedProjectId === project.id;

                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => {
                                                setSelectedProjectId(project.id);
                                                setSelectedMilestoneId("");
                                            }}
                                            className={`
                        text-left p-3 rounded-xl cursor-pointer transition-all duration-200
                        ${isSelected
                                                    ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                                                    : "bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200"
                                                }
                      `}
                                            style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-100" : "bg-slate-100"
                                                    }`}>
                                                    <span className={`material-symbols-outlined text-lg ${isSelected ? "text-indigo-600" : "text-slate-400"
                                                        }`}>
                                                        rocket_launch
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-semibold text-sm text-slate-800 truncate block">
                                                        {project.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                        {project.projectCode || "No code"}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {filteredProjects.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-3 block">
                                            {searchTerm ? "search_off" : "folder_open"}
                                        </span>
                                        <p className="text-sm font-medium">No projects found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Milestone List
                            <>
                                {/* Back Button */}
                                <button
                                    onClick={() => {
                                        setSelectedProjectId("");
                                        setSelectedMilestoneId("");
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors mb-2"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Back to Projects
                                </button>

                                {/* Project Info */}
                                {selectedProject && (
                                    <div className="px-2 py-2 mb-2 bg-slate-50 rounded-lg">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</div>
                                        <div className="text-sm font-bold text-slate-800">{selectedProject.name}</div>
                                    </div>
                                )}

                                {milestones.map((milestone, index) => {
                                    const isSelected = selectedMilestoneId === milestone.id;
                                    const statusColors = getStatusColor(milestone.status);
                                    const progress = milestone.progressPercentage || 0;

                                    return (
                                        <button
                                            key={milestone.id}
                                            onClick={() => setSelectedMilestoneId(milestone.id)}
                                            className={`
                        text-left p-3 rounded-xl cursor-pointer transition-all duration-200
                        ${isSelected
                                                    ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                                                    : "bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200"
                                                }
                      `}
                                            style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${milestone.isCritical ? "bg-red-100" : "bg-slate-100"
                                                    }`}>
                                                    <span className={`material-symbols-outlined text-lg ${milestone.isCritical ? "text-red-500" : "text-slate-400"
                                                        }`}>
                                                        {milestone.status === "Completed" ? "check_circle" : "flag"}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-sm text-slate-800 truncate">
                                                            {milestone.name}
                                                        </span>
                                                        {milestone.isCritical && (
                                                            <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">
                                                                Critical
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${statusColors.dot}`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-medium ${statusColors.text}`}>
                                                            {milestone.status}
                                                        </span>
                                                        {milestone.dueDate && (
                                                            <span className="text-[10px] text-slate-400">
                                                                Due {new Date(milestone.dueDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {milestones.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-3 block">flag</span>
                                        <p className="text-sm font-medium">No milestones yet</p>
                                        <p className="text-xs mt-1">Create your first milestone for this project</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </GlassCard>

                {/* Right Panel: Milestone Detail */}
                <div className="flex flex-col gap-5">
                    {selectedMilestone ? (
                        <MilestoneDetail
                            milestone={selectedMilestone}
                            tasks={milestoneTasks}
                            project={selectedProject}
                            users={users}
                            onComplete={() => handleCompleteMilestone(selectedMilestone.id)}
                            onEdit={() => setMilestoneModal({ open: true, editMilestone: selectedMilestone })}
                            onDelete={() => handleDeleteMilestone(selectedMilestone)}
                            onAddTask={() => setTaskModal({ open: true })}
                            isAdmin={isAdmin}
                        />
                    ) : selectedProjectId ? (
                        // Stats Card when project is selected but no milestone
                        <GlassCard className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                <StatCard label="Total Milestones" value={milestones.length} color="indigo" />
                                <StatCard label="Completed" value={completedMilestones} color="emerald" />
                                <StatCard label="Critical" value={criticalMilestones} color="rose" />
                                <StatCard label="Avg Progress" value={`${Math.round(averageProgress)}%`} color="amber" />
                            </div>

                            <div className="text-center py-12">
                                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 mx-auto">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">flag</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Milestone</h3>
                                <p className="text-sm text-slate-400  mx-auto">
                                    Choose a milestone from the left panel to view its details and associated tasks
                                </p>
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard className="p-16 text-center flex flex-col items-center justify-center flex-1 min-h-96">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-4xl text-slate-400">rocket_launch</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Project</h3>
                            <p className="text-sm text-slate-400 ">
                                Choose a project from the left panel to view its milestones and track progress
                            </p>
                        </GlassCard>
                    )}
                </div>
            </div>

            {/* Milestone Form Modal */}
            {milestoneModal.open && (
                <MilestoneFormModal
                    open={milestoneModal.open}
                    initialData={milestoneModal.editMilestone}
                    projectId={selectedProjectId}
                    onSubmit={handleMilestoneSubmit}
                    onClose={() => setMilestoneModal({ open: false })}
                />
            )}

            {taskModal.open && (
                <TaskFormModal
                    open={taskModal.open}
                    projects={projects.filter(p => p.id === selectedProjectId)}
                    milestones={milestones.filter(m => m.id === selectedMilestoneId)}
                    users={users}
                    defaultProjectId={selectedProjectId}
                    defaultMilestoneId={selectedMilestoneId}
                    onSubmit={handleTaskSubmit}
                    onClose={() => setTaskModal({ open: false })}
                />
            )}

            {deleteConfirm.open && deleteConfirm.milestone && (
                <ModalOverlay onClose={() => setDeleteConfirm({ open: false, milestone: null })}>
                    <DeleteConfirmationModal
                        name={deleteConfirm.milestone.name}
                        warning={(() => {
                            const taskCount = tasks.filter(t => t.milestoneId === deleteConfirm.milestone!.id).length;
                            return taskCount > 0
                                ? `This milestone has ${taskCount} task${taskCount === 1 ? "" : "s"} associated with it. Deleting it will also remove all associated tasks.`
                                : undefined;
                        })()}
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setDeleteConfirm({ open: false, milestone: null })}
                    />
                </ModalOverlay>
            )}
        </div>
    );
}

// Helper Component
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
