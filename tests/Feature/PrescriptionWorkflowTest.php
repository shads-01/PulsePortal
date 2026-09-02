<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Appointment;
use App\Models\Consultation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrescriptionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

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

    private function prescriptionPayload(): array
    {
        return [
            'medicines' => [
                ['name' => 'Napa', 'dosage' => '500mg', 'instruction' => '1+0+1 after meal'],
            ],
            'disease_or_problem' => 'Mild hypertension',
            'notes' => 'Follow up in 2 weeks.',
            'recommended_tests' => 'Blood pressure monitoring',
        ];
    }

    public function test_doctor_can_prescribe_for_confirmed_appointment()
    {
        $appointment = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '10:00',
            'type' => 'in_person',
            'status' => 'confirmed',
            'symptoms' => 'Headache',
        ]);

        $response = $this->actingAs($this->doctorUser, 'api')
            ->postJson("/api/doctor/appointments/{$appointment->id}/prescription", $this->prescriptionPayload());

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }

    public function test_doctor_can_prescribe_after_consultation_ended()
    {
        // Bug fix: ending an online consultation completes the appointment,
        // which previously locked out prescribing forever.
        $appointment = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => now()->format('H:i'),
            'type' => 'online',
            'status' => 'completed',
            'symptoms' => 'Fever',
        ]);

        Consultation::create([
            'appointment_id' => $appointment->id,
            'room_name' => 'PP-test-' . $appointment->id,
            'started_at' => now()->subHour(),
            'ended_at' => now()->subMinutes(10),
        ]);

        $response = $this->actingAs($this->doctorUser, 'api')
            ->postJson("/api/doctor/appointments/{$appointment->id}/prescription", $this->prescriptionPayload());

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }

    public function test_cannot_prescribe_twice()
    {
        $appointment = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '10:00',
            'type' => 'in_person',
            'status' => 'confirmed',
            'symptoms' => 'Headache',
        ]);

        $this->actingAs($this->doctorUser, 'api')
            ->postJson("/api/doctor/appointments/{$appointment->id}/prescription", $this->prescriptionPayload())
            ->assertStatus(200);

        $response = $this->actingAs($this->doctorUser, 'api')
            ->postJson("/api/doctor/appointments/{$appointment->id}/prescription", $this->prescriptionPayload());

        $response->assertStatus(409);
    }

    public function test_cannot_prescribe_for_cancelled_appointment()
    {
        $appointment = Appointment::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '10:00',
            'type' => 'in_person',
            'status' => 'cancelled',
            'symptoms' => 'Headache',
        ]);

        $response = $this->actingAs($this->doctorUser, 'api')
            ->postJson("/api/doctor/appointments/{$appointment->id}/prescription", $this->prescriptionPayload());

        $response->assertStatus(404);
    }
}
