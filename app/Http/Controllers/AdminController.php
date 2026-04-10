<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\AdminService;

class AdminController extends Controller
{
    protected AdminService $adminService;

    public function __construct(AdminService $adminService)
    {
        $this->middleware(['auth:api', 'role:admin']);
        $this->adminService = $adminService;
    }

    // POST /api/admin/doctors
    public function createDoctor(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\-\.]+$/u'],
            'email' => ['required', 'email', 'unique:users,email', 'regex:/^[a-zA-Z0-9._%+\-]+@(gmail\.com|yahoo\.com|outlook\.com|aust\.edu|pulseportal\.com)$/'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'],
            'specialization' => 'required|string|max:100',
            'bio' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:20',
            'consultation_fee' => 'nullable|numeric|min:0',
            'availability_days' => 'nullable|array',
            'availability_days.*' => 'string|in:SUN,MON,TUE,WED,THU,FRI,SAT',
        ], [
            'email.regex' => 'Only gmail.com, yahoo.com, outlook.com, aust.edu, and pulseportal.com emails are allowed.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
            'name.regex' => 'Name can only contain letters, spaces, hyphens, and dots.',
        ]);

        $result = $this->adminService->createDoctor($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Doctor account created successfully.',
            'data' => $result,
        ], 201);
    }

    // POST /api/admin/admins
    public function createAdmin(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\-\.]+$/u'],
            'email' => ['required', 'email', 'unique:users,email', 'regex:/^[a-zA-Z0-9._%+\-]+@(gmail\.com|yahoo\.com|outlook\.com|aust\.edu|pulseportal\.com)$/'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'],
            'admin_role' => 'required|string|max:100',
            'department' => 'required_unless:admin_role,Super Admin|nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
        ], [
            'email.regex' => 'Only gmail.com, yahoo.com, outlook.com, aust.edu, and pulseportal.com emails are allowed.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
            'name.regex' => 'Name can only contain letters, spaces, hyphens, and dots.',
        ]);

        $result = $this->adminService->createAdmin($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Admin account created successfully.',
            'data' => $result,
        ], 201);
    }

    // GET /api/admin/doctors
    public function getDoctors()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->adminService->getAllDoctors(),
        ]);
    }

    // GET /api/admin/patients
    public function getPatients()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->adminService->getAllPatients(),
        ]);
    }

    // GET /api/admin/appointments
    public function getAppointments()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->adminService->getAllAppointments(),
        ]);
    }

    // GET /api/admin/stats
    public function getStats()
    {
        $today = now()->toDateString();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_doctors' => \App\Models\Doctor::count(),
                'total_patients' => \App\Models\Patient::count(),
                'appointments_today' => \App\Models\Appointment::whereDate('appointment_date', $today)->count(),
                'upcoming_appointments' => \App\Models\Appointment::whereIn('status', ['pending', 'confirmed'])->count(),
            ],
        ]);
    }
}
