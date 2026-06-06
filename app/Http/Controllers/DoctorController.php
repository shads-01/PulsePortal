<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Http\Services\DoctorService;

class DoctorController extends Controller
{
    protected DoctorService $doctorService;

    public function __construct(DoctorService $doctorService)
    {
        $this->middleware('auth:api');
        $this->doctorService = $doctorService;
    }

    // GET /api/doctor/available
    public function index()
    {
        $doctors = $this->doctorService->getAvailableDoctors();

        return response()->json([
            'status' => 'success',
            'data'   => $doctors,
        ]);
    }
}
