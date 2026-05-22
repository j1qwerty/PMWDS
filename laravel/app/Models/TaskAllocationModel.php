<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TaskAllocationModel extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "task_allocation_models";
    public $timestamps = false;
    protected $guarded = [];
}
