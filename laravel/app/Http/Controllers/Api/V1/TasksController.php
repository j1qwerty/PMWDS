<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Transformers\TaskTransformer;
use App\Models\DelayPrediction;
use App\Models\ProjectTask;
use App\Models\TaskAssignment;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\TaskDependency;
use App\Models\TimeEntry;
use App\Services\CurrentUserService;
use App\Services\FileUploadService;
use App\Services\RoleScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TasksController extends Controller
{
    public function __construct(
        private readonly RoleScopeService $scope,
        private readonly CurrentUserService $currentUser,
        private readonly FileUploadService $files,
    ) {}

    public function index(): JsonResponse
    {
        $query = ProjectTask::with(['assignments', 'subTasks']);
        $this->scope->scopeProjects($query->whereHas('project', fn ($q) => $q));
        $tasks = ProjectTask::with(['assignments', 'subTasks'])->orderByDesc('created_date')->limit(100)->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function byProject(string $projectId): JsonResponse
    {
        if (! $this->scope->canAccessProject($projectId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $tasks = ProjectTask::with(['assignments', 'subTasks'])
            ->where('project_id', $projectId)
            ->whereNull('parent_task_id')
            ->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function myTasks(): JsonResponse
    {
        $userId = $this->currentUser->userId();
        $tasks = ProjectTask::with(['assignments', 'subTasks'])
            ->where(fn ($q) => $q->where('assigned_to_user_id', $userId)
                ->orWhereHas('assignments', fn ($a) => $a->where('user_id', $userId)))
            ->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function show(string $id): JsonResponse
    {
        $task = ProjectTask::with(['assignments', 'subTasks', 'comments', 'attachments'])->findOrFail($id);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string',
            'projectId' => 'required|uuid',
            'startDate' => 'nullable|date',
            'dueDate' => 'nullable|date',
            'estimatedHours' => 'nullable|numeric',
            'milestoneId' => 'nullable|uuid',
            'parentTaskId' => 'nullable|uuid',
            'assignedToUserId' => 'nullable|uuid',
            'priority' => 'nullable|string',
        ]);

        $task = ProjectTask::create([
            'title' => $data['title'],
            'description' => $request->description,
            'project_id' => $data['projectId'],
            'milestone_id' => $data['milestoneId'] ?? null,
            'parent_task_id' => $data['parentTaskId'] ?? null,
            'assigned_to_user_id' => $data['assignedToUserId'] ?? null,
            'start_date' => $data['startDate'] ?? now(),
            'due_date' => $data['dueDate'] ?? now()->addWeek(),
            'estimated_hours' => $data['estimatedHours'] ?? 0,
            'priority' => $data['priority'] ?? 'Medium',
            'status' => 'Pending',
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        if (! empty($request->assignedToUserIds)) {
            foreach ($request->assignedToUserIds as $uid) {
                TaskAssignment::create([
                    'task_id' => $task->id,
                    'user_id' => $uid,
                    'assigned_at' => now(),
                    'created_by' => $this->currentUser->userId() ?? 'api',
                ]);
            }
        }

        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        $task->fill([
            'title' => $request->title ?? $task->title,
            'description' => $request->description ?? $task->description,
            'start_date' => $request->startDate ?? $task->start_date,
            'due_date' => $request->dueDate ?? $task->due_date,
            'estimated_hours' => $request->estimatedHours ?? $task->estimated_hours,
            'priority' => $request->priority ?? $task->priority,
            'modified_date' => now(),
            'modified_by' => $this->currentUser->userId(),
        ])->save();
        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function destroy(string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        $task->softDeleteRecord($this->currentUser->userId());

        return response()->json(null, 204);
    }

    public function updateProgress(Request $request, string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        $task->progress_percentage = $request->progressPercentage ?? $task->progress_percentage;
        $task->modified_date = now();
        $task->save();
        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        $task->status = $request->newStatus;
        $task->modified_date = now();
        $task->save();
        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        if ($request->assigneeId) {
            $task->assigned_to_user_id = $request->assigneeId;
            TaskAssignment::updateOrCreate(
                ['task_id' => $task->id, 'user_id' => $request->assigneeId],
                ['is_primary' => true, 'assigned_at' => now(), 'created_by' => $this->currentUser->userId() ?? 'api']
            );
        }
        $task->status = 'Assigned';
        $task->save();
        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function recommendAssignee(string $id): JsonResponse
    {
        return response()->json(['taskId' => $id, 'recommendedUserId' => null, 'score' => 0, 'explanation' => 'AI recommendation not configured.']);
    }

    public function delayPrediction(string $id): JsonResponse
    {
        $pred = DelayPrediction::where('task_id', $id)->latest('created_date')->first();

        return response()->json([
            'taskId' => $id,
            'probability' => (float) ($pred?->probability ?? 0),
            'predictedDelayDays' => (int) ($pred?->predicted_delay_days ?? 0),
            'riskFactors' => json_decode($pred?->risk_factors ?? '[]', true),
        ]);
    }

    public function escalate(string $id): JsonResponse
    {
        $task = ProjectTask::findOrFail($id);
        $task->is_escalated = true;
        $task->escalated_at = now();
        $task->save();
        $task->load(['assignments', 'subTasks']);

        return response()->json(TaskTransformer::toArray($task));
    }

    public function addComment(Request $request, string $id): JsonResponse
    {
        $comment = TaskComment::create([
            'task_id' => $id,
            'user_id' => $this->currentUser->userId(),
            'comment' => $request->comment,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json(['message' => 'Comment added.', 'comment' => $comment->comment]);
    }

    public function addAttachment(Request $request, string $id): JsonResponse
    {
        $request->validate(['file' => 'required|file']);
        $stored = $this->files->storeAttachment($request->file('file'), $id);
        TaskAttachment::create([
            'task_id' => $id,
            'uploaded_by_user_id' => $this->currentUser->userId(),
            'file_name' => $stored['file_name'],
            'storage_path' => $stored['storage_path'],
            'content_type' => $request->file('file')->getMimeType(),
            'file_size' => $request->file('file')->getSize(),
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json(['message' => 'Attachment uploaded.', 'fileName' => $stored['file_name']]);
    }

    public function startTime(Request $request, string $id): JsonResponse
    {
        $entry = TimeEntry::create([
            'task_id' => $id,
            'user_id' => $this->currentUser->userId(),
            'start_time' => now(),
            'description' => $request->description,
            'is_billable' => (bool) $request->isBillable,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json(['message' => 'Timer started.', 'entryId' => $entry->id]);
    }

    public function stopTime(string $id): JsonResponse
    {
        $entry = TimeEntry::where('task_id', $id)
            ->where('user_id', $this->currentUser->userId())
            ->whereNull('end_time')
            ->latest('start_time')
            ->first();

        if ($entry) {
            $entry->end_time = now();
            $entry->duration_minutes = $entry->start_time->diffInMinutes($entry->end_time);
            $entry->save();
        }

        return response()->json([
            'message' => 'Timer stopped.',
            'durationMinutes' => $entry?->duration_minutes ?? 0,
        ]);
    }

    public function overdue(): JsonResponse
    {
        $tasks = ProjectTask::where('due_date', '<', now())->where('status', '!=', 'Completed')->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function escalated(): JsonResponse
    {
        $tasks = ProjectTask::where('is_escalated', true)->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function unassigned(): JsonResponse
    {
        $tasks = ProjectTask::whereNull('assigned_to_user_id')->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function subtasks(string $id): JsonResponse
    {
        $tasks = ProjectTask::where('parent_task_id', $id)->get();

        return response()->json($tasks->map(fn ($t) => TaskTransformer::toArray($t))->values());
    }

    public function createSubtask(Request $request, string $id): JsonResponse
    {
        $request->merge(['parentTaskId' => $id]);

        return $this->store($request);
    }

    public function showSubtask(string $id): JsonResponse
    {
        return $this->show($id);
    }

    public function updateSubtask(Request $request, string $id): JsonResponse
    {
        return $this->update($request, $id);
    }

    public function updateSubtaskProgress(Request $request, string $id): JsonResponse
    {
        return $this->updateProgress($request, $id);
    }

    public function updateSubtaskStatus(Request $request, string $id): JsonResponse
    {
        return $this->updateStatus($request, $id);
    }

    public function assignSubtask(Request $request, string $id): JsonResponse
    {
        return $this->assign($request, $id);
    }

    public function destroySubtask(string $id): JsonResponse
    {
        return $this->destroy($id);
    }

    public function dependencies(string $id): JsonResponse
    {
        $deps = TaskDependency::where('successor_task_id', $id)->get()->map(fn ($d) => [
            'id' => $d->id,
            'predecessorTaskId' => $d->predecessor_task_id,
            'successorTaskId' => $d->successor_task_id,
            'dependencyType' => $d->dependency_type,
            'lagDays' => $d->lag_days,
        ]);

        return response()->json($deps);
    }

    public function addDependency(Request $request, string $id): JsonResponse
    {
        $dep = TaskDependency::create([
            'predecessor_task_id' => $request->predecessorTaskId,
            'successor_task_id' => $id,
            'dependency_type' => $request->dependencyType ?? 'FinishToStart',
            'lag_days' => $request->lagDays ?? 0,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json($dep, 201);
    }

    public function updateDependency(Request $request, string $depId): JsonResponse
    {
        $dep = TaskDependency::findOrFail($depId);
        $dep->fill($request->only(['dependencyType', 'lagDays']))->save();

        return response()->json($dep);
    }

    public function deleteDependency(string $depId): JsonResponse
    {
        TaskDependency::findOrFail($depId)->delete();

        return response()->json(null, 204);
    }
}
