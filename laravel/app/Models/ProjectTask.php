<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectTask extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = 'tasks';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'is_escalated' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class);
    }

    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_task_id');
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(self::class, 'parent_task_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class, 'task_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class, 'task_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class, 'task_id');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class, 'task_id');
    }

    public function dependencies(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'successor_task_id');
    }

    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && $this->status !== 'Completed';
    }
}
