<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class AlertRule extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "alert_rules";
    public $timestamps = false;
    protected $guarded = [];
}
