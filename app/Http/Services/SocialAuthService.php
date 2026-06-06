<?php

namespace App\Http\Services;

use App\Models\User;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthService
{
    /**
     * Build the Google OAuth redirect URL (stateless, no session needed).
     */
    public function getGoogleRedirectUrl(): string
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();
    }

    /**
     * Exchange the Google callback code for a user,
     * find or create the user, then return a JWT token + user data.
     *
     * Logic:
     *  1. google_id already in DB → return existing user
     *  2. Email exists but no google_id → link Google to existing account
     *  3. Completely new → create user (patient) + patient profile
     */
    public function handleGoogleCallback(): array
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = DB::transaction(function () use ($googleUser) {

            // 1. Check if a user with this google_id already exists
            $existing = User::where('google_id', $googleUser->getId())->first();

            if ($existing) {
                return $existing;
            }

            // 2. Check if a user with this email exists (registered manually)
            $existing = User::where('email', $googleUser->getEmail())->first();

            if ($existing) {
                // Link Google account to the existing user
                $existing->update(['google_id' => $googleUser->getId()]);
                return $existing;
            }

            // 3. Brand-new user — create as patient
            $user = User::create([
                'name'      => $googleUser->getName(),
                'email'     => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'password'  => null,
                'role'      => 'patient',
            ]);

            Patient::create(['user_id' => $user->id]);

            return $user;
        });

        // Issue JWT
        $token = auth()->login($user);

        return [
            'token' => $token,
            'user'  => $this->formatUser($user),
        ];
    }

    /**
     * Format user data for the frontend redirect URL.
     */
    private function formatUser(User $user): array
    {
        $data = [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ];

        if ($user->role === 'admin' && $user->admin) {
            $data['admin_role'] = $user->admin->admin_role;
            $data['department'] = $user->admin->department;
        }

        return $data;
    }
}
