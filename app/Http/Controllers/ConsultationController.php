<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\ConsultationService;

class ConsultationController extends Controller
{
    private $consultationService;

    public function __construct(ConsultationService $consultationService)
    {
        $this->middleware('auth:api');
        $this->consultationService = $consultationService;
    }

    // POST /api/doctor/consultations/{appointmentId}/start
    public function start($appointmentId)
    {
        $doctor = auth()->user()->doctor;
        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $result = $this->consultationService->startConsultation($appointmentId, $doctor->id);
        
        if (!$result) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not valid for consultation.'], 400);
        }

        return response()->json(['status' => 'success', 'data' => $result]);
    }

    // POST /api/doctor/consultations/{appointmentId}/end
    public function end($appointmentId)
    {
        $doctor = auth()->user()->doctor;
        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $success = $this->consultationService->endConsultation($appointmentId, $doctor->id);

        if (!$success) {
            return response()->json(['status' => 'error', 'message' => 'Failed to end consultation.'], 400);
        }

        return response()->json(['status' => 'success', 'message' => 'Consultation ended.']);
    }

    // GET /api/patient/consultations/{appointmentId}
    public function patientShow($appointmentId)
    {
        $patient = auth()->user()->patient;
        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $result = $this->consultationService->getPatientConsultation($appointmentId, $patient->id);

        if (!$result) {
            return response()->json(['status' => 'waiting', 'message' => 'Consultation not started yet.']);
        }

        return response()->json(['status' => 'success', 'data' => $result]);
    }
}
