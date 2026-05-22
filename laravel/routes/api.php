<?php

use App\Http\Controllers\Api\V1\ActivityLogsController;
use App\Http\Controllers\Api\V1\AIController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardsController;
use App\Http\Controllers\Api\V1\DepartmentsController;
use App\Http\Controllers\Api\V1\IntegrationsController;
use App\Http\Controllers\Api\V1\KnowledgeController;
use App\Http\Controllers\Api\V1\MilestonesController;
use App\Http\Controllers\Api\V1\NotificationsController;
use App\Http\Controllers\Api\V1\OrganizationsController;
use App\Http\Controllers\Api\V1\ProfilesController;
use App\Http\Controllers\Api\V1\ProjectsController;
use App\Http\Controllers\Api\V1\ReportsController;
use App\Http\Controllers\Api\V1\RolesController;
use App\Http\Controllers\Api\V1\SkillsController;
use App\Http\Controllers\Api\V1\SystemController;
use App\Http\Controllers\Api\V1\TasksController;
use App\Http\Controllers\Api\V1\UsersController;
use App\Http\Controllers\Api\V1\WebhooksController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->group(function (): void {
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/signup', [AuthController::class, 'signup']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('jwt.auth')->group(function (): void {
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);
        Route::post('auth/refresh', [AuthController::class, 'refresh']);

        Route::get('projects/dashboard', [ProjectsController::class, 'dashboard']);
        Route::get('projects/{id}/progress', [ProjectsController::class, 'progress']);
        Route::get('projects/{id}/ai/health', [ProjectsController::class, 'aiHealth'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('projects/{id}/ai/insights', [ProjectsController::class, 'aiInsights'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::post('projects/{id}/ai/optimize-resources', [ProjectsController::class, 'optimizeResources'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::post('projects/{id}/documents', [ProjectsController::class, 'uploadDocument']);
        Route::get('projects/{id}/documents', [ProjectsController::class, 'listDocuments']);
        Route::get('projects/{id}/documents/{docId}/download', [ProjectsController::class, 'downloadDocument']);
        Route::patch('projects/{id}/status', [ProjectsController::class, 'updateStatus'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::apiResource('projects', ProjectsController::class);

        Route::get('tasks/by-project/{projectId}', [TasksController::class, 'byProject']);
        Route::get('tasks/my-tasks', [TasksController::class, 'myTasks']);
        Route::get('tasks/overdue', [TasksController::class, 'overdue'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('tasks/escalated', [TasksController::class, 'escalated'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('tasks/unassigned', [TasksController::class, 'unassigned'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::patch('tasks/{id}/progress', [TasksController::class, 'updateProgress']);
        Route::patch('tasks/{id}/status', [TasksController::class, 'updateStatus']);
        Route::post('tasks/{id}/assign', [TasksController::class, 'assign'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('tasks/{id}/ai/recommend-assignee', [TasksController::class, 'recommendAssignee'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('tasks/{id}/ai/delay-prediction', [TasksController::class, 'delayPrediction']);
        Route::post('tasks/{id}/escalate', [TasksController::class, 'escalate'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::post('tasks/{id}/comments', [TasksController::class, 'addComment']);
        Route::post('tasks/{id}/attachments', [TasksController::class, 'addAttachment']);
        Route::post('tasks/{id}/time/start', [TasksController::class, 'startTime']);
        Route::post('tasks/{id}/time/stop', [TasksController::class, 'stopTime']);
        Route::get('tasks/{id}/subtasks', [TasksController::class, 'subtasks']);
        Route::post('tasks/{id}/subtasks', [TasksController::class, 'createSubtask']);
        Route::get('tasks/subtasks/{id}', [TasksController::class, 'showSubtask']);
        Route::put('tasks/subtasks/{id}', [TasksController::class, 'updateSubtask'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::patch('tasks/subtasks/{id}/progress', [TasksController::class, 'updateSubtaskProgress']);
        Route::patch('tasks/subtasks/{id}/status', [TasksController::class, 'updateSubtaskStatus']);
        Route::post('tasks/subtasks/{id}/assign', [TasksController::class, 'assignSubtask'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::delete('tasks/subtasks/{id}', [TasksController::class, 'destroySubtask'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('tasks/{id}/dependencies', [TasksController::class, 'dependencies']);
        Route::post('tasks/{id}/dependencies', [TasksController::class, 'addDependency']);
        Route::put('tasks/dependencies/{depId}', [TasksController::class, 'updateDependency']);
        Route::delete('tasks/dependencies/{depId}', [TasksController::class, 'deleteDependency']);
        Route::apiResource('tasks', TasksController::class);

        Route::get('users/me', [UsersController::class, 'me']);
        Route::get('users/available', [UsersController::class, 'available'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::get('users/workload', [UsersController::class, 'workload'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::post('users/register', [UsersController::class, 'register'])->middleware('role:SuperAdmin,Director');
        Route::put('users/{id}/departments', [UsersController::class, 'updateDepartments'])->middleware('role:SuperAdmin,Director');
        Route::post('users/{id}/profile-picture', [UsersController::class, 'profilePicture']);
        Route::patch('users/{id}/availability', [UsersController::class, 'availability']);
        Route::post('users/{id}/skills', [UsersController::class, 'addSkill']);
        Route::put('users/{id}/skills/{skillId}', [UsersController::class, 'updateSkill']);
        Route::delete('users/{id}/skills/{skillId}', [UsersController::class, 'removeSkill']);
        Route::patch('users/{id}/deactivate', [UsersController::class, 'deactivate'])->middleware('role:SuperAdmin,Director');
        Route::patch('users/{id}/reactivate', [UsersController::class, 'reactivate'])->middleware('role:SuperAdmin,Director');
        Route::apiResource('users', UsersController::class);

        Route::prefix('skills')->group(function (): void {
            Route::get('/', [SkillsController::class, 'index']);
            Route::get('{id}', [SkillsController::class, 'show']);
            Route::post('/', [SkillsController::class, 'store'])->middleware('role:SuperAdmin,Director,DepartmentHead');
            Route::put('{id}', [SkillsController::class, 'update'])->middleware('role:SuperAdmin,Director,DepartmentHead');
            Route::delete('{id}', [SkillsController::class, 'destroy'])->middleware('role:SuperAdmin,Director');
        });

        Route::get('departments/{id}/dashboard', [DepartmentsController::class, 'dashboard'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::apiResource('departments', DepartmentsController::class);

        Route::put('organizations/{id}/departments/{departmentId}', [OrganizationsController::class, 'attachDepartment'])->middleware('role:SuperAdmin');
        Route::delete('organizations/{id}/departments/{departmentId}', [OrganizationsController::class, 'detachDepartment'])->middleware('role:SuperAdmin');
        Route::apiResource('organizations', OrganizationsController::class);

        Route::get('milestones/by-project/{projectId}', [MilestonesController::class, 'byProject']);
        Route::patch('milestones/{id}/complete', [MilestonesController::class, 'complete'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        Route::apiResource('milestones', MilestonesController::class)->except(['index']);

        Route::get('profiles/{userId}', [ProfilesController::class, 'show']);
        Route::put('profiles/{userId}', [ProfilesController::class, 'update']);

        Route::get('roles/permissions', [RolesController::class, 'permissions']);
        Route::post('roles/permissions', [RolesController::class, 'storePermission'])->middleware('role:SuperAdmin');
        Route::put('roles/permissions/{id}', [RolesController::class, 'updatePermission'])->middleware('role:SuperAdmin');
        Route::delete('roles/permissions/{id}', [RolesController::class, 'destroyPermission'])->middleware('role:SuperAdmin');
        Route::apiResource('roles', RolesController::class);

        Route::get('notifications/unread-count', [NotificationsController::class, 'unreadCount']);
        Route::patch('notifications/read-all', [NotificationsController::class, 'readAll']);
        Route::patch('notifications/{id}/read', [NotificationsController::class, 'markRead']);
        Route::post('notifications/broadcast', [NotificationsController::class, 'broadcast'])->middleware('role:SuperAdmin,Director,DepartmentHead');
        Route::get('notifications', [NotificationsController::class, 'index']);
        Route::delete('notifications/{id}', [NotificationsController::class, 'destroy']);
        Route::get('notifications/templates', [NotificationsController::class, 'templates']);
        Route::post('notifications/templates', [NotificationsController::class, 'storeTemplate']);
        Route::get('notifications/rules', [NotificationsController::class, 'rules']);
        Route::post('notifications/rules', [NotificationsController::class, 'storeRule']);

        Route::get('activitylogs', [ActivityLogsController::class, 'index']);
        Route::get('activitylogs/user/{userId}', [ActivityLogsController::class, 'byUser'])->middleware('role:SuperAdmin,Director');
        Route::get('activitylogs/team', [ActivityLogsController::class, 'team']);
        Route::get('activitylogs/all', [ActivityLogsController::class, 'all'])->middleware('role:SuperAdmin,Director');
        Route::get('activitylogs/project/{projectId}', [ActivityLogsController::class, 'byProject']);
        Route::post('activitylogs', [ActivityLogsController::class, 'store']);

        Route::prefix('ai')->group(function (): void {
            Route::get('settings', [AIController::class, 'settings']);
            Route::post('settings', [AIController::class, 'saveSettings'])->middleware('role:SuperAdmin');
            Route::get('recommend-assignee/{taskId}', [AIController::class, 'recommendAssignee'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::post('chat', [AIController::class, 'chat']);
            Route::get('providers', [AIController::class, 'providers']);
            Route::get('providers/{provider}/models', [AIController::class, 'providerModels']);
            Route::post('providers/{provider}/test', [AIController::class, 'testProvider'])->middleware('role:SuperAdmin');
            Route::get('predict-delay/{taskId}', [AIController::class, 'predictDelay']);
            Route::get('project-health/{projectId}', [AIController::class, 'projectHealth']);
            Route::get('insights/{projectId}', [AIController::class, 'insights']);
            Route::get('burnout-risk', [AIController::class, 'burnoutRisk']);
            Route::post('train', [AIController::class, 'train'])->middleware('role:SuperAdmin');
            Route::apiResource('models', AIController::class)->only(['index', 'store', 'show', 'update', 'destroy'])->middleware('role:SuperAdmin');
        });

        Route::prefix('reports')->group(function (): void {
            Route::get('project-status/{projectId}', [ReportsController::class, 'projectStatus'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::post('task-completion', [ReportsController::class, 'taskCompletion'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::post('department-workload', [ReportsController::class, 'departmentWorkload'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::get('budget-variance/{projectId}', [ReportsController::class, 'budgetVariance'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::post('delay-analysis', [ReportsController::class, 'delayAnalysis'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::post('resource-utilization', [ReportsController::class, 'resourceUtilization'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::get('ai-insights/{projectId}', [ReportsController::class, 'aiInsights'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::get('stored', [ReportsController::class, 'index']);
            Route::post('stored', [ReportsController::class, 'store']);
            Route::get('stored/{id}', [ReportsController::class, 'show']);
            Route::put('stored/{id}', [ReportsController::class, 'update']);
            Route::delete('stored/{id}', [ReportsController::class, 'destroy']);
            Route::get('schedules', [ReportsController::class, 'schedulesIndex']);
            Route::post('schedules', [ReportsController::class, 'schedulesStore']);
            Route::get('schedules/{id}', [ReportsController::class, 'schedulesShow']);
            Route::put('schedules/{id}', [ReportsController::class, 'schedulesUpdate']);
            Route::delete('schedules/{id}', [ReportsController::class, 'schedulesDestroy']);
        });

        Route::apiResource('dashboards', DashboardsController::class);
        Route::post('dashboards/{id}/widgets', [DashboardsController::class, 'addWidget']);
        Route::put('dashboards/widgets/{widgetId}', [DashboardsController::class, 'updateWidget']);
        Route::patch('dashboards/{id}/widgets/reorder', [DashboardsController::class, 'reorderWidgets']);
        Route::delete('dashboards/widgets/{widgetId}', [DashboardsController::class, 'destroyWidget']);

        Route::prefix('knowledge')->group(function (): void {
            Route::get('articles', [KnowledgeController::class, 'articles']);
            Route::get('articles/{id}', [KnowledgeController::class, 'showArticle']);
            Route::post('articles', [KnowledgeController::class, 'storeArticle']);
            Route::put('articles/{id}', [KnowledgeController::class, 'updateArticle']);
            Route::delete('articles/{id}', [KnowledgeController::class, 'destroyArticle']);
            Route::get('lessons', [KnowledgeController::class, 'lessons']);
            Route::post('lessons', [KnowledgeController::class, 'storeLesson'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::put('lessons/{id}', [KnowledgeController::class, 'updateLesson'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
            Route::delete('lessons/{id}', [KnowledgeController::class, 'destroyLesson'])->middleware('role:SuperAdmin,Director,ProjectManager,DepartmentHead');
        });

        Route::patch('integrations/{id}/sync', [IntegrationsController::class, 'sync'])->middleware('role:SuperAdmin');
        Route::apiResource('integrations', IntegrationsController::class);

        Route::post('webhooks/{id}/deliveries', [WebhooksController::class, 'addDelivery'])->middleware('role:SuperAdmin');
        Route::apiResource('webhooks', WebhooksController::class);

        Route::get('system/database', [SystemController::class, 'database'])->middleware('role:SuperAdmin');
    });
});
