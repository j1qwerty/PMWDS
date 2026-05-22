<?php

namespace App\Providers;

use App\Services\CurrentUserService;
use App\Support\JwtService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CurrentUserService::class);
        $this->app->singleton(JwtService::class);
    }

    public function boot(): void
    {
        //
    }
}
