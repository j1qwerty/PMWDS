<?php

namespace App\Models\Concerns;

trait PmwdsAuditable
{
    public static function bootPmwdsAuditable(): void
    {
        static::addGlobalScope('not_deleted', function ($builder): void {
            $builder->where($builder->getModel()->getTable().'.is_deleted', false);
        });
    }

    public function softDeleteRecord(?string $userId = null): void
    {
        $this->is_deleted = true;
        $this->modified_date = now();
        $this->modified_by = $userId ?? 'system';
        $this->row_version = ($this->row_version ?? 0) + 1;
        $this->save();
    }
}
