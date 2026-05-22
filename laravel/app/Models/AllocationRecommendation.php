<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class AllocationRecommendation extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "allocation_recommendations";
    public $timestamps = false;
    protected $guarded = [];
}
