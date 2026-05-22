<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class AIProviderCredential extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "ai_provider_credentials";
    public $timestamps = false;
    protected $guarded = [];
}
