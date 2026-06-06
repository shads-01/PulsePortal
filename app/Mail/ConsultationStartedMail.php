<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ConsultationStartedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $appointment;
    public $joinLink;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->joinLink = "{$frontendUrl}/patient/consultation/{$appointment->id}";
    }

    public function build()
    {
        $doctorName = $this->appointment->doctor->user->name ?? 'Your Doctor';
        return $this->subject("Consultation Started - {$doctorName}")
                    ->html("
                        <h2>Your Video Consultation is Ready</h2>
                        <p>Dr. {$doctorName} has started the video session for your appointment.</p>
                        <p>Please click the link below to join the consultation immediately:</p>
                        <p><a href='{$this->joinLink}' style='display:inline-block;padding:10px 20px;background-color:#3b82f6;color:white;text-decoration:none;border-radius:5px;'>Join Consultation</a></p>
                    ");
    }
}
