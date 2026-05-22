<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "organizations";
    public $timestamps = false;
    protected $guarded = [];
}
