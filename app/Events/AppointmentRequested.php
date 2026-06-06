<?php

namespace App\Events;

use Illuminate\Support\Facades\Log;

use App\Models\Admin;
use App\Models\Appointment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentRequested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;
    public array $adminUserIds;

    public function __construct(Appointment $appointment)
    {
        // Fully load relationships needed for both logic and broadcasting
        $this->appointment = $appointment->load(['patient.user', 'doctor.user']);

        $department = $this->appointment->doctor->department;

        // Notify matching department admins AND all Super Admins
        $this->adminUserIds = Admin::where(function($q) use ($department) {
            $q->where('admin_role', 'Super Admin');
            if ($department) {
                $q->orWhere('department', $department);
            }
        })->pluck('user_id')->unique()->toArray();

        Log::info("AppointmentRequested event created for Dept: {$department}. Targeted User IDs: " . implode(', ', $this->adminUserIds));
    }

    public function broadcastOn(): array
    {
        // Broadcast to each matching department admin's private channel
        return array_map(
            fn($userId) => new PrivateChannel("user.{$userId}"),
            $this->adminUserIds
        );
    }

    public function broadcastAs(): string
    {
        return 'appointment.requested';
    }

    public function broadcastWith(): array
    {
        return [
            'id'               => $this->appointment->id,
            'patient_name'     => $this->appointment->patient->user->name,
            'appointment_date' => $this->appointment->appointment_date->format('Y-m-d'),
            'appointment_time' => $this->appointment->appointment_time,
            'type'             => $this->appointment->type,
            'department'       => $this->appointment->doctor->department,
            'message'          => 'New appointment request from ' . $this->appointment->patient->user->name,
        ];
    }
}
