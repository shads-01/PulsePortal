<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentValidationAndSlotsTest extends TestCase
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

    private function book(array $overrides = [])
    {
        return $this->actingAs($this->patientUser, 'api')
            ->postJson('/api/patient/appointments', array_merge([
                'doctor_id' => $this->doctor->id,
                'appointment_date' => now()->addWeek()->toDateString(),
                'appointment_time' => '10:00:00',
                'type' => 'in_person',
                'symptoms' => 'I have a mild chest pain.'
            ], $overrides));
    }

    public function test_rejects_nonexistent_doctor()
    {
        $response = $this->book(['doctor_id' => 99999]);

        $response->assertStatus(422);
    }

    public function test_rejects_past_date()
    {
        $response = $this->book(['appointment_date' => now()->subWeek()->toDateString()]);

        $response->assertStatus(422);
    }

    public function test_rejects_bad_time_format()
    {
        $response = $this->book(['appointment_time' => '25:99']);

        $response->assertStatus(422);
    }

    public function test_rejects_bad_type()
    {
        $response = $this->book(['type' => 'house_call']);

        $response->assertStatus(422);
    }

    public function test_rejects_missing_symptoms()
    {
        $response = $this->book(['symptoms' => '']);

        $response->assertStatus(422);
    }

    public function test_duplicate_slot_returns_422()
    {
        $this->book()->assertStatus(201);

        // Second patient, same slot — unique index must block it.
        $secondUser = User::create([
            'name' => 'Jane Roe',
            'email' => 'jane@example.com',
            'password' => bcrypt('Password123'),
            'role' => 'patient'
        ]);
        Patient::create(['user_id' => $secondUser->id]);

        $response = $this->actingAs($secondUser, 'api')
            ->postJson('/api/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'appointment_date' => now()->addWeek()->toDateString(),
                'appointment_time' => '10:00:00',
                'type' => 'in_person',
                'symptoms' => 'Chest discomfort.'
            ]);

        $response->assertStatus(422);
    }

    public function test_cancelled_slot_becomes_bookable_again()
    {
        $this->book()->assertStatus(201);

        // Cancel it (frees the unique slot).
        $appointment = Appointment::where('doctor_id', $this->doctor->id)->first();
        $this->actingAs($this->patientUser, 'api')
            ->patchJson("/api/patient/appointments/{$appointment->id}/cancel")
            ->assertStatus(200);

        // Same slot now bookable again.
        $this->book()->assertStatus(201);
    }

    public function test_booked_slots_include_pending()
    {
        $this->book()->assertStatus(201);

        $response = $this->actingAs($this->patientUser, 'api')
            ->getJson('/api/patient/appointments/booked-slots?' . http_build_query([
                'doctor_id' => $this->doctor->id,
                'date' => now()->addWeek()->toDateString(),
            ]));

        $response->assertStatus(200);
        $this->assertContains('10:00', $response->json('data'));
    }

    public function test_doctor_cannot_set_invalid_status()
    {
        $this->book()->assertStatus(201);
        $appointment = Appointment::where('doctor_id', $this->doctor->id)->first();

        $response = $this->actingAs($this->doctorUser, 'api')
            ->patchJson("/api/doctor/appointments/{$appointment->id}/status", [
                'status' => 'hacked',
            ]);

        $response->assertStatus(422);
    }
}
