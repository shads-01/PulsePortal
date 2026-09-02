<?php

namespace App\Http\Services;

use App\Mail\PatientWelcomeMail;
use App\Models\User;
use App\Models\Patient;
use App\Rules\AllowedEmailDomain;
use App\Rules\PersonName;
use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Mail;

class AuthService
{
    public function registerPatient(array $data): array
    {
        $validator = Validator::make($data, [
            'name'     => ['required', 'string', 'min:2', 'max:255', new PersonName()],
            'email'    => [
                'required',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'unique:users,email',
                new AllowedEmailDomain(),
            ],
            'password' => [
                'required',
                'string',
                new StrongPassword(),
                'confirmed',
            ],
        ], [
            'password.min'   => 'Password must be at least 8 characters.',
            'email.unique'   => 'This email is already registered.',
        ]);

        $validatedData = $validator->validate();

        $user = User::create([
            'name'     => $validatedData['name'],
            'email'    => $validatedData['email'],
            'password' => Hash::make($validatedData['password']),
            'role'     => 'patient', // always forced — cannot be changed by user input
        ]);

        // Create the empty patient profile immediately
        Patient::create(['user_id' => $user->id]);

        $token = auth()->login($user);
        
        Mail::to($user->email)->queue(new PatientWelcomeMail($user->name));

        return [
            'token' => $token,
            'user'  => $this->formatUser($user),
        ];
    }

    public function login(array $credentials): ?array
    {
        $validator = Validator::make($credentials, [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);
        
        $validatedData = $validator->validate();

        // Check if the user exists but has no password (Google-only account)
        $user = User::where('email', $validatedData['email'])->first();

        if ($user && is_null($user->password)) {
            throw new \Exception('This account uses Google Sign-In. Please use the "Continue with Google" button.');
        }

        if (!$token = auth()->attempt($validatedData)) {
            return null;
        }

        $user = auth()->user();

        return [
            'token' => $token,
            'user'  => $this->formatUser($user),
        ];
    }

    private function formatUser(User $user): array
    {
        $data = [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role, // patient | doctor | admin
        ];

        if ($user->role === 'admin' && $user->admin) {
            $data['admin_role'] = $user->admin->admin_role;
            $data['department'] = $user->admin->department;
        }

        return $data;
    }
}
