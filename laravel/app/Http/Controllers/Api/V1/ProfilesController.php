<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfilesController extends Controller
{
    public function show(string $userId): JsonResponse
    {
        $profile = UserProfile::where('user_id', $userId)->first();

        return response()->json($profile ?? ['userId' => $userId]);
    }

    public function update(Request $request, string $userId): JsonResponse
    {
        $profile = UserProfile::firstOrCreate(
            ['user_id' => $userId],
            ['created_by' => 'api']
        );
        $profile->fill([
            'job_title' => $request->jobTitle ?? $profile->job_title,
            'bio' => $request->bio ?? $profile->bio,
            'linkedin_url' => $request->linkedinUrl ?? $profile->linkedin_url,
            'preferences' => json_encode($request->preferences ?? []),
        ])->save();

        return response()->json($profile);
    }
}
