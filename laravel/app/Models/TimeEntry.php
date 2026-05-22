<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "time_entries";
    public $timestamps = false;
    protected $guarded = [];
}
