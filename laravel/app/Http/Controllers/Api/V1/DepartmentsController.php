<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Project;
use App\Models\User;
use App\Services\RoleScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentsController extends Controller
{
    public function __construct(private readonly RoleScopeService $scope) {}

    public function index(): JsonResponse
    {
        $query = Department::with('organization');
        $this->scope->scopeDepartments($query);

        return response()->json($query->get()->map(fn ($d) => $this->map($d))->values());
    }

    public function show(string $id): JsonResponse
    {
        $dept = Department::with('organization')->findOrFail($id);

        return response()->json($this->map($dept));
    }

    public function store(Request $request): JsonResponse
    {
        $dept = Department::create([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'organization_id' => $request->organizationId,
            'max_capacity' => $request->maxCapacity ?? 0,
            'created_by' => 'api',
        ]);

        return response()->json($this->map($dept), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        $dept->fill([
            'name' => $request->name ?? $dept->name,
            'code' => $request->code ?? $dept->code,
            'description' => $request->description ?? $dept->description,
            'max_capacity' => $request->maxCapacity ?? $dept->max_capacity,
            'modified_date' => now(),
        ])->save();

        return response()->json($this->map($dept));
    }

    public function destroy(string $id): JsonResponse
    {
        Department::findOrFail($id)->softDeleteRecord();

        return response()->json(null, 204);
    }

    public function dashboard(string $id): JsonResponse
    {
        return response()->json([
            'departmentId' => $id,
            'memberCount' => User::where('department_id', $id)->count(),
            'projectCount' => Project::where('department_id', $id)->count(),
            'activeProjects' => Project::where('department_id', $id)->where('status', 'Active')->count(),
        ]);
    }

    private function map(Department $d): array
    {
        return [
            'id' => $d->id,
            'name' => $d->name,
            'code' => $d->code,
            'description' => $d->description,
            'organizationId' => $d->organization_id,
            'organizationName' => $d->organization?->name,
            'maxCapacity' => $d->max_capacity,
            'isActive' => (bool) $d->is_active,
        ];
    }
}
