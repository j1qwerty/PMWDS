<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDepartment extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = 'user_departments';

    public $timestamps = false;

    protected $guarded = [];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
