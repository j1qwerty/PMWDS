<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class AIModel extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "ai_models";
    public $timestamps = false;
    protected $guarded = [];
}
