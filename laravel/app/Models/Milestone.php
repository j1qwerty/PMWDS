<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Milestone extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "milestones";
    public $timestamps = false;
    protected $guarded = [];
}
