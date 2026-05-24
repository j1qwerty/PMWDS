<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Skill::orderBy('name')->get()->map(fn (Skill $s) => $this->map($s))->values()
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->map(Skill::findOrFail($id)));
    }

    public function store(Request $request): JsonResponse
    {
        $skill = Skill::create([
            'name' => $request->name,
            'category' => $request->category,
            'description' => $request->description,
            'organization_id' => $request->organizationId,
            'created_by' => 'api',
        ]);

        return response()->json($this->map($skill), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $skill = Skill::findOrFail($id);
        $skill->fill([
            'name' => $request->name ?? $skill->name,
            'category' => $request->category ?? $skill->category,
            'description' => $request->description ?? $skill->description,
            'organization_id' => $request->organizationId ?? $skill->organization_id,
            'modified_date' => now(),
        ])->save();

        return response()->json($this->map($skill));
    }

    public function destroy(string $id): JsonResponse
    {
        Skill::findOrFail($id)->softDeleteRecord();

        return response()->json(null, 204);
    }

    private function map(Skill $skill): array
    {
        return [
            'id' => $skill->id,
            'name' => $skill->name,
            'category' => $skill->category,
            'description' => $skill->description,
            'organizationId' => $skill->organization_id,
            'isActive' => (bool) $skill->is_active,
        ];
    }
}
