<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SendPrescriptionToPatient extends Mailable
{
    use Queueable, SerializesModels;
    
    public $patientName;
    public $prescription;
    public $pdfContent;

    /**
     * Create a new message instance.
     */
    public function __construct($patientName, $prescription, $pdfContent)
    {
        $this->patientName  = $patientName;
        $this->prescription = $prescription;
        $this->pdfContent   = $pdfContent;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Hello! ' . $this->patientName . ', Your Prescription is Ready',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.patients.prescription',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            \Illuminate\Mail\Mailables\Attachment::fromData(fn () => $this->pdfContent, 'prescription.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
