<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class LessonLearned extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "lessons_learned";
    public $timestamps = false;
    protected $guarded = [];
}
