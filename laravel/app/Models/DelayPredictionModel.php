<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class DelayPredictionModel extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "delay_prediction_models";
    public $timestamps = false;
    protected $guarded = [];
}
