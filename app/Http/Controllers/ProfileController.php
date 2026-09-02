<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Admin;
use App\Rules\AllowedEmailDomain;
use App\Rules\PersonName;
use App\Rules\StrongPassword;

class ProfileController extends Controller
{
    // GET /api/profile
    public function show(Request $request)
    {
        $user = auth()->user();

        $profile = match ($user->role) {
            'patient' => Patient::where('user_id', $user->id)->first(),
            'doctor'  => Doctor::where('user_id', $user->id)->first(),
            'admin'   => Admin::where('user_id', $user->id)->first(),
            default   => null,
        };

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
                'profile' => $profile,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = auth()->user();

        $validatedData = $request->validate([
            'name'     => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:255',
                new PersonName(),
            ],
            'email'    => [
                'sometimes',
                'required',
                'email',
                'unique:users,email,' . $user->id,
                new AllowedEmailDomain(),
            ],
            'password' => [
                'nullable',
                'string',
                new StrongPassword(),
            ],
        ]);

        if ($request->has('name')) {
            $user->name = $validatedData['name'];
        }
        if ($request->has('email')) {
            $user->email = $validatedData['email'];
        }
        if (!empty($validatedData['password'])) {
            $user->password = bcrypt($validatedData['password']);
        }
        $user->save();

        if ($user->role === 'patient') {
            $patient = Patient::where('user_id', $user->id)->first();
            if ($patient) {
                $patient->update([
                    'dob'               => $request->input('dob', $patient->dob),
                    'blood_group'       => $request->input('bloodGroup', $patient->blood_group),
                    'medical_history'   => $request->input('medicalHistory', $patient->medical_history),
                    'phone'             => $request->input('phone', $patient->phone),
                    'address'           => $request->input('address', $patient->address),
                    'emergency_contact' => $request->input('emergencyContact', $patient->emergency_contact),
                    'emergency_phone'   => $request->input('emergencyPhone', $patient->emergency_phone),
                ]);
            }
        } elseif ($user->role === 'doctor') {
            $doctor = Doctor::where('user_id', $user->id)->first();
            if ($doctor) {
                $doctor->update([
                    'specialization'   => $request->input('specialization', $doctor->specialization),
                    'bio'              => $request->input('bio', $doctor->bio),
                    'phone'            => $request->input('phone', $doctor->phone),
                    'availability'     => $request->input('availability', $doctor->availability),
                    'license_number'   => $request->input('licenseNumber', $doctor->license_number),
                ]);
            }
        }

        $profile = match ($user->role) {
            'patient' => Patient::where('user_id', $user->id)->first(),
            'doctor'  => Doctor::where('user_id', $user->id)->first(),
            'admin'   => Admin::where('user_id', $user->id)->first(),
            default   => null,
        };

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully',
            'data'   => [
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
                'profile' => $profile,
            ],
        ]);
    }
}
