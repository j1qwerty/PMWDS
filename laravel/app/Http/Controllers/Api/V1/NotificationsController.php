<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AlertRule;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Services\CurrentUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function index(Request $request): JsonResponse
    {
        $query = Notification::where('user_id', $this->currentUser->userId());
        if ($request->boolean('unreadOnly')) {
            $query->where('is_read', false);
        }

        return response()->json($query->orderByDesc('created_date')->paginate($request->integer('pageSize', 20))->items());
    }

    public function unreadCount(): JsonResponse
    {
        $count = Notification::where('user_id', $this->currentUser->userId())->where('is_read', false)->count();

        return response()->json(['count' => $count]);
    }

    public function markRead(string $id): JsonResponse
    {
        Notification::where('user_id', $this->currentUser->userId())->where('id', $id)->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'OK']);
    }

    public function readAll(): JsonResponse
    {
        Notification::where('user_id', $this->currentUser->userId())->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'OK']);
    }

    public function destroy(string $id): JsonResponse
    {
        Notification::where('user_id', $this->currentUser->userId())->where('id', $id)->delete();

        return response()->json(null, 204);
    }

    public function broadcast(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Broadcast queued.']);
    }

    public function templates(): JsonResponse
    {
        return response()->json(NotificationTemplate::all());
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $t = NotificationTemplate::create($request->all() + ['created_by' => 'api']);

        return response()->json($t, 201);
    }

    public function rules(): JsonResponse
    {
        return response()->json(AlertRule::all());
    }

    public function storeRule(Request $request): JsonResponse
    {
        $r = AlertRule::create($request->all() + ['created_by' => 'api']);

        return response()->json($r, 201);
    }
}
