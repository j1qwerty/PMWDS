<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "task_attachments";
    public $timestamps = false;
    protected $guarded = [];
}
