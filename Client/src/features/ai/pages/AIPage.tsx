import { useDeferredValue, useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice } from "../../../ui";
import type {
  AIModel,
  AIModelRecord,
  AIProvider,
  AIProviderTestResult,
  AllocationRecommendationRecord,
  AssigneeRecommendation,
  BurnoutRiskRecord,
  ChatResponse,
  DelayPrediction,
  DelayPredictionRecord,
  PredictionResultRecord,
  Project,
  ProjectHealth,
  ResourceOptimizationRecord,
  Task,
  TaskAnalysisRecord,
  TrainingDataPointRecord,
} from "../../../types";
import { AIAdminPanel } from "../components/AIAdminPanel";
import { AIModelFormDialog } from "../components/AIModelFormDialog";
import { AIPredictionsPanel } from "../components/AIPredictionsPanel";
import { AIProviderPanel } from "../components/AIProviderPanel";
import { AIRecommendationsPanel } from "../components/AIRecommendationsPanel";
import { TrainingDataFormDialog } from "../components/TrainingDataFormDialog";

export function AIPage() {
  const { auth } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [provider, setProvider] = useState("OpenAI");
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const deferredSearch = useDeferredValue(modelSearch);
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState<AIProviderTestResult | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [chatPrompt, setChatPrompt] = useState("Summarize the current delivery risk posture.");
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);
  const [burnout, setBurnout] = useState<BurnoutRiskRecord[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [resourcePlan, setResourcePlan] = useState<ResourceOptimizationRecord | null>(null);
  const [delay, setDelay] = useState<DelayPrediction | null>(null);
  const [recommendation, setRecommendation] = useState<AssigneeRecommendation | null>(null);
  const [generatedRecommendation, setGeneratedRecommendation] = useState<AllocationRecommendationRecord | null>(null);
  const [recommendationHistory, setRecommendationHistory] = useState<AllocationRecommendationRecord[]>([]);
  const [taskAnalysis, setTaskAnalysis] = useState<TaskAnalysisRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Capacity conflict");
  const [explanation, setExplanation] = useState("");
  const [generatedPrediction, setGeneratedPrediction] = useState<DelayPredictionRecord | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<DelayPredictionRecord[]>([]);
  const [projectPredictions, setProjectPredictions] = useState<DelayPredictionRecord[]>([]);
  const [predictionResults, setPredictionResults] = useState<PredictionResultRecord[]>([]);
  const [aiModels, setAiModels] = useState<AIModelRecord[]>([]);
  const [trainingData, setTrainingData] = useState<TrainingDataPointRecord[]>([]);
  const [performance, setPerformance] = useState<Record<string, number>>({});
  const [editingModel, setEditingModel] = useState<AIModelRecord | null>(null);
  const [deletingModel, setDeletingModel] = useState<AIModelRecord | null>(null);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshAdmin = () => {
    if (!auth) return Promise.resolve();
    return Promise.all([
      api.getAiModels(auth.token),
      api.getTrainingData(auth.token),
      api.getPredictionResults(auth.token),
      api.getModelPerformance(auth.token),
    ]).then(([modelData, trainingDataPoints, predictionResultData, performanceData]) => {
      setAiModels(modelData);
      setTrainingData(trainingDataPoints);
      setPredictionResults(predictionResultData);
      setPerformance(performanceData);
    });
  };

  useEffect(() => {
    if (!auth) return;
    Promise.all([
      api.getAiProviders(auth.token),
      api.getProjects(auth.token),
      api.getMyTasks(auth.token),
      api.getAiBurnoutRisk(auth.token),
      refreshAdmin(),
    ])
      .then(([providerData, projectData, taskData, burnoutData]) => {
        setProviders(providerData);
        setProjects(projectData);
        setTasks(taskData);
        setBurnout(burnoutData);
        setProvider(providerData[0]?.provider ?? "OpenAI");
        setSelectedProjectId(projectData[0]?.id ?? "");
        setSelectedTaskId(taskData[0]?.id ?? "");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Failed to load AI workspace."))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!auth || !provider) return;
    api.searchAiModels(auth.token, provider, deferredSearch).then((data) => {
      setModels(data);
      setSelectedModel((current) => current || data[0]?.id || "");
    });
  }, [auth, provider, deferredSearch]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    Promise.all([
      api.getAiProjectHealth(auth.token, selectedProjectId),
      api.getAiInsights(auth.token, selectedProjectId),
    ]).then(([healthData, insightData]) => {
      setHealth(healthData);
      setInsights(insightData);
    });
  }, [auth, selectedProjectId]);

  useEffect(() => {
    if (!auth || !selectedTaskId) return;
    Promise.all([
      api.getTaskDelay(auth.token, selectedTaskId),
      api.getRecommendationHistory(auth.token, selectedTaskId),
      api.getPredictionHistory(auth.token, selectedTaskId),
    ]).then(([delayData, recommendationData, predictionData]) => {
      setDelay(delayData);
      setRecommendationHistory(recommendationData);
      setPredictionHistory(predictionData);
    });
  }, [auth, selectedTaskId]);

  if (loading) return <LoadingPanel label="Loading AI workspace..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <AIProviderPanel
        providers={providers}
        provider={provider}
        models={models}
        selectedModel={selectedModel}
        modelSearch={modelSearch}
        projects={projects}
        selectedProjectId={selectedProjectId}
        projectHealth={health}
        projectInsights={insights}
        resourcePlan={resourcePlan}
        chatPrompt={chatPrompt}
        chatResult={chatResult}
        testResult={testResult}
        burnout={burnout}
        onProviderChange={setProvider}
        onModelChange={setSelectedModel}
        onModelSearchChange={setModelSearch}
        onProjectChange={setSelectedProjectId}
        onOptimizeResources={() => auth && api.optimizeResources(auth.token, selectedProjectId).then(setResourcePlan)}
        onChatPromptChange={setChatPrompt}
        onTestProvider={() => auth && api.testAiProvider(auth.token, provider, selectedModel).then(setTestResult)}
        onRunChat={() => auth && api.chat(auth.token, chatPrompt, provider, selectedModel).then(setChatResult)}
      />
      <AIRecommendationsPanel
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        recommendation={recommendation}
        generated={generatedRecommendation}
        history={recommendationHistory}
        analysis={taskAnalysis}
        rejectionReason={rejectionReason}
        explanation={explanation}
        onTaskChange={setSelectedTaskId}
        onGenerate={() => auth && api.generateRecommendation(auth.token, selectedTaskId).then((data) => { setGeneratedRecommendation(data); setMessage("Recommendation generated."); })}
        onRefreshRecommendation={() => auth && api.recommendAssignee(auth.token, selectedTaskId).then(setRecommendation)}
        onAnalyzeTask={() => auth && api.analyzeTask(auth.token, selectedTaskId).then(setTaskAnalysis)}
        onAccept={(id) => auth && api.acceptRecommendation(auth.token, id).then(() => { setMessage("Recommendation accepted."); })}
        onReject={(id) => auth && api.rejectRecommendation(auth.token, id, rejectionReason).then(() => { setMessage("Recommendation rejected."); })}
        onExplain={(id) => auth && api.explainRecommendation(auth.token, id).then((data) => setExplanation(data.explanation))}
        onRejectionReasonChange={setRejectionReason}
      />
      <AIPredictionsPanel
        projects={projects}
        tasks={tasks}
        selectedProjectId={selectedProjectId}
        selectedTaskId={selectedTaskId}
        delayPrediction={delay}
        generatedPrediction={generatedPrediction}
        predictionHistory={predictionHistory}
        projectPredictions={projectPredictions}
        predictionResults={predictionResults}
        onProjectChange={setSelectedProjectId}
        onTaskChange={setSelectedTaskId}
        onGenerateTaskPrediction={() => auth && api.generateDelayPrediction(auth.token, selectedTaskId).then(setGeneratedPrediction)}
        onLoadProjectPredictions={() => auth && api.predictProjectDelays(auth.token, selectedProjectId).then(setProjectPredictions)}
        onRefreshHistory={() => auth && Promise.all([api.getPredictionHistory(auth.token, selectedTaskId), api.getPredictionResults(auth.token)]).then(([history, results]) => { setPredictionHistory(history); setPredictionResults(results); })}
      />
      <AIAdminPanel
        models={aiModels}
        trainingData={trainingData}
        performance={performance}
        onCreateModel={() => setEditingModel({} as AIModelRecord)}
        onEditModel={setEditingModel}
        onDeleteModel={setDeletingModel}
        onAddTrainingData={() => setTrainingOpen(true)}
        onTrainModels={() => auth && api.trainModels(auth.token).then(() => setMessage("Training triggered."))}
      />
      <AIModelFormDialog
        open={editingModel !== null}
        model={editingModel?.id ? editingModel : undefined}
        onClose={() => setEditingModel(null)}
        onSubmit={(payload) => {
          if (!auth) return;
          const action = editingModel?.id ? api.updateAiModel(auth.token, editingModel.id, payload) : api.createAiModel(auth.token, payload);
          void action.then(() => { setEditingModel(null); setMessage(editingModel?.id ? "AI model updated." : "AI model created."); void refreshAdmin(); });
        }}
      />
      <TrainingDataFormDialog
        open={trainingOpen}
        onClose={() => setTrainingOpen(false)}
        onSubmit={(payload) => {
          if (!auth) return;
          void api.createTrainingData(auth.token, payload).then(() => { setTrainingOpen(false); setMessage("Training data added."); void refreshAdmin(); });
        }}
      />
      <ConfirmDialog
        open={deletingModel !== null}
        title="Delete AI Model"
        message={`Delete ${deletingModel?.name}?`}
        onClose={() => setDeletingModel(null)}
        onConfirm={() => auth && deletingModel ? api.deleteAiModel(auth.token, deletingModel.id).then(() => { setDeletingModel(null); setMessage("AI model deleted."); void refreshAdmin(); }) : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
