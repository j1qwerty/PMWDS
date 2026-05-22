<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Milestone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MilestonesController extends Controller
{
    public function byProject(string $projectId): JsonResponse
    {
        $items = Milestone::where('project_id', $projectId)->orderBy('sort_order')->get();

        return response()->json($items->map(fn ($m) => $this->map($m))->values());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->map(Milestone::findOrFail($id)));
    }

    public function store(Request $request): JsonResponse
    {
        $m = Milestone::create([
            'project_id' => $request->projectId,
            'name' => $request->name,
            'description' => $request->description,
            'due_date' => $request->dueDate,
            'status' => $request->status ?? 'Pending',
            'sort_order' => $request->sortOrder ?? 0,
            'created_by' => 'api',
        ]);

        return response()->json($this->map($m), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $m = Milestone::findOrFail($id);
        $m->fill($request->only(['name', 'description', 'due_date', 'status', 'sort_order']))->save();

        return response()->json($this->map($m));
    }

    public function complete(string $id): JsonResponse
    {
        $m = Milestone::findOrFail($id);
        $m->status = 'Completed';
        $m->completed_date = now();
        $m->save();

        return response()->json($this->map($m));
    }

    public function destroy(string $id): JsonResponse
    {
        Milestone::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function map(Milestone $m): array
    {
        return [
            'id' => $m->id,
            'projectId' => $m->project_id,
            'name' => $m->name,
            'description' => $m->description,
            'dueDate' => $m->due_date,
            'completedDate' => $m->completed_date,
            'status' => $m->status,
            'sortOrder' => $m->sort_order,
        ];
    }
}
