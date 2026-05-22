<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Organization::all());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Organization::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $item = Organization::create([
            'name' => $request->name,
            'tax_id' => $request->taxId,
            'address' => $request->address,
            'contact_email' => $request->contactEmail,
            'contact_phone' => $request->contactPhone,
            'created_by' => 'api',
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = Organization::findOrFail($id);
        $item->fill([
            'name' => $request->name ?? $item->name,
            'tax_id' => $request->taxId ?? $item->tax_id,
            'address' => $request->address ?? $item->address,
            'contact_email' => $request->contactEmail ?? $item->contact_email,
            'contact_phone' => $request->contactPhone ?? $item->contact_phone,
        ])->save();

        return response()->json($item);
    }

    public function destroy(string $id): JsonResponse
    {
        Organization::findOrFail($id)->softDeleteRecord();

        return response()->json(null, 204);
    }

    public function attachDepartment(string $id, string $departmentId): JsonResponse
    {
        Department::where('id', $departmentId)->update(['organization_id' => $id]);

        return response()->json(null, 204);
    }

    public function detachDepartment(string $id, string $departmentId): JsonResponse
    {
        Department::where('id', $departmentId)->where('organization_id', $id)->update(['organization_id' => null]);

        return response()->json(null, 204);
    }
}
