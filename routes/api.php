<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SocialAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\AdminController;

// ── Auth routes ───────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
    Route::post('logout',   [AuthController::class, 'logout'])->middleware('auth:api');
    Route::get('me',        [AuthController::class, 'me'])->middleware('auth:api');

    // Google OAuth
    Route::get('google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
    Route::get('google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
});

// ── Protected routes ──────────────────────────────────────────
Route::middleware('auth:api')->group(function () {
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);

    // Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    //     return $request->user();
    // });

    // Patient routes
    Route::prefix('patient')->group(function () {
        Route::get('appointments',              [AppointmentController::class, 'patientIndex']);
        Route::post('appointments',             [AppointmentController::class, 'store']);
        Route::patch('appointments/{id}/cancel', [AppointmentController::class, 'cancel']);
    });

    // Doctor routes
    Route::prefix('doctor')->group(function () {
        Route::get('appointments',                      [AppointmentController::class, 'doctorIndex']);
        Route::patch('appointments/{id}/status',        [AppointmentController::class, 'updateStatus']);
        Route::get('available',                         [DoctorController::class, 'index']);
    });

    // Admin routes — role:admin enforced inside AdminController constructor
    Route::prefix('admin')->group(function () {
        Route::post('doctors',       [AdminController::class, 'createDoctor']);
        Route::post('admins',        [AdminController::class, 'createAdmin']);
        Route::get('doctors',        [AdminController::class, 'getDoctors']);
        Route::get('patients',       [AdminController::class, 'getPatients']);
        Route::get('appointments',   [AdminController::class, 'getAppointments']);
        Route::get('stats',          [AdminController::class, 'getStats']);
    });
});
