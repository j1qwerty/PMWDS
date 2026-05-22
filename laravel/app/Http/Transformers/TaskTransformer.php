<?php

namespace App\Http\Transformers;

use App\Models\ProjectTask;

class TaskTransformer
{
    public static function toArray(ProjectTask $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'startDate' => $task->start_date?->toDateString(),
            'dueDate' => $task->due_date?->toDateString(),
            'estimatedHours' => (float) $task->estimated_hours,
            'actualHours' => (float) $task->actual_hours,
            'progressPercentage' => (float) $task->progress_percentage,
            'projectId' => $task->project_id,
            'milestoneId' => $task->milestone_id,
            'parentTaskId' => $task->parent_task_id,
            'assignedToUserId' => $task->assigned_to_user_id,
            'isEscalated' => (bool) $task->is_escalated,
            'aiDelayProbability' => (float) $task->ai_delay_probability,
            'aiOptimalAssigneeScore' => (float) $task->ai_optimal_assignee_score,
            'aiRiskFactors' => $task->ai_risk_factors,
            'assigneeIds' => $task->relationLoaded('assignments')
                ? $task->assignments->pluck('user_id')->all()
                : [],
            'subTasks' => $task->relationLoaded('subTasks')
                ? $task->subTasks->map(fn ($st) => self::toArray($st))->values()->all()
                : [],
        ];
    }
}
