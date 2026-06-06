<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SocialAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\RoomAdmissionController;
use App\Http\Controllers\AdmissionPortalController;
use App\Http\Controllers\MedicineSuggestionController;

// ── Auth routes ───────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
    Route::post('logout',   [AuthController::class, 'logout'])->middleware('auth:api');
    Route::post('refresh',  [AuthController::class, 'refresh'])->middleware('auth:api');
    Route::get('me',        [AuthController::class, 'me'])->middleware('auth:api');

    // Google OAuth
    Route::get('google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
    Route::get('google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
});

// ── Protected routes ──────────────────────────────────────────
Route::middleware('auth:api')->group(function () {
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);

    // Notification routes
    Route::get('notifications',             [NotificationController::class, 'index']);
    Route::post('notifications/mark-read',  [NotificationController::class, 'markAllRead']);
    Route::delete('notifications/{id}',     [NotificationController::class, 'destroy']);

    // Patient routes
    Route::prefix('patient')->group(function () {
        Route::get('appointments/booked-slots', [AppointmentController::class, 'getBookedSlots']);
        Route::get('appointments',               [AppointmentController::class, 'patientIndex']);
        Route::get('room-admissions',            [AdmissionPortalController::class, 'patientAdmissions']);
        Route::post('appointments',              [AppointmentController::class, 'store']);
        Route::patch('appointments/{id}/cancel', [AppointmentController::class, 'cancel']);
        
        // Consultations
        Route::get('consultations/{appointmentId}', [\App\Http\Controllers\ConsultationController::class, 'patientShow']);

        // AI routes
        Route::post('ai/chat',                         [AiController::class, 'chat']);
        Route::post('ai/suggest-doctors',               [AiController::class, 'suggestDoctors']);
        Route::post('ai/prescription-summary/{id}',    [AiController::class, 'summarizePrescription']);
    });

    // Doctor routes
    Route::prefix('doctor')->group(function () {
        Route::get('appointments',                        [AppointmentController::class, 'doctorIndex']);
        Route::get('room-admissions',                     [AdmissionPortalController::class, 'doctorAdmissions']);
        Route::get('medicines/suggestions',               [MedicineSuggestionController::class, 'index']);
        Route::patch('appointments/{id}/status',          [AppointmentController::class, 'updateStatus']);
        Route::post('appointments/{id}/prescription',     [PrescriptionController::class, 'store']);
        Route::get('appointments/{id}/prescription/pdf',  [PrescriptionController::class, 'doctorPdf']);
        Route::get('available',                           [DoctorController::class, 'index']);
        Route::get('patient-profile/{patientId}',         [AppointmentController::class, 'getPatientProfile']);

        // Consultations
        Route::post('consultations/{appointmentId}/start', [\App\Http\Controllers\ConsultationController::class, 'start']);
        Route::post('consultations/{appointmentId}/end',   [\App\Http\Controllers\ConsultationController::class, 'end']);

        // AI routes
        Route::post('ai/patient-summary/{patientId}',      [AiController::class, 'summarizePatientHistory']);
    });

    // Patient prescription
    Route::get('patient/appointments/{id}/prescription', [PrescriptionController::class, 'show']);
    Route::get('patient/appointments/{id}/prescription/pdf', [PrescriptionController::class, 'patientPdf']);

    // Admin routes — role:admin enforced inside AdminController constructor
    Route::prefix('admin')->group(function () {
        // Read-only / general (any admin)
        Route::get('doctors',                  [AdminController::class, 'getDoctors']);
        Route::get('patients',                 [AdminController::class, 'getPatients']);
        Route::get('stats',                    [AdminController::class, 'getStats']);
        Route::get('me',                       [AdminController::class, 'me']);

        // Room admissions (read access for any admin)
        Route::get('room-admissions',                      [RoomAdmissionController::class, 'index']);
        Route::get('room-admissions/rooms',                [RoomAdmissionController::class, 'rooms']);
        Route::get('room-admissions/departments',          [RoomAdmissionController::class, 'departments']);

        // Room admission management (Front Desk Admin + Super Admin)
        Route::middleware('admin.admission.manage')->group(function () {
            Route::post('room-admissions',                 [RoomAdmissionController::class, 'store']);
            Route::patch('room-admissions/{id}/status',    [RoomAdmissionController::class, 'updateStatus']);
            Route::post('room-admissions/{id}/transfer',   [RoomAdmissionController::class, 'transfer']);
            Route::post('room-admissions/{id}/notes',      [RoomAdmissionController::class, 'addNote']);
        });

        // Department-admin appointment management
        Route::get('department-appointments',            [AdminController::class, 'getDepartmentAppointments']);
        Route::patch('appointments/{id}/status',         [AdminController::class, 'updateAppointmentStatus']);

        // Super Admin only — protected at route level
        Route::middleware('admin.super')->group(function () {
            Route::post('doctors',             [AdminController::class, 'createDoctor']);
            Route::post('admins',              [AdminController::class, 'createAdmin']);
            Route::get('appointments',         [AdminController::class, 'getAppointments']);
        });
    });
});