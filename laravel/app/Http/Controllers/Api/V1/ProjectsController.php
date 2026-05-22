<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Transformers\ProjectTransformer;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Services\CurrentUserService;
use App\Services\FileUploadService;
use App\Services\RoleScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectsController extends Controller
{
    public function __construct(
        private readonly RoleScopeService $scope,
        private readonly FileUploadService $files,
        private readonly CurrentUserService $currentUser,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->departmentId && ! $this->scope->canAccessDepartment($request->departmentId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Project::with(['department', 'tasks', 'manager'])
            ->orderByDesc('created_date');

        if ($request->departmentId) {
            $query->where('department_id', $request->departmentId);
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $this->scope->scopeProjects($query);
        $projects = $query->get();

        return response()->json($projects->map(fn ($p) => ProjectTransformer::toArray($p))->values());
    }

    public function show(string $id): JsonResponse
    {
        if (! $this->scope->canAccessProject($id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $project = Project::with(['department', 'tasks', 'milestones', 'manager'])->find($id);
        if (! $project) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json(ProjectTransformer::toArray($project));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'projectCode' => 'required|string',
            'name' => 'required|string',
            'description' => 'nullable|string',
            'category' => 'required|string',
            'plannedStartDate' => 'required|date',
            'plannedEndDate' => 'required|date',
            'plannedBudget' => 'required|numeric',
            'departmentId' => 'required|uuid',
            'projectManagerId' => 'required|uuid',
            'priority' => 'nullable|string',
        ]);

        if (! $this->scope->canAccessDepartment($data['departmentId'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $project = Project::create([
            'project_code' => $data['projectCode'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'planned_start_date' => $data['plannedStartDate'],
            'planned_end_date' => $data['plannedEndDate'],
            'planned_budget' => $data['plannedBudget'],
            'department_id' => $data['departmentId'],
            'project_manager_id' => $data['projectManagerId'],
            'priority' => $data['priority'] ?? 'Medium',
            'status' => 'Planning',
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        $project->load(['department', 'tasks']);

        return response()->json(ProjectTransformer::toArray($project), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (! $this->scope->canAccessProject($id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $project = Project::findOrFail($id);
        $project->fill([
            'name' => $request->name ?? $project->name,
            'description' => $request->description ?? $project->description,
            'category' => $request->category ?? $project->category,
            'planned_start_date' => $request->plannedStartDate ?? $project->planned_start_date,
            'planned_end_date' => $request->plannedEndDate ?? $project->planned_end_date,
            'planned_budget' => $request->plannedBudget ?? $project->planned_budget,
            'priority' => $request->priority ?? $project->priority,
            'modified_by' => $this->currentUser->userId(),
            'modified_date' => now(),
        ])->save();

        $project->load(['department', 'tasks']);

        return response()->json(ProjectTransformer::toArray($project));
    }

    public function destroy(string $id): JsonResponse
    {
        if (! $this->scope->canAccessProject($id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $project = Project::findOrFail($id);
        $project->softDeleteRecord($this->currentUser->userId());

        return response()->json(null, 204);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $query = Project::with(['department', 'tasks']);
        if ($request->departmentId) {
            $query->where('department_id', $request->departmentId);
        }
        $this->scope->scopeProjects($query);
        $projects = $query->get();

        return response()->json([
            'totalProjects' => $projects->count(),
            'activeProjects' => $projects->where('status', 'Active')->count(),
            'atRiskProjects' => $projects->where('ai_delay_risk_score', '>', 0.7)->count(),
            'projects' => $projects->map(fn ($p) => ProjectTransformer::toArray($p))->values(),
        ]);
    }

    public function progress(string $id): JsonResponse
    {
        $project = Project::with('tasks')->findOrFail($id);
        $tasks = $project->tasks;

        return response()->json([
            'id' => $project->id,
            'name' => $project->name,
            'progressPercentage' => (float) $project->progress_percentage,
            'totalTasks' => $tasks->count(),
            'completedTasks' => $tasks->where('status', 'Completed')->count(),
            'overdueTasks' => $tasks->filter(fn ($t) => $t->isOverdue())->count(),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $project = Project::with(['department', 'tasks'])->findOrFail($id);
        $project->status = $request->newStatus;
        $project->modified_date = now();
        $project->save();

        return response()->json(ProjectTransformer::toArray($project));
    }

    public function aiHealth(string $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        return response()->json([
            'projectId' => $project->id,
            'healthScore' => (float) $project->ai_health_score,
            'delayRisk' => (float) $project->ai_delay_risk_score,
            'budgetRisk' => (float) $project->ai_budget_risk_score,
            'summary' => $project->ai_insights_summary,
        ]);
    }

    public function aiInsights(string $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $insights = $project->ai_insights_summary
            ? explode("\n", $project->ai_insights_summary)
            : ['No insights generated yet.'];

        return response()->json($insights);
    }

    public function optimizeResources(string $id): JsonResponse
    {
        return response()->json([
            'projectId' => $id,
            'recommendations' => [],
            'message' => 'Resource optimization queued.',
        ]);
    }

    public function uploadDocument(Request $request, string $id): JsonResponse
    {
        $request->validate(['file' => 'required|file']);
        $project = Project::findOrFail($id);
        $stored = $this->files->storeDocument($request->file('file'), $project->project_code);

        ProjectDocument::create([
            'project_id' => $project->id,
            'uploaded_by_user_id' => $this->currentUser->userId(),
            'file_name' => $stored['file_name'],
            'storage_path' => $stored['storage_path'],
            'content_type' => $request->file('file')->getMimeType(),
            'file_size' => $request->file('file')->getSize(),
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json(null, 200);
    }

    public function listDocuments(string $id): JsonResponse
    {
        $docs = ProjectDocument::where('project_id', $id)->get()->map(fn ($d) => [
            'id' => $d->id,
            'fileName' => $d->file_name,
            'contentType' => $d->content_type,
            'fileSize' => $d->file_size,
            'uploadedAt' => $d->created_date,
        ]);

        return response()->json($docs);
    }

    public function downloadDocument(string $id, string $docId): BinaryFileResponse|JsonResponse
    {
        $doc = ProjectDocument::where('project_id', $id)->findOrFail($docId);
        if (! file_exists($doc->storage_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return response()->download($doc->storage_path, $doc->file_name);
    }
}
