<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Integration::all());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Integration::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $item = Integration::create($request->all() + ['created_by' => 'api']);

        return response()->json($item, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = Integration::findOrFail($id);
        $item->fill($request->all())->save();

        return response()->json($item);
    }

    public function destroy(string $id): JsonResponse
    {
        Integration::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function sync(Request $request, string $id): JsonResponse
    {
        $item = Integration::findOrFail($id);
        $item->status = $request->status ?? 'Synced';
        $item->last_sync_at = now();
        $item->save();

        return response()->json($item);
    }
}
