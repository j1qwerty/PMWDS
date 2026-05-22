<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class ProjectDocument extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "project_documents";
    public $timestamps = false;
    protected $guarded = [];
}
