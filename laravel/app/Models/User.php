<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = 'users';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'is_deleted' => 'boolean',
        'availability_percentage' => 'float',
        'ai_performance_score' => 'float',
        'ai_workload_score' => 'float',
        'ai_burnout_risk_score' => 'float',
        'password_reset_token_expires_at' => 'datetime',
        'last_ai_score_update' => 'datetime',
        'created_date' => 'datetime',
        'modified_date' => 'datetime',
    ];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function departmentAssignments(): HasMany
    {
        return $this->hasMany(UserDepartment::class);
    }

    public function skills(): HasMany
    {
        return $this->hasMany(UserSkill::class);
    }

    public function taskAssignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class);
    }
}
