<?php

namespace App\Http\Services;

use App\Models\User;
use App\Models\Doctor;
use App\Models\Admin;
use App\Mail\WelcomeDoctorMail;
use App\Mail\AdminWelcomMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Mail;

class AdminService
{
    // Create a doctor account + doctor profile in one transaction
    public function createDoctor(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'doctor',
            ]);

            // Parse availability days into JSON
            $availability = null;
            if (!empty($data['availability_days'])) {
                $availability = ['days' => $data['availability_days']];
            }

            Doctor::create([
                'user_id' => $user->id,
                'specialization' => $data['specialization'],
                'bio' => $data['bio'] ?? null,
                'phone' => $data['phone'] ?? null,
                'consultation_fee' => $data['consultation_fee'] ?? 0,
                'availability' => $availability,
                'is_available' => true,
            ]);

            Mail::to($data['email'])->queue(new WelcomeDoctorMail($data['name'], $data['email'], $data['password']));

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'specialization' => $data['specialization'],
            ];
        });
    }

    // Create an admin account + admin profile in one transaction
    public function createAdmin(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
            ]);

            Admin::create([
                'user_id' => $user->id,
                'admin_role' => $data['admin_role'],
                'department' => $data['department'],
            ]);

            Mail::to($data['email'])->queue(new AdminWelcomMail($data['name'], $data['email'], $data['admin_role'], $data['department'], $data['password']));

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ];
        });
    }

    // Get all doctors
    public function getAllDoctors(): array
    {
        return \App\Models\Doctor::with('user')
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'user_id' => $d->user_id,
                'name' => $d->user->name,
                'email' => $d->user->email,
                'specialization' => $d->specialization,
                'phone' => $d->phone,
                'fee' => $d->consultation_fee,
                'is_available' => $d->is_available,
                'availability' => $d->availability,
            ])
            ->toArray();
    }

    // Get all patients
    public function getAllPatients(): array
    {
        return \App\Models\Patient::with('user')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'name' => $p->user->name,
                'email' => $p->user->email,
            ])
            ->toArray();
    }

    // Get all appointments for admin overview
    public function getAllAppointments(): array
    {
        return \App\Models\Appointment::with(['patient.user', 'doctor.user'])
            ->orderBy('appointment_date', 'desc')
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'patient_name' => $a->patient->user->name ?? 'Unknown',
                'doctor_name' => $a->doctor->user->name ?? 'Unknown',
                'specialization' => $a->doctor->specialization ?? '',
                'appointment_date' => $a->appointment_date,
                'appointment_time' => $a->appointment_time,
                'type' => $a->type,
                'status' => $a->status,
            ])
            ->toArray();
    }
}
