<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Dashboard;
use App\Models\DashboardWidget;
use App\Services\CurrentUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardsController extends Controller
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function index(): JsonResponse
    {
        return response()->json(
            Dashboard::with('widgets')->where('user_id', $this->currentUser->userId())->get()
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Dashboard::with('widgets')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $d = Dashboard::create([
            'user_id' => $this->currentUser->userId(),
            'name' => $request->name,
            'layout_type' => $request->layoutType ?? 'Grid',
            'is_default' => (bool) $request->isDefault,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json($d, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $d = Dashboard::findOrFail($id);
        $d->fill($request->only(['name', 'layout_type', 'is_default']))->save();

        return response()->json($d);
    }

    public function destroy(string $id): JsonResponse
    {
        Dashboard::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function addWidget(Request $request, string $id): JsonResponse
    {
        $w = DashboardWidget::create([
            'dashboard_id' => $id,
            'widget_type' => $request->widgetType,
            'title' => $request->title,
            'config_json' => json_encode($request->config ?? []),
            'sort_order' => $request->sortOrder ?? 0,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json($w, 201);
    }

    public function updateWidget(Request $request, string $widgetId): JsonResponse
    {
        $w = DashboardWidget::findOrFail($widgetId);
        $w->fill($request->only(['widget_type', 'title', 'sort_order']))->save();

        return response()->json($w);
    }

    public function reorderWidgets(Request $request, string $id): JsonResponse
    {
        foreach ($request->widgetIds ?? [] as $order => $widgetId) {
            DashboardWidget::where('dashboard_id', $id)->where('id', $widgetId)->update(['sort_order' => $order]);
        }

        return response()->json(null, 204);
    }

    public function destroyWidget(string $widgetId): JsonResponse
    {
        DashboardWidget::findOrFail($widgetId)->delete();

        return response()->json(null, 204);
    }
}
