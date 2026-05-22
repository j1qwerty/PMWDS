<?php

namespace App\Support;

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    public function issue(User $user, array $roles): array
    {
        $now = time();
        $expiryMinutes = (int) config('pmwds.jwt.expiry_minutes', 480);
        $exp = $now + ($expiryMinutes * 60);

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'name' => $user->full_name,
            'DepartmentId' => $user->department_id ?? '',
            'role' => $roles,
            'jti' => (string) \Illuminate\Support\Str::uuid(),
            'iss' => config('pmwds.jwt.issuer'),
            'aud' => config('pmwds.jwt.audience'),
            'iat' => $now,
            'exp' => $exp,
        ];

        $token = JWT::encode(
            $payload,
            config('pmwds.jwt.secret'),
            'HS256'
        );

        return [
            'token' => $token,
            'expiry' => now()->utc()->addMinutes($expiryMinutes)->toIso8601String(),
        ];
    }

    public function decode(string $token): object
    {
        return JWT::decode(
            $token,
            new Key(config('pmwds.jwt.secret'), 'HS256')
        );
    }
}
