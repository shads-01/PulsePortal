<?php

namespace App\Http\Services;

use App\Models\User;
use App\Models\Doctor;
use App\Models\Admin;
use App\Models\Patient;
use App\Models\Appointment;
use App\Mail\WelcomeDoctorMail;
use App\Mail\AdminWelcomMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AdminService
{
    // Create a doctor account + doctor profile in one transaction.
    // Expects $data already validated by the controller.
    public function createDoctor(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $availabilityDays = $data['availability_days'] ?? [];
            $serviceStartTime = $data['service_start_time'] ?? '09:00';
            $serviceEndTime   = $data['service_end_time'] ?? '17:00';

            if ($availabilityDays !== [] && $serviceStartTime >= $serviceEndTime) {
                throw ValidationException::withMessages([
                    'service_end_time' => 'Service end time must be after service start time.',
                ]);
            }

            $availability = $this->buildAvailabilitySchedule(
                $availabilityDays,
                $serviceStartTime,
                $serviceEndTime,
            );

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'doctor',
            ]);

            Doctor::create([
                'user_id'          => $user->id,
                'specialization'   => $data['specialization'],
                'department'       => $data['department'] ?? null,
                'bio'              => $data['bio'] ?? null,
                'phone'            => $data['phone'] ?? null,
                'consultation_fee' => $data['consultation_fee'] ?? 0,
                'availability'     => $availability,
                'is_available'     => true,
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

    // Create an admin account + admin profile in one transaction.
    // Expects $data already validated by the controller.
    public function createAdmin(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $department = $data['department'] ?? null;
            if (is_string($department) && trim($department) === '') {
                $department = null;
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
            ]);

            Admin::create([
                'user_id' => $user->id,
                'admin_role' => $data['admin_role'],
                'department' => $department,
            ]);

            Mail::to($data['email'])->queue(new AdminWelcomMail($data['name'], $data['email'], $data['admin_role'], $department ?? 'Not Assigned', $data['password']));

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
                'id'             => $d->id,
                'user_id'        => $d->user_id,
                'name'           => $d->user->name,
                'email'          => $d->user->email,
                'specialization' => $d->specialization,
                'department'     => $d->department,
                'phone'          => $d->phone,
                'fee'            => $d->consultation_fee,
                'is_available'   => $d->is_available,
                'availability'   => $d->availability,
                'service_hours'  => $this->extractServiceHours($d->availability),
                'service_hours_label' => $this->formatServiceHoursLabel($d->availability),
            ])
            ->toArray();
    }

    private function buildAvailabilitySchedule(array $availabilityDays, string $startTime, string $endTime): ?array
    {
        if ($availabilityDays === []) {
            return null;
        }

        $dayMap = [
            'SUN' => 'sun',
            'MON' => 'mon',
            'TUE' => 'tue',
            'WED' => 'wed',
            'THU' => 'thu',
            'FRI' => 'fri',
            'SAT' => 'sat',
        ];

        $availability = [
            'days' => array_values($availabilityDays),
            'service_hours' => [
                'start' => $startTime,
                'end' => $endTime,
            ],
        ];

        foreach ($availabilityDays as $dayCode) {
            $normalizedDayCode = strtoupper((string) $dayCode);
            $dayKey = $dayMap[$normalizedDayCode] ?? null;
            if (!$dayKey) {
                continue;
            }

            $availability[$dayKey] = [$startTime, $endTime];
        }

        return $availability;
    }

    private function extractServiceHours(?array $availability): ?array
    {
        if (!is_array($availability)) {
            return null;
        }

        $serviceHours = $availability['service_hours'] ?? null;
        if (
            is_array($serviceHours) &&
            !empty($serviceHours['start']) &&
            !empty($serviceHours['end'])
        ) {
            return [
                'start' => (string) $serviceHours['start'],
                'end' => (string) $serviceHours['end'],
            ];
        }

        $dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $ranges = collect($dayKeys)
            ->map(fn ($day) => $availability[$day] ?? null)
            ->filter(fn ($range) => is_array($range) && count($range) === 2)
            ->values();

        if ($ranges->isEmpty()) {
            return null;
        }

        $starts = $ranges->map(fn ($range) => (string) $range[0])->sort()->values();
        $ends = $ranges->map(fn ($range) => (string) $range[1])->sort()->values();

        return [
            'start' => $starts->first(),
            'end' => $ends->last(),
        ];
    }

    private function formatServiceHoursLabel(?array $availability): ?string
    {
        $serviceHours = $this->extractServiceHours($availability);
        if (!$serviceHours) {
            return null;
        }

        $start = date('h:i A', strtotime($serviceHours['start']));
        $end = date('h:i A', strtotime($serviceHours['end']));

        return "{$start} - {$end}";
    }

    // Get all patients
    public function getAllPatients(): array
    {
        return \App\Models\Patient::with('user')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'patient_id' => 'PT-' . str_pad((string) $p->id, 5, '0', STR_PAD_LEFT),
                'user_id' => $p->user_id,
                'name' => $p->user->name,
                'email' => $p->user->email,
                'phone' => $p->phone,
                'emergency_contact' => $p->emergency_contact,
                'emergency_phone' => $p->emergency_phone,
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
                'id'               => $a->id,
                'patient_name'     => $a->patient->user->name ?? 'Unknown',
                'doctor_name'      => $a->doctor->user->name ?? 'Unknown',
                'specialization'   => $a->doctor->specialization ?? '',
                'department'       => $a->doctor->department ?? '',
                'appointment_date' => $a->appointment_date,
                'appointment_time' => $a->appointment_time,
                'type'             => $a->type,
                'status'           => $a->status,
            ])
            ->toArray();
    }

    public function getStats(): array
    {
        $today = now()->toDateString();
        return [
            'total_doctors' => Doctor::count(),
            'total_patients' => Patient::count(),
            'appointments_today' => Appointment::whereDate('appointment_date', $today)->count(),
            'upcoming_appointments' => Appointment::whereIn('status', ['pending', 'confirmed'])->count(),
        ];
    }
}
