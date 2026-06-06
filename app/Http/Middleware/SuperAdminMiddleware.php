<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SuperAdminMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = auth()->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $admin = $user->admin;

        if (!$admin || $admin->admin_role !== 'Super Admin') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthorized. Super Admin access required.',
            ], 403);
        }

        return $next($request);
    }
}
