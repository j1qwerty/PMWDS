<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dashboard extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = 'dashboards';

    public $timestamps = false;

    protected $guarded = [];

    public function widgets(): HasMany
    {
        return $this->hasMany(DashboardWidget::class);
    }
}
