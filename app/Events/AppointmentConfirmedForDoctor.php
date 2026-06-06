<?php

namespace App\Events;

use App\Models\Appointment;
use Illuminate\Support\Facades\Log;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentConfirmedForDoctor implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;


    public $appointment;
    /**
     * Create a new event instance.
     */
    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment->load(['doctor.user', 'patient.user']);
        Log::info("AppointmentConfirmedForDoctor event created for Doctor User ID: " . $this->appointment->doctor->user_id);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->appointment->doctor->user_id}"),        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.confirmed_for_doctor';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->appointment->id,
            'status' => $this->appointment->status,
            'patient_name' => $this->appointment->patient->user->name,
            'appointment_date' => $this->appointment->appointment_date->format('Y-m-d'),
            'message' => 'You have a new appointment from ' . $this->appointment->patient->user->name . ' on ' . $this->appointment->appointment_date->format('Y-m-d') . ' at ' . $this->appointment->appointment_time,
        ];
    }
}
