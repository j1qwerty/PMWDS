<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Transformers\UserTransformer;
use App\Models\Role;
use App\Models\User;
use App\Models\UserDepartment;
use App\Models\UserSkill;
use App\Services\CurrentUserService;
use App\Services\FileUploadService;
use App\Services\RoleScopeService;
use App\Support\PasswordHasher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends Controller
{
    public function __construct(
        private readonly RoleScopeService $scope,
        private readonly CurrentUserService $currentUser,
        private readonly FileUploadService $files,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->departmentId && ! $this->scope->canAccessDepartment($request->departmentId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = User::with(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile']);
        if ($request->departmentId) {
            $query->where(fn ($q) => $q->where('department_id', $request->departmentId)
                ->orWhereHas('departmentAssignments', fn ($a) => $a->where('department_id', $request->departmentId)));
        }
        $this->scope->scopeUsers($query);
        $users = $query->get();

        return response()->json($users->map(fn ($u) => UserTransformer::toArray($u, true))->values());
    }

    public function show(string $id): JsonResponse
    {
        if (! $this->scope->canAccessUser($id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::with(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile'])->findOrFail($id);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function me(): JsonResponse
    {
        $user = $this->currentUser->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }
        $user->load(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile']);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (! $this->scope->canManageUser($id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::with(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile'])->findOrFail($id);
        $user->fill([
            'first_name' => $request->firstName ?? $user->first_name,
            'last_name' => $request->lastName ?? $user->last_name,
            'job_title' => $request->jobTitle ?? $user->job_title,
            'phone_number' => $request->phoneNumber ?? $user->phone_number,
            'organization_id' => $request->organizationId ?? $user->organization_id,
            'department_id' => $request->departmentId ?? $user->department_id,
            'availability_percentage' => $request->availabilityPercentage ?? $user->availability_percentage,
            'availability_status' => $request->availabilityStatus ?? $user->availability_status,
            'profile_picture_url' => $request->profilePictureUrl ?? $user->profile_picture_url,
            'modified_date' => now(),
            'modified_by' => $this->currentUser->userId(),
        ])->save();

        if ($request->roleNames) {
            $roleIds = Role::whereIn('name', $request->roleNames)->pluck('id');
            $user->roles()->sync($roleIds);
        }

        $user->load(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile']);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'firstName' => 'required',
            'lastName' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6',
            'role' => 'nullable|string',
        ]);

        $user = new User([
            'email' => strtolower($data['email']),
            'first_name' => $data['firstName'],
            'last_name' => $data['lastName'],
            'employee_code' => strtoupper(substr(uniqid(), -8)),
            'job_title' => $request->jobTitle ?? 'Team Member',
            'organization_id' => $request->organizationId,
            'department_id' => $request->departmentId,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);
        $user->save();
        $user->password_hash = PasswordHasher::hash($data['password'], $user->id);
        $user->save();

        $role = Role::where('name', $data['role'] ?? 'Viewer')->first();
        if ($role) {
            $user->roles()->attach($role->id);
        }

        $user->load(['roles', 'department', 'skills.skill', 'profile']);

        return response()->json(UserTransformer::toArray($user, true), 201);
    }

    public function updateDepartments(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        UserDepartment::where('user_id', $user->id)->delete();
        foreach ($request->departmentIds ?? [] as $deptId) {
            UserDepartment::create([
                'user_id' => $user->id,
                'department_id' => $deptId,
                'is_primary' => $deptId === $request->primaryDepartmentId,
                'created_by' => $this->currentUser->userId() ?? 'api',
            ]);
        }
        if ($request->primaryDepartmentId) {
            $user->department_id = $request->primaryDepartmentId;
            $user->save();
        }
        $user->load(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile']);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function profilePicture(Request $request, string $id): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:jpeg,png,webp|max:1536']);
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);
        $url = $this->files->storeAvatar($request->file('file'), $user->employee_code);
        $user->profile_picture_url = $url;
        $user->save();

        return response()->json([
            'profilePictureUrl' => $url,
            'user' => UserTransformer::toArray($user, true),
        ]);
    }

    public function availability(Request $request, string $id): JsonResponse
    {
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);
        $user->availability_status = $request->status ?? $user->availability_status;
        $user->availability_percentage = $request->availabilityPercentage ?? $user->availability_percentage;
        $user->save();

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function addSkill(Request $request, string $id): JsonResponse
    {
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);
        UserSkill::create([
            'user_id' => $user->id,
            'skill_id' => $request->skillId,
            'proficiency_level' => $request->proficiencyLevel ?? 1,
            'experience_months' => $request->experienceMonths ?? 0,
            'last_used' => now(),
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);
        $user->load(['roles', 'department', 'skills.skill', 'profile']);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function updateSkill(Request $request, string $id, string $skillId): JsonResponse
    {
        $skill = UserSkill::where('user_id', $id)->where('skill_id', $skillId)->firstOrFail();
        $skill->fill([
            'proficiency_level' => $request->proficiencyLevel ?? $skill->proficiency_level,
            'experience_months' => $request->experienceMonths ?? $skill->experience_months,
        ])->save();
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function removeSkill(string $id, string $skillId): JsonResponse
    {
        UserSkill::where('user_id', $id)->where('skill_id', $skillId)->delete();
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);

        return response()->json(UserTransformer::toArray($user, true));
    }

    public function available(): JsonResponse
    {
        $users = User::where('availability_status', 'Available')->where('is_active', true)->get();

        return response()->json($users->map(fn ($u) => UserTransformer::toArray($u))->values());
    }

    public function workload(Request $request): JsonResponse
    {
        $query = User::where('is_active', true);
        if ($request->departmentId) {
            $query->where('department_id', $request->departmentId);
        }
        $users = $query->get();

        return response()->json([
            'departmentId' => $request->departmentId,
            'totalMembers' => $users->count(),
            'availableCount' => $users->where('availability_status', 'Available')->count(),
            'overloadedCount' => $users->where('ai_workload_score', '>', 0.8)->count(),
            'averageWorkload' => $users->avg('ai_workload_score') ?? 0,
            'averageBurnoutRisk' => $users->avg('ai_burnout_risk_score') ?? 0,
            'members' => $users->map(fn ($u) => [
                'userId' => $u->id,
                'fullName' => $u->full_name,
                'jobTitle' => $u->job_title,
                'availabilityPercent' => (float) $u->availability_percentage,
                'workloadScore' => (float) $u->ai_workload_score,
                'burnoutRisk' => (float) $u->ai_burnout_risk_score,
                'performanceScore' => (float) $u->ai_performance_score,
                'activeTaskCount' => 0,
                'completedThisMonth' => 0,
                'skills' => [],
                'status' => $u->availability_status,
            ])->values(),
            'generatedAt' => now()->utc()->toIso8601String(),
        ]);
    }

    public function deactivate(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->is_active = false;
        $user->save();

        return response()->json(['message' => 'User deactivated.']);
    }

    public function reactivate(string $id): JsonResponse
    {
        $user = User::with(['roles', 'department', 'skills.skill', 'profile'])->findOrFail($id);
        $user->is_active = true;
        $user->save();

        return response()->json(UserTransformer::toArray($user, true));
    }
}
