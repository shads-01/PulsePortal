<?php

namespace App\Http\Services;

use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\Notification;
use App\Events\ConsultationStarted;
use App\Mail\ConsultationStartedMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ConsultationService
{
    public function startConsultation(int $appointmentId, int $doctorId): ?array
    {
        $appointment = Appointment::where('id', $appointmentId)
            ->where('doctor_id', $doctorId)
            ->where('type', 'online')
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->first();

        if (!$appointment) {
            return null;
        }

        // If consultation doesn't exist, create it
        $consultation = Consultation::where('appointment_id', $appointmentId)->first();
        
        if (!$consultation) {
            $roomName = 'PP-' . Str::random(10) . '-' . $appointmentId;
            $consultation = Consultation::create([
                'appointment_id' => $appointmentId,
                'room_name'      => $roomName,
                'started_at'     => now(),
            ]);

            // Update appointment status to in_progress
            $appointment->update(['status' => 'in_progress']);

            // Broadcast websocket event to patient
            $appointment->load(['patient.user', 'doctor.user']);
            broadcast(new ConsultationStarted($appointment))->toOthers();

            // Persist notification for the patient
            $doctorName = $appointment->doctor->user->name;
            Notification::create([
                'user_id'        => $appointment->patient->user_id,
                'type'           => 'consultation',
                'title'          => 'Consultation Started',
                'message'        => "Dr. {$doctorName} has started your online video consultation.",
                'appointment_id' => $appointment->id,
                'link'           => "/patient/consultation/{$appointment->id}",
                'is_read'        => false,
            ]);

            // Send Email to patient
            Mail::to($appointment->patient->user->email)->queue(new ConsultationStartedMail($appointment));
        }

        return [
            'room_name' => $consultation->room_name,
            'started_at' => $consultation->started_at,
            'status' => 'in_progress',
        ];
    }

    public function endConsultation(int $appointmentId, int $doctorId): bool
    {
        $appointment = Appointment::where('id', $appointmentId)
            ->where('doctor_id', $doctorId)
            ->first();

        if (!$appointment) {
            return false;
        }

        $consultation = Consultation::where('appointment_id', $appointmentId)->first();
        if ($consultation) {
            $consultation->update(['ended_at' => now()]);
        }

        $appointment->update(['status' => 'completed']);

        return true;
    }

    public function getPatientConsultation(int $appointmentId, int $patientId): ?array
    {
        $appointment = Appointment::with('consultation')
            ->where('id', $appointmentId)
            ->where('patient_id', $patientId)
            ->first();

        if (!$appointment || !$appointment->consultation) {
            return null;
        }

        if ($appointment->status === 'completed' || $appointment->consultation->ended_at) {
            return ['status' => 'ended'];
        }

        return [
            'status'     => 'started',
            'room_name'  => $appointment->consultation->room_name,
            'started_at' => $appointment->consultation->started_at,
        ];
    }
}
