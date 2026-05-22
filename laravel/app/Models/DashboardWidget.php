<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class DashboardWidget extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "dashboard_widgets";
    public $timestamps = false;
    protected $guarded = [];
}
