<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Admin;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\VisitNote;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin
        $adminUser = User::create([
            'name'     => 'System Admin',
            'email'    => 'admin@pulseportal.com',
            'password' => Hash::make('password123'),
            'role'     => 'admin',
        ]);
        Admin::create(['user_id' => $adminUser->id]);

        // Doctor
        $doctorUser = User::create([
            'name'     => 'Dr. Sarah Khan',
            'email'    => 'doctor@pulseportal.com',
            'password' => Hash::make('password123'),
            'role'     => 'doctor',
        ]);
        $doctor = Doctor::create([
            'user_id'          => $doctorUser->id,
            'specialization'   => 'Cardiology',
            'bio'              => 'Senior Cardiologist with 10+ years experience.',
            'phone'            => '01711000001',
            'consultation_fee' => 800.00,
            'is_available'     => true,
            'availability'     => [
                'mon' => ['09:00', '17:00'],
                'tue' => ['09:00', '17:00'],
                'wed' => ['09:00', '17:00'],
                'thu' => ['09:00', '17:00'],
                'fri' => ['09:00', '13:00'],
            ],
        ]);

        // Patient
        $patientUser = User::create([
            'name'     => 'Rahim Uddin',
            'email'    => 'patient@pulseportal.com',
            'password' => Hash::make('password123'),
            'role'     => 'patient',
        ]);
        $patient = Patient::create([
            'user_id'           => $patientUser->id,
            'dob'               => '1990-05-15',
            'blood_group'       => 'O+',
            'medical_history'   => 'Mild hypertension diagnosed 2022.',
            'phone'             => '01811000002',
            'address'           => 'Mirpur-10, Dhaka',
            'emergency_contact' => 'Karim Uddin',
            'emergency_phone'   => '01911000003',
        ]);

        // Sample appointment
        $appointment = Appointment::create([
            'patient_id'       => $patient->id,
            'doctor_id'        => $doctor->id,
            'appointment_date' => '2025-03-15',
            'appointment_time' => '10:00:00',
            'type'             => 'in_person',
            'status'           => 'completed',
            'symptoms'         => 'Chest tightness and occasional shortness of breath.',
            'admin_notes'      => 'Scheduled at Room 204.',
        ]);

                Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-15',
    'appointment_time' => '09:00:00',
    'type'             => 'in_person',
    'status'           => 'pending',
    'symptoms'         => 'Headache and dizziness',
    'admin_notes'      => 'First visit',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-16',
    'appointment_time' => '10:00:00',
    'type'             => 'online',
    'status'           => 'confirmed',
    'symptoms'         => 'Fever and cough',
    'admin_notes'      => 'Follow-up required',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-17',
    'appointment_time' => '11:00:00',
    'type'             => 'in_person',
    'status'           => 'completed',
    'symptoms'         => 'Chest pain',
    'admin_notes'      => 'ECG done',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-18',
    'appointment_time' => '12:00:00',
    'type'             => 'online',
    'status'           => 'cancelled',
    'symptoms'         => 'Back pain',
    'admin_notes'      => 'Cancelled by patient',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-19',
    'appointment_time' => '13:00:00',
    'type'             => 'in_person',
    'status'           => 'pending',
    'symptoms'         => 'Stomach pain',
    'admin_notes'      => 'Waiting for test',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-20',
    'appointment_time' => '14:00:00',
    'type'             => 'online',
    'status'           => 'confirmed',
    'symptoms'         => 'Skin allergy',
    'admin_notes'      => 'Prescribed medicine',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-21',
    'appointment_time' => '15:00:00',
    'type'             => 'in_person',
    'status'           => 'completed',
    'symptoms'         => 'BP checkup',
    'admin_notes'      => 'Stable condition',
]);

Appointment::create([
    'patient_id'       => $patient->id,
    'doctor_id'        => $doctor->id,
    'appointment_date' => '2025-03-22',
    'appointment_time' => '16:00:00',
    'type'             => 'online',
    'status'           => 'pending',
    'symptoms'         => 'Migraine',
    'admin_notes'      => 'MRI suggested',
]);

        // Sample visit note
        VisitNote::create([
            'appointment_id' => $appointment->id,
            'doctor_notes'   => 'BP stable at 130/85. ECG normal. Prescribed Amlodipine 5mg once daily. Review in 4 weeks.',
        ]);
        // \App\Models\User::factory(10)->create();

        // \App\Models\User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);
    }
}
