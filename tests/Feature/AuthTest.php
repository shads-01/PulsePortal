<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class AuthTest extends TestCase
{
    use RefreshDatabase;

    // Patient valid registration
    public function test_patient_can_register()
    {
        $this->withoutExceptionHandling();
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',   
            'password_confirmation' => 'Password1',  
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'success');
    }

    public function test_weak_password()
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'password',   // no uppercase or number
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422); //422 - for unprocessable content
    }

    public function test_duplicate_email()
    {
        $data = [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',
            'password_confirmation' => 'Password1',
        ];

        $this->postJson('/api/auth/register', $data); 
        $response = $this->postJson('/api/auth/register', $data); // duplicate

        $response->assertStatus(422); 
    }

    public function test_user_login() {
        $data = [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',   
            'password_confirmation' => 'Password1',
        ];

        $this->postJson('/api/auth/register', $data);
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'patient.test@gmail.com',
            'password' => 'Password1',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success');
    }

    public function test_login_wrong_password() {
        $data = [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',   
            'password_confirmation' => 'Password1',
        ];

        $this->postJson('/api/auth/register', $data);
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'patient.test@gmail.com',
            'password' => 'password', // Incorrect password
        ]);

        $response->assertStatus(401) // 401 - Unauthorized
                 ->assertJsonPath('status', 'error');
    }

    public function test_login_wrong_email() {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'patient.test.2@gmail.com', // Wrong email
            'password' => 'Password1',
        ]);

        $response->assertStatus(401)
                 ->assertJsonPath('status', 'error');
    }

    public function test_user_can_logout() {
        $this->postJson('/api/auth/register', [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email'    => 'patient.test@gmail.com',
            'password' => 'Password1',
        ]);

        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/auth/logout');

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success');
    }

    public function test_authenticated_user_get_profile() {
        $this->postJson('/api/auth/register', [
            'name'                  => 'Test Patient',
            'email'                 => 'patient.test@gmail.com',
            'password'              => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email'    => 'patient.test@gmail.com',
            'password' => 'Password1',
        ]);

        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/auth/me');

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success');
    }

    public function test_unauthenticated_user_cannot_get_profile() {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }
}