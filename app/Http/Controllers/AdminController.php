<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\AdminService;
use App\Http\Services\AppointmentService;

class AdminController extends Controller
{
    protected AdminService $adminService;
    protected AppointmentService $appointmentService;

    public function __construct(AdminService $adminService, AppointmentService $appointmentService)
    {
        $this->middleware(['auth:api', 'role:admin']);
        $this->adminService       = $adminService;
        $this->appointmentService = $appointmentService;
    }

    // POST /api/admin/doctors  — Super Admin only
    public function createDoctor(Request $request)
    {

        $data = $request->validate([
            'name'              => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\-\.]+$/u'],
            'email'             => ['required', 'email', 'unique:users,email', 'regex:/^[a-zA-Z0-9._%+\-]+@(gmail\.com|yahoo\.com|outlook\.com|aust\.edu|pulseportal\.com)$/'],
            'password'          => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'],
            'specialization'    => 'required|string|max:100',
            'department'        => 'required|string|max:100',
            'bio'               => 'nullable|string|max:1000',
            'phone'             => 'nullable|string|max:20',
            'consultation_fee'  => 'nullable|numeric|min:0',
            'availability_days' => 'nullable|array',
            'availability_days.*' => 'string|in:SUN,MON,TUE,WED,THU,FRI,SAT',
            'service_start_time' => 'nullable|date_format:H:i',
            'service_end_time' => 'nullable|date_format:H:i|after:service_start_time',
        ], [
            'email.regex'    => 'Only gmail.com, yahoo.com, outlook.com, aust.edu, and pulseportal.com emails are allowed.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
            'name.regex'     => 'Name can only contain letters, spaces, hyphens, and dots.',
        ]);

        $result = $this->adminService->createDoctor($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Doctor account created successfully.',
            'data'    => $result,
        ], 201);
    }

    // POST /api/admin/admins  — Super Admin only
    public function createAdmin(Request $request)
    {

        $data = $request->validate([
            'name'       => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\-\.]+$/u'],
            'email'      => ['required', 'email', 'unique:users,email', 'regex:/^[a-zA-Z0-9._%+\-]+@(gmail\.com|yahoo\.com|outlook\.com|aust\.edu|pulseportal\.com)$/'],
            'password'   => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'],
            'admin_role' => 'required|string|max:100',
            'department' => 'required_unless:admin_role,Super Admin,Front Desk Admin|nullable|string|max:100',
            'phone'      => 'nullable|string|max:20',
        ], [
            'email.regex'    => 'Only gmail.com, yahoo.com, outlook.com, aust.edu, and pulseportal.com emails are allowed.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
            'name.regex'     => 'Name can only contain letters, spaces, hyphens, and dots.',
        ]);

        if (in_array($data['admin_role'], ['Super Admin', 'Front Desk Admin'], true)) {
            $data['department'] = null;
        }

        $result = $this->adminService->createAdmin($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Admin account created successfully.',
            'data'    => $result,
        ], 201);
    }

    // GET /api/admin/doctors
    public function getDoctors()
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->adminService->getAllDoctors(),
        ]);
    }

    // GET /api/admin/patients
    public function getPatients()
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->adminService->getAllPatients(),
        ]);
    }

    // GET /api/admin/appointments  — All appointments (Super Admin overview)
    public function getAppointments()
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->adminService->getAllAppointments(),
        ]);
    }

    // GET /api/admin/department-appointments  — Filtered by admin's department
    public function getDepartmentAppointments()
    {
        $admin = auth()->user()->admin;

        if (!$admin) {
            return response()->json(['status' => 'error', 'message' => 'Admin profile not found.'], 404);
        }

        $appointments = $this->appointmentService->getDepartmentAppointments($admin);

        return response()->json([
            'status' => 'success',
            'data'   => $appointments,
        ]);
    }

    // PATCH /api/admin/appointments/{id}/status  — For department admin approval
    public function updateAppointmentStatus(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:confirmed,cancelled,completed',
        ]);

        $appointment = $this->appointmentService->updateAppointmentStatus($id, $data['status']);

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found.'], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Appointment status updated.',
            'data'    => $appointment,
        ]);
    }

    // GET /api/admin/stats
    public function getStats()
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_doctors'          => \App\Models\Doctor::count(),
                'total_patients'         => \App\Models\Patient::count(),
                'appointments_today'     => \App\Models\Appointment::whereDate('appointment_date', now()->toDateString())->count(),
                'upcoming_appointments'  => \App\Models\Appointment::whereIn('status', ['pending', 'confirmed'])->count(),
            ],
        ]);
    }

    // GET /api/admin/me  — Returns the logged-in admin's profile including role and department
    public function me()
    {
        $user  = auth()->user();
        $admin = $user->admin;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'admin_role' => $admin?->admin_role,
                'department' => $admin?->department,
            ],
        ]);
    }
}
