<?php

namespace App\Http\Services;

use App\Mail\PatientWelcomeMail;
use App\Models\User;
use App\Models\Patient;
use Illuminate\Support\Facades\Hash;
use Mail;

class AuthService
{
    public function registerPatient(array $data): array
    {
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
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
        // Check if the user exists but has no password (Google-only account)
        $user = User::where('email', $credentials['email'])->first();

        if ($user && is_null($user->password)) {
            throw new \Exception('This account uses Google Sign-In. Please use the "Continue with Google" button.');
        }

        if (!$token = auth()->attempt($credentials)) {
            return null;
        }

        $user = auth()->user();

        // Update last login timestamp for Admins only
        if ($user->role === 'admin' && $user->admin) {
            $user->admin->update(['last_login_at' => now()]);
        }

        return [
            'token' => $token,
            'user'  => $this->formatUser($user),
        ];
    }

    private function formatUser(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role, // patient | doctor | admin
        ];
    }
}
