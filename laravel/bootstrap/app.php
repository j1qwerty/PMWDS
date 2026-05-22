<?php

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\JwtAuthenticate;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'jwt.auth' => JwtAuthenticate::class,
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);

        $middleware->append(ForceJsonResponse::class);
        $middleware->append(HandleCors::class);

        $middleware->validateCsrfTokens(except: [
            'api/*',
            'hubs/*',
            'files/*',
            'avatars/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
