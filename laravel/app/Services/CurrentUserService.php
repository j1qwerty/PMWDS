<?php

namespace App\Services;

use App\Models\User;

class CurrentUserService
{
    private ?User $user = null;

    /** @var list<string> */
    private array $roles = [];

    public function setUser(?User $user, array $roles = []): void
    {
        $this->user = $user;
        $this->roles = $roles;
    }

    public function user(): ?User
    {
        return $this->user;
    }

    public function userId(): ?string
    {
        return $this->user?->id;
    }

    public function roles(): array
    {
        return $this->roles;
    }

    public function isInRole(string $role): bool
    {
        return in_array($role, $this->roles, true);
    }

    public function hasAnyRole(array $roles): bool
    {
        return count(array_intersect($roles, $this->roles)) > 0;
    }
}
