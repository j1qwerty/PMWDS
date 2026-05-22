<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "permissions";
    public $timestamps = false;
    protected $guarded = [];
}
