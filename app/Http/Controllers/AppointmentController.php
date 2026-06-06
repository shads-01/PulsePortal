<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\AppointmentService;

class AppointmentController extends Controller
{
    protected AppointmentService $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->middleware('auth:api');
        $this->appointmentService = $appointmentService;
    }

    // POST /api/patient/appointments
    public function store(Request $request)
    {
        $data = $request->all();

        $user    = auth()->user();
        $patient = $user->patient;

        if (!$patient) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Patient profile not found.',
            ], 404);
        }

        $appointment = $this->appointmentService->createAppointment($patient->id, $data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Appointment booked successfully.',
            'data'    => $appointment,
        ], 201);
    }

    // GET /api/patient/appointments
    public function patientIndex()
    {
        $patient = auth()->user()->patient;

        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Patient profile not found.'], 404);
        }

        $appointments = $this->appointmentService->getPatientAppointments($patient->id);

        return response()->json([
            'status' => 'success',
            'data'   => $appointments,
        ]);
    }

    // GET /api/doctor/appointments
    public function doctorIndex()
    {
        $doctor = auth()->user()->doctor;

        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Doctor profile not found.'], 404);
        }

        $appointments = $this->appointmentService->getDoctorAppointments($doctor->id);

        return response()->json([
            'status' => 'success',
            'data'   => $appointments,
        ]);
    }

    // PATCH /api/doctor/appointments/{id}/status  (doctor-only)
    public function updateStatus(Request $request, $id)
    {
        $data = $request->all();

        $doctor      = auth()->user()->doctor;
        $appointment = $this->appointmentService->updateAppointmentStatus($id, $data['status'], $doctor->id);

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found or unauthorized.'], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Appointment status updated.',
            'data'    => $appointment,
        ]);
    }

    // PATCH /api/patient/appointments/{id}/cancel
    public function cancel($id)
    {
        $patient     = auth()->user()->patient;
        $appointment = $this->appointmentService->cancelAppointment($id, $patient->id);

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found or unauthorized.'], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Appointment cancelled.',
            'data'    => $appointment,
        ]);
    }

    // GET /api/patient/appointments/booked-slots
    public function getBookedSlots(Request $request)
    {
        $doctorId = $request->query('doctor_id');
        $date = $request->query('date');

        if (!$doctorId || !$date) {
            return response()->json(['status' => 'error', 'message' => 'doctor_id and date are required parameters'], 400);
        }

        $slots = $this->appointmentService->getBookedSlots((int)$doctorId, $date);

        return response()->json([
            'status' => 'success',
            'data' => $slots
        ]);
    }

    // GET /api/doctor/patient-profile/{patientId}
    public function getPatientProfile($patientId)
    {
        $doctor = auth()->user()->doctor;
        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $profile = $this->appointmentService->getPatientProfileForDoctor((int)$patientId, $doctor->id);
        
        if (!$profile) {
            return response()->json(['status' => 'error', 'message' => 'Patient not found or no history with this doctor.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $profile,
        ]);
    }
}
