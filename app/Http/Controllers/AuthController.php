<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\AuthService;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
        $this->middleware('auth:api')->except(['login', 'register']);
    }

    public function register(Request $request)
    {
        try {
            $result = $this->authService->registerPatient($request->all());

            return response()->json([
                'status'  => 'success',
                'message' => 'Registration successful',
                'data'    => $result,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $result = $this->authService->login($request->all());

            if (!$result) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Invalid email or password',
                ], 401);
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Login successful',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    // POST /api/auth/logout
    public function logout()
    {
        auth()->logout();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logged out successfully',
        ]);
    }

    // GET /api/auth/me
    public function me()
    {
        $user = auth()->user();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ]);
    }

    // POST /api/auth/refresh
    public function refresh()
    {
        try {
            $newToken = auth()->refresh();
            return response()->json([
                'status' => 'success',
                'data' => [
                    'token' => $newToken,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token cannot be refreshed',
            ], 401);
        }
    }
}
