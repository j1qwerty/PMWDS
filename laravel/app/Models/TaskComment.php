<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TaskComment extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "task_comments";
    public $timestamps = false;
    protected $guarded = [];
}
