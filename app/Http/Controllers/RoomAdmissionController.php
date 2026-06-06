<?php

namespace App\Http\Controllers;

use App\Http\Services\RoomAdmissionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

class RoomAdmissionController extends Controller
{
    public function __construct(private readonly RoomAdmissionService $roomAdmissionService)
    {
        $this->middleware(['auth:api', 'role:admin']);
    }

    public function index(Request $request)
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        $filters = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|in:all,pending,admitted,transfer,discharged,cancelled',
            'department' => 'nullable|string|max:120',
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $this->roomAdmissionService->getAdmissions($admin, $filters),
        ]);
    }

    public function rooms()
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->roomAdmissionService->getRoomInventory($admin),
        ]);
    }

    public function departments()
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->roomAdmissionService->getDepartments($admin),
        ]);
    }

    public function store(Request $request)
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        $data = $request->validate([
            'patient_name' => 'required|string|max:255',
            'patient_id' => 'nullable',
            'patient_identifier' => 'nullable|string|max:100',
            'patient_age' => 'required|integer|min:0|max:120',
            'patient_gender' => 'required|in:Male,Female,Other',
            'contact_phone' => 'required|string|max:25',
            'emergency_contact_name' => 'required|string|max:255',
            'emergency_contact_phone' => 'required|string|max:25',
            'admission_type' => 'required|string|max:100',
            'department' => 'nullable|string|max:120',
            'attending_doctor' => 'required_without:doctor_id|string|max:255',
            'doctor_id' => 'nullable|integer|exists:doctors,id',
            'room_id' => 'required|integer|exists:rooms,id',
            'bed_id' => 'required|integer|exists:room_beds,id',
            'payer_type' => 'required|string|max:50',
            'estimated_stay_days' => 'required|integer|min:1|max:60',
            'priority' => 'required|in:Critical,High,Normal,Low',
            'notes' => 'nullable|string|max:2000',
            'actor' => 'nullable|string|max:120',
        ]);

        try {
            $result = $this->roomAdmissionService->createAdmission($admin, $data);

            return response()->json([
                'status' => 'success',
                'message' => 'Room admission created successfully.',
                'data' => $result,
            ], 201);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function updateStatus(Request $request, int $id)
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        $data = $request->validate([
            'status' => 'required|in:pending,admitted,transfer,discharged,cancelled',
            'note' => 'nullable|string|max:1000',
            'actor' => 'nullable|string|max:120',
        ]);

        try {
            $result = $this->roomAdmissionService->updateStatus(
                $admin,
                $id,
                $data['status'],
                $data['note'] ?? null,
                $data['actor'] ?? null,
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Admission status updated.',
                'data' => $result,
            ]);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function transfer(Request $request, int $id)
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        $data = $request->validate([
            'room_id' => 'required|integer|exists:rooms,id',
            'bed_id' => 'required|integer|exists:room_beds,id',
            'note' => 'nullable|string|max:1000',
            'actor' => 'nullable|string|max:120',
        ]);

        try {
            $result = $this->roomAdmissionService->transferBed($admin, $id, $data);

            return response()->json([
                'status' => 'success',
                'message' => 'Admission transferred successfully.',
                'data' => $result,
            ]);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function addNote(Request $request, int $id)
    {
        $admin = auth()->user()?->admin;
        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin profile not found.',
            ], 404);
        }

        $data = $request->validate([
            'note' => 'required|string|max:1500',
            'actor' => 'nullable|string|max:120',
        ]);

        try {
            $result = $this->roomAdmissionService->addProgressNote(
                $admin,
                $id,
                $data['note'],
                $data['actor'] ?? null,
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Progress note saved.',
                'data' => $result,
            ]);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        }
    }
}
