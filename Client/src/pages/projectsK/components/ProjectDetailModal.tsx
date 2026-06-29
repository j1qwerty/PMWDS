import { useCallback, useState } from "react";
import type { Milestone, MilestoneDependency, Project, User } from "../../../types";
import { api } from "../../../api";
import { ModalOverlay } from "../../shared";
import { formatMoney } from "../../../ui";
import { AIInsightsSection } from "./AIInsightsSection";
import { DocumentsSection } from "./DocumentsSection";
import { ProjectBasicDetails } from "./ProjectBasicDetails";

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
  dependencies?: MilestoneDependency[];
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
  dependencies = [],
}: ProjectDetailModalProps) {
  const [pendingWarning, setPendingWarning] = useState<{
    incompleteCount: number;
    totalCount: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "dependencies" | "documents">("documents");

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
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Project Basic Details */}
          <ProjectBasicDetails
            project={project}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={handleStatusChange}
            users={users}
            milestonesCount={milestones.length}
            bare
            pendingWarning={pendingWarning}
            setPendingWarning={setPendingWarning}
            handleForceComplete={handleForceComplete}
          />

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("ai")}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === "ai"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  AI Insights
                </span>
              </button>
              <button
                onClick={() => setActiveTab("dependencies")}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === "dependencies"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">account_tree</span>
                  Dependencies
                </span>
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === "documents"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Documents
                </span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === "ai" ? (
              <AIInsightsSection
                project={project}
                progress={progress}
                healthScore={healthScore}
                delayRisk={delayRisk}
                manager={manager}
                formatMoney={formatMoney}
              />
            ) : activeTab === "dependencies" ? (
              <DependenciesSection dependencies={dependencies} milestones={milestones} />
            ) : (
              <DocumentsSection
                projectId={project.id}
                authToken={authToken}
              />
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function DependenciesSection({ dependencies, milestones }: { dependencies: MilestoneDependency[]; milestones: Milestone[] }) {
  if (dependencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400">
        <span className="material-symbols-outlined text-5xl mb-3">account_tree</span>
        <p className="text-sm font-medium text-slate-500">No dependencies defined</p>
        <p className="text-xs mt-1">Go to the Dependencies page to add milestone dependency rules.</p>
      </div>
    );
  }

  const metCount = dependencies.filter((d) => d.isMet).length;
  const unmetCount = dependencies.filter((d) => !d.isMet).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <span className="material-symbols-outlined text-base">account_tree</span>
          {dependencies.length} total
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {metCount} met
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
          <span className="material-symbols-outlined text-base">block</span>
          {unmetCount} unmet
        </div>
      </div>

      <div className="space-y-2">
        {dependencies.map((dep) => {
          const prereqName = dep.prerequisiteMilestoneName || milestones.find((m) => m.id === dep.prerequisiteMilestoneId)?.name || "Unknown";
          const depName = dep.dependentMilestoneName || milestones.find((m) => m.id === dep.dependentMilestoneId)?.name || "Unknown";
          return (
            <div key={dep.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                dep.isMet ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                <span className={`material-symbols-outlined text-sm ${
                  dep.isMet ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {dep.isMet ? "check_circle" : "block"}
                </span>
              </div>
              <div className="text-xs flex-1">
                <span className="font-medium text-slate-700">{prereqName}</span>
                <span className="material-symbols-outlined text-sm text-slate-400 mx-1">arrow_forward</span>
                <span className="font-medium text-slate-700">{depName}</span>
                <span className="ml-2 text-[10px] text-slate-400">
                  {dep.type === "CompletionBased" ? "(must complete)" : `(reach ${dep.thresholdPercentage}%)`}
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                dep.isMet ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {dep.isMet ? "Met" : "Unmet"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizePercent(value?: number | null) {
  if (value == null) return null;
  return Math.min(Math.round(value > 1 ? value : value * 100), 100);
}