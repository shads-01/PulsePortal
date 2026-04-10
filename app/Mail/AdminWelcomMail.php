<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminWelcomMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $adminName;
    public $loginEmail;
    public $department;
    public $role;
    public $temporaryPassword;

    /**
     * Create a new message instance.
     */
    public function __construct($name, $email, $admin_role, $department, $password)
    {
        $this->adminName = $name;
        $this->loginEmail = $email;
        $this->role = $admin_role;
        $this->department = $department;       
        $this->temporaryPassword = $password;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to PulsePortal, Admin: ' . $this->adminName,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.welcomeAdmins',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
