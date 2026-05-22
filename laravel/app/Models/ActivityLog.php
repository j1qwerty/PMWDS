<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "activity_logs";
    public $timestamps = false;
    protected $guarded = [];
}
