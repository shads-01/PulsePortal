<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Admin;
use App\Models\Doctor;
use App\Models\Patient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleBasedAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create an Admin User
        $this->adminUser = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@pulseportal.com',
            'password' => bcrypt('Password123'),
            'role' => 'admin'
        ]);
        Admin::create([
            'user_id' => $this->adminUser->id,
            'admin_role' => 'Super Admin'
        ]);

        // Create a Doctor User
        $this->doctorUser = User::create([
            'name' => 'Dr. House',
            'email' => 'house@pulseportal.com',
            'password' => bcrypt('Password123'),
            'role' => 'doctor'
        ]);
        Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialization' => 'Diagnostics',
            'department' => 'Medicine'
        ]);

        // Create a Patient User
        $this->patientUser = User::create([
            'name' => 'Patient Zero',
            'email' => 'patient@gmail.com',
            'password' => bcrypt('Password123'),
            'role' => 'patient'
        ]);
        Patient::create([
            'user_id' => $this->patientUser->id
        ]);
    }

    /**
     * Test Admin Access
     */
    public function test_admin_can_access_admin_stats()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson('/api/admin/stats');

        $response->assertStatus(200);
    }

    public function test_patient_cannot_access_admin_stats()
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/admin/stats');

        $response->assertStatus(403);
    }

    /**
     * Test Doctor Access
     */
    public function test_doctor_can_access_doctor_appointments()
    {
        $response = $this->actingAs($this->doctorUser, 'api')
            ->getJson('/api/doctor/appointments');

        $response->assertStatus(200);
    }

    public function test_patient_cannot_access_doctor_appointments()
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/doctor/appointments');

        $response->assertStatus(404); // The controller returns 404 if doctor profile not found for user
    }

    /**
     * Test Guest Access
     */
    public function test_guest_cannot_access_protected_routes()
    {
        $response = $this->getJson('/api/profile');

        $response->assertStatus(401);
    }

    /**
     * Test Super Admin Middleware
     */
    public function test_regular_admin_cannot_access_super_admin_routes()
    {
        // Create a regular department admin
        $deptAdminUser = User::create([
            'name' => 'Dept Admin',
            'email' => 'dept@pulseportal.com',
            'password' => bcrypt('Password123'),
            'role' => 'admin'
        ]);
        Admin::create([
            'user_id' => $deptAdminUser->id,
            'admin_role' => 'Department Admin',
            'department' => 'Cardiology'
        ]);

        // Route restricted to super admins (create doctor)
        $response = $this->actingAs($deptAdminUser, 'api')
            ->postJson('/api/admin/doctors', []);

        $response->assertStatus(403);
    }
}
