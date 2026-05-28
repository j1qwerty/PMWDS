<?php

namespace App\Http\Transformers;

use App\Models\User;

class UserTransformer
{
    public static function toArray(User $user, bool $withSkills = false): array
    {
        $roles = $user->relationLoaded('roles')
            ? $user->roles->pluck('name')->all()
            : [];

        $data = [
            'id' => $user->id,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'fullName' => $user->full_name,
            'email' => $user->email,
            'profilePictureUrl' => $user->profile_picture_url,
            'jobTitle' => $user->profile?->job_title ?? $user->job_title,
            'organizationId' => $user->organization_id ?? $user->department?->organization_id,
            'department' => $user->department?->name,
            'departmentId' => $user->department_id,
            'departments' => self::mapDepartments($user),
            'profileId' => $user->profile?->id,
            'bio' => $user->profile?->bio,
            'availabilityStatus' => $user->availability_status,
            'availabilityPercentage' => (float) $user->availability_percentage,
            'aiWorkloadScore' => (float) $user->ai_workload_score,
            'aiBurnoutRiskScore' => (float) $user->ai_burnout_risk_score,
            'aiPerformanceScore' => (float) $user->ai_performance_score,
            'activeTaskCount' => $user->taskAssignments()
                ->whereHas('task', fn ($q) => $q->whereIn('status', ['InProgress']))
                ->count(),
            'isActive' => (bool) $user->is_active,
            'lastLoginDate' => null,
            'roles' => $roles,
            'skills' => null,
            'skillDetails' => null,
        ];

        if ($withSkills) {
            $data['skills'] = $user->skills->map(fn ($s) => $s->skill?->name ?? '')->filter()->values()->all();
            $data['skillDetails'] = $user->skills->map(fn ($s) => [
                'skillId' => $s->skill_id,
                'skillName' => $s->skill?->name ?? '',
                'proficiencyLevel' => $s->proficiency_level,
                'experienceMonths' => $s->experience_months,
                'lastUsed' => $s->last_used,
            ])->values()->all();
        }

        return $data;
    }

    private static function mapDepartments(User $user): array
    {
        return $user->departmentAssignments
            ->filter(fn ($a) => $a->department)
            ->map(fn ($a) => [
                'departmentId' => $a->department_id,
                'departmentName' => $a->department->name,
                'departmentCode' => $a->department->code,
                'organizationId' => $a->department->organization_id,
                'organizationName' => $a->department->organization?->name,
                'isPrimary' => (bool) $a->is_primary,
            ])
            ->values()
            ->all();
    }
}
