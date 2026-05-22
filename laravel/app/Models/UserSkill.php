<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSkill extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = 'user_skills';

    public $timestamps = false;

    protected $guarded = [];

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
