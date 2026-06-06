<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentBookingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup initial data for testing
        $this->doctorUser = User::create([
            'name' => 'Dr. Smith',
            'email' => 'smith@hospital.com',
            'password' => bcrypt('Password123'),
            'role' => 'doctor'
        ]);

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialization' => 'Cardiology',
            'department' => 'Cardiology'
        ]);

        $this->patientUser = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => bcrypt('Password123'),
            'role' => 'patient'
        ]);

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'phone' => '1234567890'
        ]);
    }

    public function test_patient_can_book_appointment()
    {
        $response = $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'appointment_date' => '2026-05-20',
                'appointment_time' => '10:00',
                'type' => 'in_person',
                'symptoms' => 'I have a mild chest pain.'
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-05-20 00:00:00'
        ]);
    }

    public function test_cannot_book_without_patient_profile()
    {
        $incompleteUser = User::create([
            'name' => 'Broken Patient',
            'email' => 'broken@example.com',
            'password' => bcrypt('Password123'),
            'role' => 'patient'
        ]);

        $response = $this->actingAs($incompleteUser, 'api')
            ->postJson('/api/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'appointment_date' => '2026-05-20',
                'appointment_time' => '10:00'
            ]);

        $response->assertStatus(404)
            ->assertJsonPath('message', 'Patient profile not found.');
    }

    public function test_patient_can_view_their_appointments()
    {
        Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-05-20',
            'appointment_time' => '10:00',
            'type' => 'in_person',
            'symptoms' => 'Regular checkup',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/patient/appointments');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data');
    }
}
