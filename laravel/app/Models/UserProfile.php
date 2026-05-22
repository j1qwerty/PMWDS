<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "user_profiles";
    public $timestamps = false;
    protected $guarded = [];
}
