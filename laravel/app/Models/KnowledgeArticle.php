<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\PmwdsAuditable;
use Illuminate\Database\Eloquent\Model;

class KnowledgeArticle extends Model
{
    use HasUuid, PmwdsAuditable;

    protected $table = "knowledge_articles";
    public $timestamps = false;
    protected $guarded = [];
}
