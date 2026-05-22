<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class WebhookDelivery extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "webhook_deliveries";
    public $timestamps = false;
    protected $guarded = [];
}
