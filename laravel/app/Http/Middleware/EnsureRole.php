<?php

namespace App\Http\Middleware;

use App\Services\CurrentUserService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if ($this->currentUser->hasAnyRole($roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden.'], 403);
    }
}
