<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhooksController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Webhook::query();
        if ($request->integrationId) {
            $query->where('integration_id', $request->integrationId);
        }

        return response()->json($query->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Webhook::with('deliveries')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $item = Webhook::create($request->all() + ['created_by' => 'api']);

        return response()->json($item, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = Webhook::findOrFail($id);
        $item->fill($request->all())->save();

        return response()->json($item);
    }

    public function destroy(string $id): JsonResponse
    {
        Webhook::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function addDelivery(Request $request, string $id): JsonResponse
    {
        $delivery = WebhookDelivery::create([
            'webhook_id' => $id,
            'event_type' => $request->eventType ?? 'test',
            'status_code' => $request->statusCode,
            'response_body' => $request->responseBody,
            'success' => (bool) $request->success,
            'delivered_at' => now(),
            'created_by' => 'api',
        ]);

        return response()->json($delivery, 201);
    }
}
