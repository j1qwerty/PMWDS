<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Integration extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "integrations";
    public $timestamps = false;
    protected $guarded = [];
}
