import { useCallback, useEffect, useState } from "react";
import type { Milestone, Project, ProjectDocument, User } from "../../../types";
import { api } from "../../../api";
import { Avatar, ModalOverlay } from "../../shared";
import { ProjectHeaderCard } from "./ProjectHeaderCard";
import { formatMoney } from "../../../ui";

interface ProjectDetailModalProps {
  project: Project | null;
  canManage: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  authToken?: string | null;
  users?: User[];
  milestones?: Milestone[];
}

export function ProjectDetailModal({
  project,
  canManage,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  authToken,
  users = [],
  milestones = [],
}: ProjectDetailModalProps) {
  const [pendingWarning, setPendingWarning] = useState<{
    incompleteCount: number;
    totalCount: number;
  } | null>(null);

  const handleStatusChange = useCallback((status: string) => {
    if (status === "Completed" && milestones.length > 0) {
      const incomplete = milestones.filter((m) => m.status !== "Completed");
      if (incomplete.length > 0) {
        setPendingWarning({
          incompleteCount: incomplete.length,
          totalCount: milestones.length,
        });
        return;
      }
    }
    onStatusChange?.(status);
  }, [milestones, onStatusChange]);

  const handleForceComplete = useCallback(async () => {
    if (!authToken || !pendingWarning || !onStatusChange) return;
    setPendingWarning(null);
    const incomplete = milestones.filter((m) => m.status !== "Completed");
    await Promise.allSettled(
      incomplete.map((m) => api.completeMilestone(authToken, m.id, true))
    );
    onStatusChange("Completed");
  }, [authToken, milestones, onStatusChange, pendingWarning]);

  if (!project) return null;

  const healthScore = normalizePercent(project.aiHealthScore);
  const delayRisk = normalizePercent(project.aiDelayRiskScore);
  const progress = project.progressPercentage || 0;
  const manager = users.find((user) => user.id === project.projectManagerId);

  return (
    <ModalOverlay onClose={onClose} widthClassName="max-w-4xl">
      <div className="bg-white rounded-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {/* <span className="text-[10px] font-bold tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{project.id}</span> */}
            <h2 className="text-lg font-bold text-slate-900">Project Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Project Header Card */}
          <ProjectHeaderCard
            project={project}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={handleStatusChange}
            bare
          />

          {/* Incomplete milestones warning */}
          {pendingWarning && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0">warning</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Incomplete milestones detected</p>
                  <p className="text-xs text-amber-700 mt-1">
                    <strong>{pendingWarning.incompleteCount}</strong> of <strong>{pendingWarning.totalCount}</strong> milestone(s) in this project are not completed.
                    Continuing will mark all milestones as completed at 100% progress.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleForceComplete}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                    >
                      Yes, complete all
                    </button>
                    <button
                      onClick={() => setPendingWarning(null)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">auto_awesome</span>
              AI Insights
            </h3>

            <AIInsightBadges insights={[]} />

            <OverallProgressRing progress={progress} project={project} delayRisk={delayRisk} />

            <MetricsGrid
              project={project}
              healthScore={healthScore}
              delayRisk={delayRisk}
              formatMoney={formatMoney}
              manager={manager}
            />

            <ProjectHealthMatrix project={project} />
          </div>

          {/* Documents Section */}
          <DocumentsSection
            projectId={project.id}
            authToken={authToken}
          />
        </div>
      </div>
    </ModalOverlay>
  );
}

function normalizePercent(value?: number | null) {
  if (value == null) return null;
  return Math.min(Math.round(value > 1 ? value : value * 100), 100);
}

function AIInsightBadges({ insights }: { insights: string[] }) {
  type BadgeColor = "indigo" | "emerald" | "amber";

  const defaultInsights: { label: string; icon: string; color: BadgeColor }[] = [
    { label: "AI Insight: Optimized Path", icon: "bolt", color: "indigo" },
    { label: "Resource Efficiency High", icon: "verified", color: "emerald" },
    { label: "AI Insight: On Pace", icon: "auto_awesome", color: "amber" },
  ];

  const items = insights.length > 0
    ? insights.map((i) => ({ label: i, icon: "bolt", color: "indigo" as BadgeColor }))
    : defaultInsights;

  const colorMap: Record<BadgeColor, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${colorMap[item.color]}`}
        >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <span className="text-xs font-bold tracking-wide uppercase">{item.label}</span>
          </div>
        ))}
    </div>
  );
}

function OverallProgressRing({ progress, project, delayRisk }: { progress: number; project: Project; delayRisk: number | null }) {
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        <div className="flex justify-center items-center flex-col">
          <div className="relative size-32 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 128 128">
              <circle className="stroke-slate-100" cx="64" cy="64" fill="none" r="56" strokeWidth="8" />
              <circle
                className="stroke-indigo-500 transition-all duration-700"
                cx="64" cy="64" fill="none" r="56"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                strokeWidth="8"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-800">{Math.round(progress)}%</span>
              <span className="text-[10px] text-slate-400 font-medium">Complete</span>
            </div>
          </div>
          <span className="text-[10px] text-indigo-500 font-normal mt-1">Auto-calculated from milestones</span>
        </div>
        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Budget Utilized</div>
            <div className="text-lg font-bold text-slate-800 mb-1">
              {formatMoney(project.actualCost)}
              <span className="text-sm text-slate-400 font-normal"> / {formatMoney(project.plannedBudget)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full"
                style={{ width: `${project.plannedBudget ? Math.min((project.actualCost ?? 0) / project.plannedBudget * 100, 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Delay Risk</div>
            <div className={`text-lg font-bold mb-1 ${delayRisk && delayRisk > 50 ? "text-orange-600" : "text-emerald-600"}`}>
              {delayRisk != null ? `${delayRisk}%` : "\u2014"}
            </div>
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_down</span>
              {delayRisk && delayRisk < 30 ? "Low risk" : "Moderate risk"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsGrid({
  project,
  healthScore,
  delayRisk,
  formatMoney,
  manager,
}: {
  project: Project;
  healthScore: number | null;
  delayRisk: number | null;
  formatMoney: (amount: number) => string;
  manager?: User;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Budget</span>
        <span className="text-lg font-bold text-slate-800">{formatMoney(project.plannedBudget)}</span>
        <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
          <div className="bg-indigo-500 w-[65%] h-full rounded-full" />
        </div>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual Cost</span>
        <span className="text-lg font-bold text-slate-800">{formatMoney(project.actualCost)}</span>
        {project.actualCost != null && project.plannedBudget != null && (
          <span className="text-[10px] text-emerald-600 font-bold mt-1">
            {Math.round((project.actualCost / project.plannedBudget) * 100)}% of budget
          </span>
        )}
      </div>
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delay Risk</span>
        <span className={`text-lg font-bold ${delayRisk && delayRisk > 50 ? "text-orange-600" : "text-emerald-600"}`}>
          {delayRisk != null ? `${delayRisk}%` : "\u2014"}
        </span>
        <span className="text-[10px] text-slate-500 font-medium mt-1">Buffer: \u2014</span>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Health</span>
        <span className="text-lg font-bold text-slate-800">{healthScore != null ? `${healthScore}%` : "\u2014"}</span>
        <span className="text-[10px] text-indigo-600 font-bold mt-1">AI assessed</span>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Manager</span>
        <div className="mt-1 flex items-center gap-2">
          {manager ? (
            <Avatar person={manager} size="sm" />
          ) : (
            <span className="material-symbols-outlined text-slate-400">account_circle</span>
          )}
          <span className="text-sm font-semibold text-slate-800 truncate">
            {manager?.fullName || project.projectManagerName || "Unassigned"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectHealthMatrix({ project }: { project: Project }) {
  const calculateDummyHealth = () => {
    const pct = project.progressPercentage || 0;
    const risk = project.aiDelayRiskScore || 0;
    const budgetRatio = project.plannedBudget
      ? (project.actualCost || 0) / project.plannedBudget
      : 0;

    return [
      {
        label: "Schedule",
        value: Math.max(0, Math.min(1, (pct / 100) * 0.7 + (1 - risk) * 0.3)),
      },
      {
        label: "Budget",
        value: Math.max(0, Math.min(1, budgetRatio <= 1 ? 1 - budgetRatio * 0.5 : Math.max(0, 1.5 - budgetRatio))),
      },
      { label: "Team", value: 0.75 },
      {
        label: "Quality",
        value: Math.max(0, Math.min(1, pct > 0 ? 0.5 + pct / 200 : 0.5)),
      },
    ];
  };

  const metrics = calculateDummyHealth();

  const getHealthColor = (value: number) => {
    if (value >= 0.8) return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-500", label: "Good" };
    if (value >= 0.6) return { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-400", label: "Fair" };
    return { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-500", label: "Poor" };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-600 text-[18px]">health_metrics</span>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Health Matrix</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((item, idx) => {
          const healthColor = getHealthColor(item.value);
          return (
            <div key={item.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 relative">
              {idx === 0 && (
                <div className="absolute -top-2 -right-2">
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Estimated</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <div className={`size-2 rounded-full ${healthColor.dot}`} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-800">{Math.round(item.value * 100)}%</span>
                <span className={`text-[10px] font-medium ${healthColor.text}`}>{healthColor.label}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${healthColor.bg}`}
                  style={{ width: `${item.value * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <span className="material-symbols-outlined text-amber-600 text-[16px]">auto_awesome</span>
        <p className="text-[11px] text-amber-700">
          <span className="font-semibold">AI Health Metrics Coming Soon</span> Currently showing estimates based on project progress, budget, and timeline data.
        </p>
      </div>
    </div>
  );
}

function DocumentsSection({ projectId, authToken }: { projectId: string; authToken?: string | null }) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDocuments = () => {
    if (!authToken || !projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getProjectDocuments(authToken, projectId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, [authToken, projectId]);

  const handleFileUpload = async () => {
    if (!authToken || !uploadFile) return;
    await api.uploadProjectDocument(authToken, projectId, uploadFile);
    setUploadFile(null);
    fetchDocuments();
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
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">description</span>
          Documents
        </h3>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200">
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          Upload Document
          <input
            type="file"
            className="hidden"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* File preview */}
      {uploadFile && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-indigo-600">description</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{uploadFile.name}</p>
              <p className="text-[11px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setUploadFile(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFileUpload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined text-slate-400 animate-spin">progress_activity</span>
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3 hover:bg-slate-100/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(doc.fileSizeBytes)} &middot;{" "}
                    {new Date(doc.createdDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
                className="size-9 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-white transition-colors disabled:opacity-50 shrink-0"
                title="Download"
              >
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                  {downloadingId === doc.id ? "hourglass_top" : "download"}
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <span
              className="material-symbols-outlined text-slate-400 text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              folder_open
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">No documents uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload project documents, specs, or reports.</p>
        </div>
      )}
    </div>
  );
}
