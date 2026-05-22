<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TaskDependency extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "task_dependencies";
    public $timestamps = false;
    protected $guarded = [];
}
