<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class RoleScopeService
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function isSuperAdmin(): bool
    {
        return $this->currentUser->isInRole('SuperAdmin');
    }

    public function isDirector(): bool
    {
        return $this->currentUser->isInRole('Director');
    }

    public function organizationIds(): array
    {
        $user = $this->currentUser->user();
        if (! $user) {
            return [];
        }

        $ids = $user->departmentAssignments()
            ->with('department')
            ->get()
            ->pluck('department.organization_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $primary = $user->organization_id ?? $user->department?->organization_id;
        if ($primary && ! in_array($primary, $ids, true)) {
            $ids[] = $primary;
        }

        return $ids;
    }

    public function departmentIds(): array
    {
        $user = $this->currentUser->user();
        if (! $user) {
            return [];
        }

        $ids = $user->departmentAssignments()->pluck('department_id')->all();
        if ($user->department_id && ! in_array($user->department_id, $ids, true)) {
            $ids[] = $user->department_id;
        }

        return $ids;
    }

    public function scopeOrganizations(Builder $query): Builder
    {
        if ($this->isSuperAdmin()) {
            return $query;
        }

        return $query->whereIn('id', $this->organizationIds());
    }

    public function scopeDepartments(Builder $query): Builder
    {
        if ($this->isSuperAdmin()) {
            return $query;
        }

        return $query->whereIn('organization_id', $this->organizationIds());
    }

    public function scopeProjects(Builder $query): Builder
    {
        if ($this->isSuperAdmin()) {
            return $query;
        }

        $orgIds = $this->organizationIds();

        return $query->whereHas('department', fn ($q) => $q->whereIn('organization_id', $orgIds));
    }

    public function scopeUsers(Builder $query): Builder
    {
        if ($this->isSuperAdmin()) {
            return $query;
        }

        $deptIds = $this->departmentIds();
        $orgIds = $this->organizationIds();

        return $query->where(function ($q) use ($deptIds, $orgIds) {
            $q->whereIn('department_id', $deptIds)
                ->orWhereIn('organization_id', $orgIds)
                ->orWhereHas('departmentAssignments', fn ($a) => $a->whereIn('department_id', $deptIds));
        });
    }

    public function canAccessDepartment(string $departmentId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($departmentId, $this->departmentIds(), true)
            || Department::where('id', $departmentId)->whereIn('organization_id', $this->organizationIds())->exists();
    }

    public function canAccessProject(string $projectId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return Project::where('id', $projectId)
            ->whereHas('department', fn ($q) => $q->whereIn('organization_id', $this->organizationIds()))
            ->exists();
    }

    public function canAccessUser(string $userId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return User::where('id', $userId)->where(function ($q) {
            $this->scopeUsers($q);
        })->exists();
    }

    public function canManageUser(string $userId): bool
    {
        if ($this->isSuperAdmin() || $this->isDirector()) {
            return true;
        }

        return $this->currentUser->userId() === $userId;
    }
}
