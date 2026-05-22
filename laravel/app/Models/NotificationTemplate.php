<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "notification_templates";
    public $timestamps = false;
    protected $guarded = [];
}
