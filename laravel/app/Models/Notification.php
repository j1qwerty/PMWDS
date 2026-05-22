<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "notifications";
    public $timestamps = false;
    protected $guarded = [];
}
