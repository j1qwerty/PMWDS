<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Transformers\UserTransformer;
use App\Models\Role;
use App\Models\User;
use App\Services\CurrentUserService;
use App\Support\JwtService;
use App\Support\PasswordHasher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly CurrentUserService $currentUser,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with('roles')->where('email', strtolower(trim($request->email)))->first();
        if (! $user || ! $user->is_active || ! PasswordHasher::verify(
            $request->password,
            $user->id,
            $user->password_hash,
            $user->employee_code
        )) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $roles = $user->roles->pluck('name')->all();
        $token = $this->jwt->issue($user, $roles);

        return response()->json([
            'token' => $token['token'],
            'expiry' => $token['expiry'],
            'userId' => $user->id,
            'fullName' => $user->full_name,
            'email' => $user->email,
            'profilePictureUrl' => $user->profile_picture_url,
            'roles' => $roles,
        ]);
    }

    public function signup(Request $request): JsonResponse
    {
        $request->validate([
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        $email = strtolower(trim($request->email));
        if (User::where('email', $email)->exists()) {
            return response()->json(['message' => "A user with email '{$email}' already exists."], 409);
        }

        $viewer = Role::where('name', 'Viewer')->first();
        if (! $viewer) {
            return response()->json(['message' => 'Viewer role was not found.'], 400);
        }

        $user = new User([
            'email' => $email,
            'first_name' => $request->firstName,
            'last_name' => $request->lastName,
            'employee_code' => strtoupper(Str::random(8)),
            'job_title' => $request->jobTitle ?? 'Viewer',
            'created_by' => 'signup',
            'availability_status' => 'Available',
        ]);
        $user->save();
        $user->password_hash = PasswordHasher::hash($request->password, $user->id);
        $user->save();
        $user->roles()->attach($viewer->id);

        $user->load('roles');

        return response()->json(UserTransformer::toArray($user));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->where('is_active', true)->first();

        if ($user) {
            $token = Str::random(64);
            $user->password_reset_token_hash = PasswordHasher::hashToken($token);
            $user->password_reset_token_expires_at = now()->utc()->addMinutes(
                max((int) config('pmwds.email.password_reset_minutes', 60), 5)
            );
            $user->save();

            $resetUrl = rtrim(config('pmwds.email.client_base_url'), '/')
                .'/reset-password?email='.urlencode($email).'&token='.urlencode($token);

            try {
                Mail::raw("Reset your password: {$resetUrl}", fn ($m) => $m
                    ->to($email)
                    ->subject('Reset your PMWDS password'));
            } catch (\Throwable) {
                // Log-only in dev when mail is not configured
            }
        }

        return response()->json(['message' => 'If the email exists, a password reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required',
            'newPassword' => 'required|min:6',
        ]);

        $user = User::where('email', strtolower(trim($request->email)))->first();
        $hash = PasswordHasher::hashToken($request->token);

        if (! $user || $user->password_reset_token_hash !== $hash
            || ! $user->password_reset_token_expires_at
            || $user->password_reset_token_expires_at->isPast()) {
            return response()->json(['message' => 'Password reset link is invalid or expired.'], 400);
        }

        $user->password_hash = PasswordHasher::hash($request->newPassword, $user->id);
        $user->password_reset_token_hash = null;
        $user->password_reset_token_expires_at = null;
        $user->save();

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'oldPassword' => 'required',
            'newPassword' => 'required|min:6',
        ]);

        $user = $this->currentUser->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (! PasswordHasher::verify($request->oldPassword, $user->id, $user->password_hash, $user->employee_code)) {
            return response()->json(['message' => 'Current password is incorrect.'], 400);
        }

        $user->password_hash = PasswordHasher::hash($request->newPassword, $user->id);
        $user->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function refresh(): JsonResponse
    {
        $user = $this->currentUser->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $roles = $this->currentUser->roles();
        $token = $this->jwt->issue($user, $roles);

        return response()->json([
            'token' => $token['token'],
            'expiry' => $token['expiry'],
        ]);
    }
}
