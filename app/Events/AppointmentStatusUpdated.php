<?php

namespace App\Events;

use Illuminate\Support\Facades\Log;

use App\Models\Appointment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment->load(['doctor.user', 'patient']);
        Log::info("AppointmentStatusUpdated event created for Patient User ID: " . $this->appointment->patient->user_id);
    }

    public function broadcastOn(): array
    {
        // Broadcast to the patient's specific channel
        return [
            new PrivateChannel("user.{$this->appointment->patient->user_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->appointment->id,
            'status' => $this->appointment->status,
            'doctor_name' => $this->appointment->doctor->user->name,
            'appointment_date' => $this->appointment->appointment_date->format('Y-m-d'),
            'message' => 'Your appointment with Dr. ' . $this->appointment->doctor->user->name . ' has been ' . $this->appointment->status,
        ];
    }
}
