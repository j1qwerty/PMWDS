<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class PredictionResult extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "prediction_results";
    public $timestamps = false;
    protected $guarded = [];
}
