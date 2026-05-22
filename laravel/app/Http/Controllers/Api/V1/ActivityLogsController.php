<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\CurrentUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogsController extends Controller
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function index(Request $request): JsonResponse
    {
        $count = $request->integer('count', 50);

        return response()->json(
            ActivityLog::where('user_id', $this->currentUser->userId())
                ->orderByDesc('created_date')
                ->limit($count)
                ->get()
        );
    }

    public function byUser(string $userId, Request $request): JsonResponse
    {
        return response()->json(
            ActivityLog::where('user_id', $userId)->orderByDesc('created_date')->limit($request->integer('count', 50))->get()
        );
    }

    public function team(Request $request): JsonResponse
    {
        return response()->json(ActivityLog::orderByDesc('created_date')->limit($request->integer('count', 50))->get());
    }

    public function all(Request $request): JsonResponse
    {
        return response()->json(ActivityLog::orderByDesc('created_date')->limit($request->integer('count', 100))->get());
    }

    public function byProject(string $projectId, Request $request): JsonResponse
    {
        return response()->json(
            ActivityLog::where('project_id', $projectId)->orderByDesc('created_date')->limit($request->integer('count', 50))->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $log = ActivityLog::create([
            'user_id' => $this->currentUser->userId(),
            'project_id' => $request->projectId,
            'activity_type' => $request->activityType,
            'description' => $request->description,
            'metadata' => json_encode($request->metadata ?? []),
        ]);

        return response()->json($log, 201);
    }
}
