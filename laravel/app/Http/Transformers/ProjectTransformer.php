<?php

namespace App\Http\Transformers;

use App\Models\Project;

class ProjectTransformer
{
    public static function toArray(Project $project): array
    {
        $tasks = $project->relationLoaded('tasks') ? $project->tasks : collect();

        return [
            'id' => $project->id,
            'projectCode' => $project->project_code,
            'name' => $project->name,
            'description' => $project->description,
            'category' => $project->category,
            'status' => $project->status,
            'priority' => $project->priority,
            'plannedStartDate' => $project->planned_start_date?->toIso8601String(),
            'plannedEndDate' => $project->planned_end_date?->toIso8601String(),
            'actualStartDate' => $project->actual_start_date?->toIso8601String(),
            'actualEndDate' => $project->actual_end_date?->toIso8601String(),
            'plannedBudget' => (float) $project->planned_budget,
            'actualCost' => (float) $project->actual_cost,
            'budgetVariance' => (float) $project->planned_budget - (float) $project->actual_cost,
            'progressPercentage' => (float) $project->progress_percentage,
            'aiHealthScore' => (float) $project->ai_health_score,
            'aiDelayRiskScore' => (float) $project->ai_delay_risk_score,
            'aiBudgetRiskScore' => (float) $project->ai_budget_risk_score,
            'aiInsightsSummary' => $project->ai_insights_summary,
            'departmentId' => $project->department_id,
            'departmentName' => $project->department?->name,
            'projectManagerId' => $project->project_manager_id,
            'projectManagerName' => $project->manager?->full_name,
            'totalTasks' => $tasks->count(),
            'completedTasks' => $tasks->where('status', 'Completed')->count(),
            'overdueTasks' => $tasks->filter(fn ($t) => $t->isOverdue())->count(),
            'createdDate' => $project->created_date,
        ];
    }
}
