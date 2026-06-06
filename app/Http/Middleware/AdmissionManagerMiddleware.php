<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdmissionManagerMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = auth()->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        $admin = $user->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        if (!in_array($admin->admin_role, ['Super Admin', 'Front Desk Admin'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only Front Desk Admin and Super Admin can manage room admissions.',
            ], 403);
        }

        return $next($request);
    }
}
