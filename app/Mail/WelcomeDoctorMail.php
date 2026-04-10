<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeDoctorMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $doctorName;
    public $loginEmail;
    public $tempPassword;

    /**
     * Create a new message instance.
     */
    public function __construct($doctorName, $loginEmail, $tempPassword )
    {
        $this->doctorName = $doctorName;
        $this->loginEmail = $loginEmail;
        $this->tempPassword = $tempPassword;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to PulsePortal, Dr. ' . $this->doctorName,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.doctors.welcome',
        );
    }
}
