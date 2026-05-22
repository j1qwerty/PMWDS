<?php

namespace App\Support;

class PasswordHasher
{
    public static function hash(string $password, string $userId): string
    {
        return base64_encode(hash('sha256', trim($password).$userId, true));
    }

    public static function hashToken(string $token): string
    {
        return bin2hex(hash('sha256', trim($token), true));
    }

    public static function verify(string $password, string $userId, ?string $storedHash, string $employeeCode): bool
    {
        $normalized = trim($password);
        if ($normalized === '') {
            return false;
        }

        if (! empty($storedHash)) {
            return self::hash($normalized, $userId) === $storedHash;
        }

        return in_array($normalized, [
            'Pmwds@123',
            'Admin@12345!',
            $employeeCode,
            "{$employeeCode}@123",
        ], true);
    }
}
