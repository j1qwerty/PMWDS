<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TrainingDataPoint extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "training_data_points";
    public $timestamps = false;
    protected $guarded = [];
}
