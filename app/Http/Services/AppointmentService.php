<?php

namespace App\Http\Services;

use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Patient;
use Illuminate\Support\Facades\Mail;
use App\Events\AppointmentRequested;
use App\Mail\PatientAppointmentDetails;
use App\Events\AppointmentStatusUpdated;
use App\Events\AppointmentConfirmedForDoctor;

class AppointmentService
{
    public function createAppointment(int $patientId, array $data): Appointment
    {
        $appointment = Appointment::create([
            'patient_id'       => $patientId,
            'doctor_id'        => $data['doctor_id'],
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'type'             => $data['type'] ?? 'in_person',
            'symptoms'         => $data['symptoms'],
            'status'           => 'pending',
        ]);

        // Load relationships needed for event + notification creation
        $appointment->load(['patient.user', 'doctor.user']);

        // Real-time broadcast
        broadcast(new AppointmentRequested($appointment))->toOthers();

        // Persist notification for every targeted admin
        $department = $appointment->doctor->department;
        $adminUserIds = Admin::where(function($q) use ($department) {
            $q->where('admin_role', 'Super Admin');
            if ($department) {
                $q->orWhere('department', $department);
            }
        })->pluck('user_id')->unique();

        $patientName = $appointment->patient->user->name;
        foreach ($adminUserIds as $adminUserId) {
            Notification::create([
                'user_id'        => $adminUserId,
                'type'           => 'request',
                'title'          => 'New Appointment Request',
                'message'        => "New appointment request from {$patientName}",
                'appointment_id' => $appointment->id,
                'link'           => '/admin/all-appointments',
                'is_read'        => false,
            ]);
        }

        Mail::to($appointment->patient->user->email)->send(new PatientAppointmentDetails($appointment));

        return $appointment;
    }

    public function getPatientAppointments(int $patientId)
    {
        return Appointment::with(['doctor.user'])
            ->where('patient_id', $patientId)
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->get()
            ->map(fn($a) => $this->formatAppointment($a));
    }

    public function getDoctorAppointments(int $doctorId)
    {
        return Appointment::with(['patient.user', 'prescriptions'])
            ->where('doctor_id', $doctorId)
            ->whereIn('status', ['pending', 'confirmed', 'in_progress', 'completed'])
            ->orderBy('appointment_date', 'asc')
            ->orderBy('appointment_time', 'asc')
            ->get()
            ->map(fn($a) => $this->formatAppointmentForDoctor($a));
    }

    /**
     * Get appointments filtered by the admin's department.
     */
    public function getDepartmentAppointments(Admin $admin)
    {
        $query = Appointment::with(['patient.user', 'doctor.user']);

        if ($admin->admin_role !== 'Super Admin' && $admin->department) {
            // Filter to only appointments for doctors in this department
            $query->whereHas('doctor', fn($q) => $q->where('department', $admin->department));
        }

        return $query
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->get()
            ->map(fn($a) => $this->formatAppointmentForAdmin($a));
    }

    /**
     * Get a patient's profile and recent history for a specific doctor.
     */
    public function getPatientProfileForDoctor(int $patientId, int $doctorId)
    {
        $patient = \App\Models\Patient::with('user')->find($patientId);
        
        if (!$patient) return null;

        // Verify the doctor has seen this patient (optional security check)
        $hasHistory = Appointment::where('patient_id', $patientId)->where('doctor_id', $doctorId)->exists();
        if (!$hasHistory) return null;

        $recentAppointments = Appointment::with(['doctor.user'])
            ->where('patient_id', $patientId)
            ->where('doctor_id', $doctorId) // Only history with this doctor
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($a) {
                return [
                    'id'               => $a->id,
                    'doctor_name'      => $a->doctor->user->name ?? 'Unknown',
                    'appointment_date' => $this->formatAppointmentDate($a->appointment_date),
                    'status'           => $a->status,
                    'symptoms'         => $a->symptoms,
                ];
            });

        return [
            'id'                  => $patient->id,
            'name'                => $patient->user->name ?? 'Unknown',
            'email'               => $patient->user->email ?? 'Unknown',
            'blood_group'         => $patient->blood_group,
            'dob'                 => $patient->dob ? $patient->dob->format('Y-m-d') : null,
            'phone'               => $patient->phone,
            'address'             => $patient->address,
            'emergency_contact'   => $patient->emergency_contact,
            'emergency_phone'     => $patient->emergency_phone,
            'medical_history'     => $patient->medical_history,
            'recent_appointments' => $recentAppointments,
        ];
    }

    /**
     * Allow admin OR doctor to update appointment status.
     */
    public function updateAppointmentStatus(int $appointmentId, string $status, ?int $doctorId = null): ?Appointment
    {
        $query = Appointment::where('id', $appointmentId);

        // If doctorId is provided, restrict to that doctor's appointments (doctor workflow)
        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        $appointment = $query->first();

        if (!$appointment) return null;

        $appointment->update(['status' => $status]);

        // Reload for relationships
        $appointment->load(['patient.user', 'doctor.user']);

        // Notify the patient via WebSocket
        broadcast(new AppointmentStatusUpdated($appointment))->toOthers();

        // Persist notification for the patient
        $doctorName  = $appointment->doctor->user->name;
        $patientUserId = $appointment->patient->user_id;
        Notification::create([
            'user_id'        => $patientUserId,
            'type'           => 'status',
            'title'          => 'Appointment Updated',
            'message'        => "Your appointment with Dr. {$doctorName} has been {$status}",
            'appointment_id' => $appointment->id,
            'link'           => '/patient/appointments',
            'is_read'        => false,
        ]);

        // Notify the patient via email for major status changes
        if (in_array($status, ['confirmed', 'cancelled'])) {
            Mail::to($appointment->patient->user->email)->send(new PatientAppointmentDetails($appointment));

            if ($status === 'confirmed') {
                broadcast(new AppointmentConfirmedForDoctor($appointment))->toOthers();

                // Persist notification for the doctor
                $patientName  = $appointment->patient->user->name;
                $appointDate  = $this->formatAppointmentDate($appointment->appointment_date);
                $appointTime  = $appointment->appointment_time;
                Notification::create([
                    'user_id'        => $appointment->doctor->user_id,
                    'type'           => 'confirmed_doctor',
                    'title'          => 'New Appointment Confirmed',
                    'message'        => "You have a new appointment from {$patientName} on {$appointDate} at {$appointTime}",
                    'appointment_id' => $appointment->id,
                    'link'           => '/doctor/appointments',
                    'is_read'        => false,
                ]);
            }
        }

        return $appointment;
    }

    /**
     * Regenerate the patient's medical_history field using AI.
     * Gathers all completed appointments and produces a concise summary.
     */
    private function regenerateMedicalHistory(int $patientId): void
    {
        $patient = Patient::find($patientId);
        if (!$patient) return;

        // Gather all completed appointments with their details
        $completedAppointments = Appointment::with(['doctor.user', 'visitNote', 'prescriptions'])
            ->where('patient_id', $patientId)
            ->where('status', 'completed')
            ->orderBy('appointment_date', 'asc')
            ->get();

        if ($completedAppointments->isEmpty()) return;

        // Build a context string from appointment data
        $appointmentSummaries = $completedAppointments->map(function ($appt) {
            $parts = [
                "Date: {$this->formatAppointmentDate($appt->appointment_date)}",
                "Doctor: " . ($appt->doctor->user->name ?? 'Unknown'),
                "Specialization: " . ($appt->doctor->specialization ?? 'Unknown'),
                "Symptoms: {$appt->symptoms}",
            ];

            if ($appt->visitNote) {
                $parts[] = "Doctor Notes: {$appt->visitNote->doctor_notes}";
            }

            if ($appt->prescriptions->isNotEmpty()) {
                $meds = $appt->prescriptions->map(fn($p) =>
                    ($p->disease_or_problem ? "{$p->disease_or_problem}: " : '') . $p->medication
                )->implode('; ');
                $parts[] = "Prescriptions: {$meds}";
            }

            return implode(' | ', $parts);
        })->implode("\n");

        $systemPrompt = <<<PROMPT
You are a medical records assistant. Your job is to write a concise medical history summary for a patient based on their appointment records.

Guidelines:
- Write in third person (e.g., "Patient has a history of...")
- Keep it to 2-4 sentences maximum
- Highlight key conditions, recurring issues, and treatments
- Mention relevant specializations consulted
- Be factual and concise — this will be displayed on the patient's profile
- If the patient has had only one appointment, still summarize it meaningfully
- Do NOT include dates unless they are medically relevant
PROMPT;

        $userMessage = "Generate a medical history summary based on these appointment records:\n\n{$appointmentSummaries}";

        $aiService = app(AiService::class);
        $summary   = $aiService->chat($systemPrompt, $userMessage);

        // Update the patient's medical_history field
        $patient->update(['medical_history' => trim($summary)]);
    }

    public function cancelAppointment(int $appointmentId, int $patientId): ?Appointment
    {
        $appointment = Appointment::where('id', $appointmentId)
            ->where('patient_id', $patientId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->first();

        if (!$appointment) return null;

        $appointment->update(['status' => 'cancelled']);
        $appointment->load(['patient.user', 'doctor.user']);

        broadcast(new AppointmentStatusUpdated($appointment))->toOthers();

        // Persist cancellation notification for the patient
        $doctorName = $appointment->doctor->user->name;
        Notification::create([
            'user_id'        => $appointment->patient->user_id,
            'type'           => 'status',
            'title'          => 'Appointment Cancelled',
            'message'        => "Your appointment with Dr. {$doctorName} has been cancelled",
            'appointment_id' => $appointment->id,
            'link'           => '/patient/appointments',
            'is_read'        => false,
        ]);

        return $appointment;
    }

    public function getBookedSlots(int $doctorId, string $date): array
    {
        return Appointment::where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->where('status', 'confirmed')
            ->pluck('appointment_time')
            ->toArray();
    }

    private function formatAppointment(Appointment $a): array
    {
        $serviceHoursLabel = $this->resolveDoctorServiceHoursLabel($a->doctor?->availability);

        return [
            'id'               => $a->id,
            'doctor_id'        => $a->doctor_id,
            'doctor_name'      => $a->doctor->user->name ?? 'Unknown',
            'specialization'   => $a->doctor->specialization ?? '',
            'department'       => $a->doctor->department ?? '',
            'doctor_service_hours' => $serviceHoursLabel,
            'appointment_date' => $this->formatAppointmentDate($a->appointment_date),
            'appointment_time' => $a->appointment_time,
            'type'             => $a->type,
            'status'           => $a->status,
            'symptoms'         => $a->symptoms,
        ];
    }

    private function resolveDoctorServiceHoursLabel(?array $availability): ?string
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
            return $this->formatHourRange((string) $serviceHours['start'], (string) $serviceHours['end']);
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

        return $this->formatHourRange((string) $starts->first(), (string) $ends->last());
    }

    private function formatHourRange(string $start, string $end): string
    {
        $startLabel = date('h:i A', strtotime($start));
        $endLabel = date('h:i A', strtotime($end));

        return "{$startLabel} - {$endLabel}";
    }

    private function formatAppointmentDate($value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        $timestamp = strtotime((string) $value);

        return $timestamp !== false ? date('Y-m-d', $timestamp) : '';
    }

    private function formatAppointmentForDoctor(Appointment $a): array
    {
        return [
            'id'               => $a->id,
            'patient_id'       => $a->patient_id,
            'patient_name'     => $a->patient->user->name ?? 'Unknown',
            'appointment_date' => $this->formatAppointmentDate($a->appointment_date),
            'appointment_time' => $a->appointment_time,
            'type'             => $a->type,
            'status'           => $a->status,
            'symptoms'         => $a->symptoms,
            'has_prescription'  => $a->prescriptions->isNotEmpty(),
        ];
    }

    private function formatAppointmentForAdmin(Appointment $a): array
    {
        return [
            'id'               => $a->id,
            'patient_name'     => $a->patient->user->name ?? 'Unknown',
            'doctor_name'      => $a->doctor->user->name ?? 'Unknown',
            'specialization'   => $a->doctor->specialization ?? '',
            'department'       => $a->doctor->department ?? '',
            'appointment_date' => $this->formatAppointmentDate($a->appointment_date),
            'appointment_time' => $a->appointment_time,
            'type'             => $a->type,
            'status'           => $a->status,
            'symptoms'         => $a->symptoms,
        ];
    }
}
