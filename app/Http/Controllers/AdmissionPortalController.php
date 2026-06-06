<?php

namespace App\Http\Controllers;

use App\Http\Services\RoomAdmissionService;

class AdmissionPortalController extends Controller
{
    public function __construct(private readonly RoomAdmissionService $roomAdmissionService)
    {
        $this->middleware('auth:api');
        $this->middleware('role:patient')->only('patientAdmissions');
        $this->middleware('role:doctor')->only('doctorAdmissions');
    }

    public function patientAdmissions()
    {
        $patient = auth()->user()?->patient;

        if (!$patient) {
            return response()->json([
                'status' => 'error',
                'message' => 'Patient profile not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->roomAdmissionService->getPatientAdmissions($patient),
        ]);
    }

    public function doctorAdmissions()
    {
        $doctor = auth()->user()?->doctor;

        if (!$doctor) {
            return response()->json([
                'status' => 'error',
                'message' => 'Doctor profile not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->roomAdmissionService->getDoctorAdmissions($doctor),
        ]);
    }
}
