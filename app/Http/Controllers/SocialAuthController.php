<?php

namespace App\Http\Controllers;

use App\Http\Services\SocialAuthService;
use Illuminate\Support\Facades\Log;

class SocialAuthController extends Controller
{
    protected SocialAuthService $socialAuthService;

    public function __construct(SocialAuthService $socialAuthService)
    {
        $this->socialAuthService = $socialAuthService;
    }

    /**
     * GET /api/auth/google/redirect
     * Returns the Google OAuth URL for the frontend to redirect to.
     */
    public function redirectToGoogle()
    {
        try {
            $url = $this->socialAuthService->getGoogleRedirectUrl();

            return response()->json([
                'status' => 'success',
                'data'   => ['url' => $url],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Could not generate Google redirect URL.',
            ], 500);
        }
    }

    /**
     * GET /api/auth/google/callback
     * Google redirects here after user authorises.
     * Delegates to the service, then redirects to the React app with JWT.
     */
    public function handleGoogleCallback()
    {
        try {
            $result = $this->socialAuthService->handleGoogleCallback();

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $token       = $result['token'];
            $userData    = urlencode(json_encode($result['user']));

            return redirect("{$frontendUrl}/auth/google/callback?token={$token}&user={$userData}");
        } catch (\Exception $e) {
            Log::error('Google Auth Error: ' . $e->getMessage(), [
                'exception' => $e,
                'trace'     => $e->getTraceAsString()
            ]);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $error       = urlencode('Google authentication failed. Please try again.');

            return redirect("{$frontendUrl}/auth?error={$error}");
        }
    }
}