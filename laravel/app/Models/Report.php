<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "reports";
    public $timestamps = false;
    protected $guarded = [];
}
