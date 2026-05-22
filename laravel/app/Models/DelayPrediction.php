<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class DelayPrediction extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "delay_predictions";
    public $timestamps = false;
    protected $guarded = [];
}
