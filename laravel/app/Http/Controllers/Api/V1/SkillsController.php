<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillsController extends Controller
{
    public function index(): JsonResponse { return response()->json(App\Models\Skill::limit(200)->get()); }
    public function show(string $id): JsonResponse { return response()->json(App\Models\Skill::findOrFail($id)); }
    public function store(Request $request): JsonResponse { $item = App\Models\Skill::create(array_merge($request->all(), ["created_by" => "api"])); return response()->json($item, 201); }
    public function update(Request $request, string $id): JsonResponse { $item = App\Models\Skill::findOrFail($id); $item->fill($request->all()); $item->save(); return response()->json($item); }
    public function destroy(string $id): JsonResponse { App\Models\Skill::findOrFail($id)->delete(); return response()->json(null, 204); }
}
