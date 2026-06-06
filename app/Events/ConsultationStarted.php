<?php

namespace App\Events;

use App\Models\Appointment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConsultationStarted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;
    public $message;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
        $doctorName = $appointment->doctor->user->name ?? 'Your Doctor';
        $this->message = "Dr. {$doctorName} has started the video consultation. Please join now.";
    }

    public function broadcastOn()
    {
        // Broadcast to the specific patient
        return new PrivateChannel('user.' . $this->appointment->patient->user->id);
    }

    public function broadcastAs()
    {
        return 'consultation.started';
    }

    public function broadcastWith()
    {
        return [
            'appointment_id' => $this->appointment->id,
            'message'        => $this->message,
            'doctor_name'    => $this->appointment->doctor->user->name ?? 'Your Doctor',
        ];
    }
}
