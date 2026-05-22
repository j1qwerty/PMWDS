<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\CurrentUserService;
use App\Support\JwtService;
use Closure;
use Firebase\JWT\ExpiredException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthenticate
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly CurrentUserService $currentUser,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            $token = $request->query('access_token');
        } else {
            $token = substr($header, 7);
        }

        if (empty($token)) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        try {
            $payload = $this->jwt->decode($token);
        } catch (ExpiredException) {
            return response()->json(['message' => 'Token expired.'], 401);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid token.'], 401);
        }

        $userId = $payload->sub ?? null;
        if (! $userId) {
            return response()->json(['message' => 'Invalid token.'], 401);
        }

        $user = User::with(['roles', 'department', 'departmentAssignments.department.organization', 'skills.skill', 'profile'])
            ->find($userId);

        if (! $user || ! $user->is_active) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $roles = is_array($payload->role ?? null)
            ? $payload->role
            : (array) ($payload->role ?? $user->roles->pluck('name')->all());

        $this->currentUser->setUser($user, $roles);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
