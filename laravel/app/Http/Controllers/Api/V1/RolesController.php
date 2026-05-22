<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolesController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Role::with('permissions')->get());
    }

    public function permissions(): JsonResponse
    {
        return response()->json(Permission::all());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Role::with('permissions')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $role = Role::create([
            'name' => $request->name,
            'description' => $request->description,
            'level' => $request->level ?? 0,
            'created_by' => 'api',
        ]);

        return response()->json($role, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($id);
        $role->fill($request->only(['name', 'description', 'level']))->save();

        return response()->json($role);
    }

    public function destroy(string $id): JsonResponse
    {
        Role::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function storePermission(Request $request): JsonResponse
    {
        $p = Permission::create($request->all() + ['created_by' => 'api']);

        return response()->json($p, 201);
    }

    public function updatePermission(Request $request, string $id): JsonResponse
    {
        $p = Permission::findOrFail($id);
        $p->fill($request->all())->save();

        return response()->json($p);
    }

    public function destroyPermission(string $id): JsonResponse
    {
        Permission::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
