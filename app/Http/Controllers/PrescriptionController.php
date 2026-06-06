<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\Notification;
use App\Mail\SendPrescriptionToPatient;
use Illuminate\Support\Facades\Mail;
use Barryvdh\DomPDF\Facade\Pdf;

class PrescriptionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * POST /api/doctor/appointments/{id}/prescription
     * Doctor submits a prescription → saves it + marks appointment completed.
     */
    public function store(Request $request, $id)
    {
        $doctor = auth()->user()->doctor;

        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Doctor profile not found.'], 404);
        }

        $appointment = Appointment::where('id', $id)
            ->where('doctor_id', $doctor->id)
            ->where('status', 'confirmed')
            ->with(['patient.user', 'doctor.user'])
            ->first();

        if (!$appointment) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Appointment not found, not yours, or already completed.',
            ], 404);
        }

        $request->validate([
            'medicines'          => 'required|array|min:1',
            'medicines.*.name'   => 'required|string|max:255',
            'medicines.*.dosage' => 'nullable|string|max:255',
            'medicines.*.instruction' => 'nullable|string|max:500',
            'disease_or_problem' => 'nullable|string|max:500',
            'notes'              => 'nullable|string|max:2000',
            'recommended_tests'  => 'nullable|string|max:2000',
        ]);

        // Store prescription (medication as JSON)
        $prescription = Prescription::create([
            'appointment_id'     => $appointment->id,
            'disease_or_problem' => $request->input('disease_or_problem'),
            'medication'         => json_encode($request->input('medicines')),
            'instructions'       => $request->input('notes'),
            'recommended_tests'  => $request->input('recommended_tests'),
        ]);

        // Mark appointment completed
        $appointment->update(['status' => 'completed']);

        // Notify patient
        $doctorName    = $appointment->doctor->user->name;
        $patientUserId = $appointment->patient->user_id;

        Notification::create([
            'user_id'        => $patientUserId,
            'type'           => 'prescription',
            'title'          => 'Prescription Ready',
            'message'        => "Dr. {$doctorName} has uploaded your prescription. Your appointment is now completed.",
            'appointment_id' => $appointment->id,
            'link'           => '/patient/appointments',
            'is_read'        => false,
        ]);

        $pdfData = $this->buildPdfData($appointment, $prescription);
        $pdf = Pdf::loadView('emails.patients.prescription', ['prescription' => $pdfData]);
        $pdfContent = $pdf->output();

        // Send Email to Patient
        $patientEmail = $appointment->patient->user->email;
        if ($patientEmail) {
            Mail::to($patientEmail)->send(new SendPrescriptionToPatient(
                $appointment->patient->user->name,
                $pdfData,
                $pdfContent
            ));
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Prescription saved and appointment marked as completed.',
            'data'    => [
                'prescription_id' => $prescription->id,
                'appointment_id'  => $appointment->id,
            ],
        ]);
    }

    /**
     * GET /api/doctor/appointments/{id}/prescription/pdf
     * Doctor prints/downloads prescription PDF for own appointment.
     */
    public function doctorPdf($id)
    {
        $doctor = auth()->user()->doctor;

        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Doctor profile not found.'], 404);
        }

        $appointment = Appointment::where('id', $id)
            ->where('doctor_id', $doctor->id)
            ->with(['patient.user', 'doctor.user', 'prescriptions'])
            ->first();

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found or unauthorized.'], 404);
        }

        $prescription = $appointment->prescriptions->sortByDesc('id')->first();

        if (!$prescription) {
            return response()->json(['status' => 'error', 'message' => 'No prescription found for this appointment.'], 404);
        }

        $pdfData = $this->buildPdfData($appointment, $prescription);
        $pdf = Pdf::loadView('emails.patients.prescription', ['prescription' => $pdfData]);
        $fileName = "prescription-{$appointment->id}.pdf";

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$fileName}\"",
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    /**
     * GET /api/patient/appointments/{id}/prescription/pdf
     * Patient downloads prescription PDF for their own appointment.
     */
    public function patientPdf($id)
    {
        $patient = auth()->user()->patient;

        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Patient profile not found.'], 404);
        }

        $appointment = Appointment::where('id', $id)
            ->where('patient_id', $patient->id)
            ->with(['doctor.user', 'patient.user', 'prescriptions'])
            ->first();

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found.'], 404);
        }

        $prescription = $appointment->prescriptions->sortByDesc('id')->first();

        if (!$prescription) {
            return response()->json(['status' => 'error', 'message' => 'No prescription found for this appointment.'], 404);
        }

        $pdfData = $this->buildPdfData($appointment, $prescription);
        $pdf = Pdf::loadView('emails.patients.prescription', ['prescription' => $pdfData]);
        $fileName = "prescription-{$appointment->id}.pdf";

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    /**
     * GET /api/patient/appointments/{id}/prescription
     * Patient retrieves the prescription for one of their appointments.
     */
    public function show($id)
    {
        $patient = auth()->user()->patient;

        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Patient profile not found.'], 404);
        }

        $appointment = Appointment::where('id', $id)
            ->where('patient_id', $patient->id)
            ->with(['doctor.user', 'patient.user', 'prescriptions'])
            ->first();

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found.'], 404);
        }

        $prescription = $appointment->prescriptions->first();

        if (!$prescription) {
            return response()->json(['status' => 'error', 'message' => 'No prescription found for this appointment.'], 404);
        }

        // Decode medicines JSON
        $medicines = json_decode($prescription->medication, true) ?? [];

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'                 => $prescription->id,
                'disease_or_problem' => $prescription->disease_or_problem,
                'medicines'          => $medicines,
                'notes'              => $prescription->instructions,
                'recommended_tests'  => $prescription->recommended_tests,
                'created_at'         => $prescription->created_at,
                'doctor_name'        => $appointment->doctor->user->name ?? 'Unknown',
                'doctor_specialization' => $appointment->doctor->specialization ?? '',
                'doctor_license'     => $appointment->doctor->license_number ?? '',
                'doctor_department'  => $appointment->doctor->department ?? '',
                'patient_name'       => $appointment->patient->user->name ?? 'Unknown',
                'appointment_date'   => $appointment->appointment_date->format('Y-m-d'),
                'appointment_time'   => $appointment->appointment_time,
            ],
        ]);
    }

    private function buildPdfData(Appointment $appointment, Prescription $prescription): object
    {
        $medicines = json_decode($prescription->medication, true) ?? [];

        return (object) [
            'doctor_name'           => $appointment->doctor->user->name,
            'doctor_specialization' => $appointment->doctor->specialization,
            'doctor_license'        => $appointment->doctor->license_number,
            'patient_name'          => $appointment->patient->user->name,
            'disease_or_problem'    => $prescription->disease_or_problem,
            'medicines'             => $medicines,
            'notes'                 => $prescription->instructions,
            'recommended_tests'     => $prescription->recommended_tests,
            'appointment_date'      => $appointment->appointment_date,
            'appointment_time'      => $appointment->appointment_time,
        ];
    }
}
