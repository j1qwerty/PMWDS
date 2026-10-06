import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type {
  BurnoutRiskRecord,
  Department,
  DelayPrediction,
  OrganizationRecord,
  Project,
  ProjectHealth,
  Task,
  User,
} from "../../types";
import { formatPercent, formatDate } from "../../ui";
import {
  useNavHeader,
  GlassCard,
  LoadingPage,
  OrganizationDepartmentFilter,
  PERMISSION_GROUPS,
  getProjectDepartmentIds,
  projectBelongsToDepartment,
  usePermission,
  useToast,
  InfoTip,
} from "../shared";
import { Icon } from "../../components/ui/Icon";
import { StatsCards } from "./StatsCards";
import { ProjectList } from "./ProjectList";
import { HealthCard } from "./HealthCard";
import { RiskPredictionCard } from "./RiskPredictionCard";
import { TimelinePredictions } from "./TimelinePredictions";
import { AIRecommendations } from "./AIRecommendations";
import { BurnoutPanel } from "./BurnoutPanel";
import { AIChatPanel } from "./AIChatPanel";
import { NeuralHeatmap } from "./NeuralHeatmap";
import { AnomalyFeed } from "./AnomalyFeed";
import { computeFallbackBurnout, computeHealth } from "./aiMetrics";
import type { ChatResponse } from "./chatTypes";

export function AIPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const { addToast } = useToast();
  const canViewOrganizations = perm.hasAny(PERMISSION_GROUPS.system.manage, PERMISSION_GROUPS.organization.view);
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [burnout, setBurnout] = useState<BurnoutRiskRecord[]>([]);
  const [burnoutIsFallback, setBurnoutIsFallback] = useState(false);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [healthIsFallback, setHealthIsFallback] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [escalated, setEscalated] = useState<Task[]>([]);
  const [delay, setDelay] = useState<DelayPrediction | null>(null);
  const [provider, setProvider] = useState("OpenRouter");
  const [model, setModel] = useState("");
  const [chatPrompt, setChatPrompt] = useState(
    "Summarize the highest operational risk in the current delivery portfolio."
  );
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);
  const [chatPending, setChatPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "AI Insights",
      description: "Health, risk, and workload analysis across your projects",
    });
  }, [setNavHeader]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getProjects(auth.token),
      api.getDepartments(auth.token),
      canViewOrganizations ? api.getOrganizations(auth.token) : Promise.resolve([]),
      api.getMyTasks(auth.token),
      api.getAISettings(auth.token),
    ])
      .then(([projectData, departmentData, organizationData, taskData, settings]) => {
        setProjects(projectData);
        setDepartments(departmentData);
        setOrganizations(organizationData);
        setProvider(settings.defaultProvider || "OpenRouter");
        setModel(settings.defaultModel || "");
        setSelectedProjectId((current) => current || projectData[0]?.id || "");
        if (taskData[0]) setSelectedTaskId(taskData[0].id);
      })
      .catch((e) => addToast(e instanceof Error ? e.message : "Failed to load AI page data", "error"))
      .finally(() => setLoading(false));
  }, [auth, canViewOrganizations, addToast]);

  // Users and the two task lists feed the fallback calculations, so they are
  // loaded once and reused rather than only when the AI calls fail.
  useEffect(() => {
    if (!auth) return;
    api.getUsers(auth.token).then(setUsers).catch(() => setUsers([]));
    api.getOverdueTasks(auth.token).then((t) => setOverdue(t as Task[])).catch(() => setOverdue([]));
    api.getEscalatedTasks(auth.token).then((t) => setEscalated(t as Task[])).catch(() => setEscalated([]));
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    api
      .getAiBurnoutRisk(auth.token, selectedDepartmentId || null)
      .then((rows) => {
        setBurnout(rows);
        setBurnoutIsFallback(false);
      })
      .catch(() => {
        setBurnoutIsFallback(true);
      });
  }, [auth, selectedDepartmentId]);

  const visibleDepartments = useMemo(() => {
    return selectedOrganizationId
      ? departments.filter((department) => department.organizationId === selectedOrganizationId)
      : departments;
  }, [departments, selectedOrganizationId]);

  const visibleProjects = useMemo(() => {
    if (selectedDepartmentId) {
      return projects.filter((project) => projectBelongsToDepartment(project, selectedDepartmentId));
    }

    if (selectedOrganizationId) {
      const departmentIds = new Set(visibleDepartments.map((department) => department.id));
      return projects.filter((project) =>
        getProjectDepartmentIds(project).some((departmentId) => departmentIds.has(departmentId))
      );
    }

    return projects;
  }, [projects, selectedDepartmentId, selectedOrganizationId, visibleDepartments]);

  useEffect(() => {
    if (selectedDepartmentId && !visibleDepartments.some((department) => department.id === selectedDepartmentId)) {
      setSelectedDepartmentId("");
      setSelectedProjectId("");
      return;
    }

    if (selectedProjectId && !visibleProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(visibleProjects[0]?.id ?? "");
    }
  }, [selectedDepartmentId, selectedProjectId, visibleDepartments, visibleProjects]);

  // Health. A failure is not an error state: the card falls back to the
  // calculated score, so record that and carry on.
  useEffect(() => {
    if (!auth || !selectedProjectId) {
      setHealth(null);
      return;
    }
    let cancelled = false;
    setHealthIsFallback(false);
    api
      .getAiProjectHealth(auth.token, selectedProjectId)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null);
          setHealthIsFallback(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [auth, selectedProjectId]);

  // The selected project's own task list: the heatmap and the fallback health
  // and risk figures are all built from it.
  const loadProjectTasks = useCallback(async () => {
    if (!auth || !selectedProjectId) {
      setProjectTasks([]);
      return;
    }
    setTasksLoading(true);
    try {
      const rows = await api.getTasksByProject(auth.token, selectedProjectId);
      setProjectTasks(rows);
    } catch {
      setProjectTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [auth, selectedProjectId]);

  useEffect(() => {
    void loadProjectTasks();
  }, [loadProjectTasks]);

  useEffect(() => {
    if (!auth || !selectedTaskId) {
      setDelay(null);
      return;
    }
    let cancelled = false;
    api
      .getTaskDelay(auth.token, selectedTaskId)
      .then((data) => {
        if (!cancelled) setDelay(data);
      })
      .catch(() => {
        if (!cancelled) setDelay(null);
      });
    return () => {
      cancelled = true;
    };
  }, [auth, selectedTaskId]);

  // When the burnout endpoint is unavailable, derive the same figures from the
  // live task list so the panel is never empty without explanation.
  // Declared before the memos below that depend on it.
  const selectedProject = visibleProjects.find((p) => p.id === selectedProjectId) ?? null;

  const effectiveBurnout = useMemo<BurnoutRiskRecord[]>(() => {
    if (burnout.length > 0) return burnout;
    if (!burnoutIsFallback || users.length === 0) return [];

    const scoped = selectedDepartmentId
      ? users.filter((u) => u.departmentId === selectedDepartmentId)
      : users;

    return computeFallbackBurnout(overdue.length > 0 ? [...overdue, ...escalated] : [], scoped).map((row) => ({
      ...row,
      recommendations: [],
    }));
  }, [burnout, burnoutIsFallback, users, selectedDepartmentId, overdue, escalated]);

  const aiOnline = !!health && !healthIsFallback;

  /**
   * The health score the cards show, resolved across all three states.
   *
   * `health` is null both while the AI request is in flight and when the
   * provider is unavailable, so reading it directly made the card say "No
   * project selected" on first paint and whenever AI was down - even though a
   * project was chosen and the Health card beside it was showing a real
   * calculated score.
   */
  const effectiveHealth = useMemo(() => {
    if (!selectedProject) return null;
    if (health) return health.overallHealthScore;
    // Fall back to the same calculation the Health card uses, so the two agree.
    if (!tasksLoading) return computeHealth(selectedProject, projectTasks).overall;
    return null;
  }, [selectedProject, health, projectTasks, tasksLoading]);

  const healthSource: "ai" | "calculated" | "loading" = !selectedProject
    ? "loading"
    : health
      ? "ai"
      : tasksLoading
        ? "loading"
        : "calculated";

  const handleChat = async () => {
    if (!auth) return;
    setChatPending(true);
    try {
      const result = await api.chat(auth.token, chatPrompt, provider, model);
      setChatResult(result);
    } catch (e) {
      // Surface the real reason. The previous handler replaced every failure
      // with "Failed to get AI response", which gave the user nothing to act on.
      setChatResult({
        message:
          e instanceof Error && e.message
            ? e.message
            : "The AI provider could not be reached. Check the API key, provider, and model in AI Settings.",
        intent: "error",
      });
    } finally {
      setChatPending(false);
    }
  };

  if (loading) return <LoadingPage label="Loading AI insights..." />;

  return (
    <div>
      <div className="relative z-10 mb-5">
        <OrganizationDepartmentFilter
          organizations={organizations}
          departments={departments}
          users={[]}
          selectedOrganizationId={selectedOrganizationId}
          selectedDepartmentId={selectedDepartmentId}
          onOrganizationChange={(organizationId) => {
            setSelectedOrganizationId(organizationId);
            setSelectedDepartmentId("");
            setSelectedProjectId("");
          }}
          onDepartmentChange={(departmentId) => {
            setSelectedDepartmentId(departmentId);
            setSelectedProjectId("");
          }}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6">
        {/* Left Sidebar: Projects (Agents) */}
        <div className="flex flex-col gap-5 lg:max-h-150">
          <ProjectList
            projects={visibleProjects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
          />

          <AnomalyFeed projects={visibleProjects} overdue={overdue} escalated={escalated} />
        </div>

        {/* Center: Main Content */}
        <div className="flex flex-col gap-5">
          <StatsCards
            healthScore={effectiveHealth}
            healthSource={healthSource}
            projectSelected={!!selectedProject}
            burnout={effectiveBurnout}
            delay={delay}
            tasks={projectTasks}
            aiOnline={aiOnline}
          />

          {/* Health & Risk Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HealthCard project={selectedProject} health={health} tasks={projectTasks} />
            <RiskPredictionCard project={selectedProject} health={health} tasks={projectTasks} />
          </div>

          <NeuralHeatmap project={selectedProject} tasks={projectTasks} loading={tasksLoading} />

          {/* Timeline & Recommendations Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TimelinePredictions projects={visibleProjects} />
            <AIRecommendations
              project={selectedProject}
              health={health}
              tasks={projectTasks}
              burnout={effectiveBurnout}
            />
          </div>

          <AIChatPanel
            chatPrompt={chatPrompt}
            setChatPrompt={setChatPrompt}
            chatResult={chatResult}
            onChat={handleChat}
            pending={chatPending}
            provider={provider}
            model={model}
          />
        </div>

        {/* Right Sidebar: Details & Burnout */}
        <div className="flex flex-col gap-5">
          {/* Task Delay Prediction */}
          {delay && (
            <GlassCard className="p-5 border border-amber-100/50">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon name="speed" size={18} className="text-amber-500 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-800 truncate">Delay Prediction</h4>
                </div>
                <InfoTip
                  title="Delay Prediction"
                  summary="The chance that one specific task will finish late, from 0% to 100%."
                  points={[
                    "The AI model weighs how much of the time budget is left against how much of the work is done.",
                    "It also counts how late the due date is, whether the task has already slipped, and whether the assignee is overloaded.",
                    "Risk Level is a plain-language band: Low, Medium, High, or Critical.",
                    "The factors listed are the specific reasons behind the number.",
                  ]}
                  note="Predicted completion is a straight-line estimate from today to the due date adjusted by the risk."
                />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Probability</span>
                    <span className="font-bold text-amber-600">{formatPercent(delay.delayProbability * 100)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full"
                      style={{ width: `${Math.min(delay.delayProbability * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-slate-500 shrink-0">Risk Level</span>
                  <span className="font-semibold text-slate-700 text-right truncate">{delay.riskLevel || "N/A"}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-slate-500 shrink-0">Expected Slip</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {delay.expectedDelayDays} day{delay.expectedDelayDays === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-slate-500 shrink-0">Predicted Completion</span>
                  <span className="font-semibold text-slate-700 text-right truncate">
                    {formatDate(delay.predictedCompletionDate)}
                  </span>
                </div>
                {delay.contributingFactors?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {delay.contributingFactors.map((factor: string) => (
                      <span
                        key={factor}
                        className="px-2 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          <BurnoutPanel burnout={effectiveBurnout} isFallback={burnoutIsFallback && burnout.length === 0} />
        </div>
      </div>
    </div>
  );
}
