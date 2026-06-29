// components/MilestonesTab.tsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Milestone, MilestoneDependency, Task, ProjectDocument } from "../../types";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { useToast } from "./Toast";

interface MilestonesTabProps {
  projectId: string;
  authToken?: string;
}

export function MilestonesTab({ projectId, authToken }: MilestonesTabProps) {
  const [activeTab, setActiveTab] = useState<"milestones" | "documents">("milestones");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [dependencies, setDependencies] = useState<MilestoneDependency[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { addToast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const fetchData = () => {
    if (!authToken || !projectId) return;
    
    setLoading(true);
    Promise.allSettled([
      api.getMilestonesByProject(authToken, projectId),
      api.getTasksByProject(authToken, projectId),
      api.getProjectDocuments(authToken, projectId),
      api.getMilestoneDependencies(authToken, projectId),
    ]).then(([milestoneResult, taskResult, docResult, depResult]) => {
      if (milestoneResult.status === "fulfilled") {
        setMilestones(milestoneResult.value);
      }
      if (taskResult.status === "fulfilled") {
        setTasks(taskResult.value);
      }
      if (docResult.status === "fulfilled") {
        setDocuments(docResult.value);
      }
      if (depResult.status === "fulfilled") {
        setDependencies(depResult.value);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    setActiveTab("milestones");
    fetchData();
  }, [authToken, projectId]);

  const tasksByMilestone = tasks.reduce((acc, task) => {
    const key = task.milestoneId || "standalone";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getMilestoneProgress = (milestoneId: string) => {
    const milestoneTasks = tasksByMilestone[milestoneId] || [];
    if (milestoneTasks.length === 0) return 0;
    const completed = milestoneTasks.filter(t => t.status === "Completed").length;
    return Math.round((completed / milestoneTasks.length) * 100);
  };

  const handleFileUpload = async () => {
    if (!authToken || !uploadFile) return;
    try {
      await api.uploadProjectDocument(authToken, projectId, uploadFile);
      setUploadFile(null);
      addToast("Document uploaded successfully");
      fetchData();
    } catch (error) {
      addToast("Failed to upload document", "error");
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!authToken) return;
    setDownloadingId(doc.id);
    try {
      const blob = await api.downloadProjectDocument(authToken, projectId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addToast("Failed to download document", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleMilestoneExpansion = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
  };

  const handleTaskComplete = async (taskId: string) => {
    if (!authToken) return;
    setCompletingTasks(prev => new Set([...prev, taskId]));
    try {
      await api.updateTask(authToken, taskId, { status: "Completed" });
      fetchData();
    } catch (error) {
      addToast("Failed to update task", "error");
    } finally {
      setCompletingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      Completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
      InProgress: { bg: "bg-blue-50", text: "text-blue-700" },
      Pending: { bg: "bg-slate-50", text: "text-slate-700" },
      Delayed: { bg: "bg-rose-50", text: "text-rose-700" },
    };
    return colors[status] || colors.Pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-rose-100 text-rose-700",
      Medium: "bg-amber-100 text-amber-700",
      Low: "bg-slate-100 text-slate-700",
    };
    return colors[priority] || colors.Low;
  };

  return (
    <div className="mt-8">
      {/* Tabs Header */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("milestones")}
            className={`
              px-6 py-3 text-sm font-semibold transition-all duration-200
              ${activeTab === "milestones" 
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" 
                : "text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:bg-slate-50"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">flag</span>
              Milestones
              {milestones.length > 0 && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {milestones.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`
              px-6 py-3 text-sm font-semibold transition-all duration-200
              ${activeTab === "documents" 
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" 
                : "text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:bg-slate-50"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">description</span>
              Documents
              {documents.length > 0 && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>


      {/* Milestones Tab Content */}
      {activeTab === "milestones" && (
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading milestones...</p>
              </div>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-400">flag</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No Milestones Yet</h3>
              <p className="text-xs text-slate-500">Create milestones to track project progress and organize tasks.</p>
            </div>
          ) : (
            <>
              {dependencies.length > 0 && (
                <div className="flex items-center gap-3 mb-4 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">account_tree</span>
                    Dependencies
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dependencies.length}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {dependencies.filter(d => d.isMet).length} met
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {dependencies.filter(d => !d.isMet).length} unmet
                  </span>
                </div>
              )}
            <div className="relative pl-8 ml-4 border-l-2 border-slate-200">
              <div className="space-y-8">
                {milestones.map((milestone) => {
                  const milestoneTasks = tasksByMilestone[milestone.id] || [];
                  const isCompleted = milestone.status === "Completed";
                  const progress = getMilestoneProgress(milestone.id);
                  const isExpanded = expandedMilestones.has(milestone.id);
                  const statusColor = getStatusColor(milestone.status);

                  return (
                    <div key={milestone.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className={`
                        absolute w-4 h-4 rounded-full -left-[41px] top-6
                        border-2 border-white ring-2 transition-all duration-300
                        ${isCompleted 
                          ? "bg-emerald-500 ring-emerald-200" 
                          : "bg-indigo-600 ring-indigo-200"
                        }
                      `}>
                        {isCompleted && (
                          <span className="material-symbols-outlined text-white text-xs absolute inset-0 flex items-center justify-center">
                            check
                          </span>
                        )}
                      </div>

                      {/* Milestone card */}
                      <div className={`
                        bg-white rounded-xl border transition-all duration-200 hover:shadow-md
                        ${isCompleted 
                          ? "border-emerald-200 bg-emerald-50/30" 
                          : "border-slate-200"
                        }
                      `}>
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`
                                  px-2.5 py-1 rounded-lg text-xs font-semibold
                                  ${statusColor.bg} ${statusColor.text}
                                `}>
                                  {/* {milestone.status} */}
                                </span>
                               
                              </div>
                              <h3 className="text-lg font-bold text-slate-900 mb-1">
                                {milestone.name}
                                {milestone.isBlocked && (
                                  <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded" title={milestone.blockedByMessage || ""}>
                                    🔒 Blocked
                                  </span>
                                )}
                              </h3>
                              {milestone.isBlocked && milestone.blockedByMessage && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">warning</span>
                                  {milestone.blockedByMessage}
                                </p>
                              )}
                              {milestone.description && (
                                <p className="text-sm text-slate-600 line-clamp-2">{milestone.description}</p>
                              )}
                            </div>
                            <StatusBadge status={milestone.status} />
                             {milestone.isCritical && (
                                  <span className="mx-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700">
                                    Critical
                                  </span>
                                )}
                          </div>

                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-medium text-slate-500">
                                {milestoneTasks.length} task{milestoneTasks.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  progress === 100 ? "bg-emerald-500" :
                                  progress >= 75 ? "bg-amber-400" :
                                  progress >= 50 ? "bg-cyan-400" :
                                  progress >= 25 ? "bg-rose-400" : "bg-slate-300"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Tasks toggle button */}
                          {milestoneTasks.length > 0 && (
                            <button
                              onClick={() => toggleMilestoneExpansion(milestone.id)}
                              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg transition-transform duration-200"
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                              >
                                chevron_right
                              </span>
                              {isExpanded ? 'Hide' : 'Show'} Tasks ({milestoneTasks.length})
                            </button>
                          )}

                          {/* Expanded tasks */}
                          {isExpanded && milestoneTasks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                              {milestoneTasks.map((task) => {
                                const taskDone = task.status === "Completed";
                                const isCompleting = completingTasks.has(task.id);

                                return taskDone ? (
                                  <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                      <span className="text-sm text-slate-500 line-through">{task.title}</span>
                                    </div>
                                    {task.assignedToUserName && (
                                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 ring-2 ring-white">
                                        {task.assignedToUserName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div key={task.id} className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => handleTaskComplete(task.id)}
                                          disabled={isCompleting}
                                          className="relative flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 hover:border-indigo-500 transition-colors"
                                        >
                                          {isCompleting && (
                                            <div className="absolute inset-0 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                          )}
                                        </button>
                                        <div>
                                          <span className="text-sm font-medium text-slate-900">{task.title}</span>
                                          {task.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pl-8">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                            style={{ width: `${task.progressPercentage || 0}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">
                                          {task.progressPercentage || 0}%
                                        </span>
                                      </div>
                                      {task.assignedToUserName && (
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 ring-2 ring-white ml-3">
                                          {task.assignedToUserName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* Documents Tab Content */}
      {activeTab === "documents" && (
        <div className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Documents</h3>
                <p className="text-sm text-slate-500 mt-1">Manage project-related files and documents</p>
              </div>
              <label className="
                inline-flex items-center gap-2 px-4 py-2.5 
                bg-indigo-600 text-white text-sm font-semibold 
                rounded-xl hover:bg-indigo-700 transition-colors 
                cursor-pointer shadow-sm
              ">
                <span className="material-symbols-outlined text-lg">upload_file</span>
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {/* Upload preview */}
            {uploadFile && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-600">description</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{uploadFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(uploadFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUploadFile(null)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFileUpload}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents list */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length > 0 ? (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-indigo-600 text-xl">description</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">{formatFileSize(doc.fileSizeBytes)}</span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-500">
                              {new Date(doc.createdDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="
                          p-2 rounded-lg text-slate-400 hover:text-indigo-600 
                          hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        title="Download"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {downloadingId === doc.id ? "hourglass_top" : "download"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">folder_open</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">No Documents Yet</h3>
                <p className="text-xs text-slate-500">Upload project documents, specifications, or reports.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}