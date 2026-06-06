<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Room;
use App\Models\RoomAdmission;
use App\Models\RoomBed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomAdmissionApiTest extends TestCase
{
    use RefreshDatabase;

    private int $admissionSequence = 1;

    public function test_front_desk_admin_can_run_full_room_admission_lifecycle(): void
    {
        $frontDeskUser = $this->createAdminUser(
            name: 'Front Desk Manager',
            email: 'frontdesk.lifecycle@pulseportal.test',
            adminRole: 'Front Desk Admin',
        );

        $sourceRoom = $this->createRoomWithBeds(
            roomNumber: 'TEST-LC-101',
            department: 'Cardiology',
            bedCount: 2,
        );
        $targetRoom = $this->createRoomWithBeds(
            roomNumber: 'TEST-LC-102',
            department: 'Cardiology',
            bedCount: 1,
        );

        $sourceBed = $sourceRoom->beds()->orderBy('id')->firstOrFail();
        $targetBed = $targetRoom->beds()->orderBy('id')->firstOrFail();
        $patientUser = $this->createPatientUser(
            name: 'Lifecycle Patient',
            email: 'lifecycle.patient@pulseportal.test',
            phone: '01700000001',
        );
        $doctorUser = $this->createDoctorUser(
            name: 'Rezaul Karim',
            email: 'rezaul.lifecycle@pulseportal.test',
            department: 'Cardiology',
        );

        $createResponse = $this->actingAs($frontDeskUser, 'api')
            ->postJson('/api/admin/room-admissions', [
                'patient_name' => 'Lifecycle Patient',
                'patient_id' => $patientUser->patient->id,
                'patient_identifier' => 'PT-LIFE-001',
                'patient_age' => 41,
                'patient_gender' => 'Male',
                'contact_phone' => '01700000001',
                'emergency_contact_name' => 'Relative One',
                'emergency_contact_phone' => '01800000001',
                'admission_type' => 'Emergency',
                'doctor_id' => $doctorUser->doctor->id,
                'attending_doctor' => 'Dr. Rezaul Karim',
                'room_id' => $sourceRoom->id,
                'bed_id' => $sourceBed->id,
                'payer_type' => 'Self',
                'estimated_stay_days' => 4,
                'priority' => 'High',
                'notes' => 'Initial intake from emergency.',
            ]);

        $createResponse->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.department', 'Cardiology');

        $admissionId = $createResponse->json('data.id');

        $this->assertDatabaseHas('room_admissions', [
            'id' => $admissionId,
            'status' => 'pending',
            'department' => 'Cardiology',
            'patient_id' => $patientUser->patient->id,
            'doctor_id' => $doctorUser->doctor->id,
        ]);

        $this->assertDatabaseHas('room_beds', [
            'id' => $sourceBed->id,
            'status' => 'occupied',
            'current_admission_id' => $admissionId,
        ]);

        $admitResponse = $this->actingAs($frontDeskUser, 'api')
            ->patchJson("/api/admin/room-admissions/{$admissionId}/status", [
                'status' => 'admitted',
                'note' => 'Patient moved to admitted status.',
            ]);

        $admitResponse->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'admitted');

        $noteResponse = $this->actingAs($frontDeskUser, 'api')
            ->postJson("/api/admin/room-admissions/{$admissionId}/notes", [
                'note' => 'Monitoring vitals every 4 hours.',
            ]);

        $noteResponse->assertOk()
            ->assertJsonPath('status', 'success');

        $transferResponse = $this->actingAs($frontDeskUser, 'api')
            ->postJson("/api/admin/room-admissions/{$admissionId}/transfer", [
                'room_id' => $targetRoom->id,
                'bed_id' => $targetBed->id,
                'note' => 'Transferred closer to ICU station.',
            ]);

        $transferResponse->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'transfer')
            ->assertJsonPath('data.room_id', $targetRoom->id)
            ->assertJsonPath('data.bed_id', $targetBed->id);

        $this->assertDatabaseHas('room_beds', [
            'id' => $sourceBed->id,
            'status' => 'available',
            'current_admission_id' => null,
        ]);

        $this->assertDatabaseHas('room_beds', [
            'id' => $targetBed->id,
            'status' => 'occupied',
            'current_admission_id' => $admissionId,
        ]);

        $dischargeResponse = $this->actingAs($frontDeskUser, 'api')
            ->patchJson("/api/admin/room-admissions/{$admissionId}/status", [
                'status' => 'discharged',
                'note' => 'Discharge completed.',
            ]);

        $dischargeResponse->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'discharged');

        $this->assertDatabaseHas('room_beds', [
            'id' => $targetBed->id,
            'status' => 'available',
            'current_admission_id' => null,
        ]);

        $this->assertDatabaseHas('room_admission_events', [
            'room_admission_id' => $admissionId,
            'event_type' => 'admission_created',
        ]);

        $this->assertDatabaseHas('room_admission_events', [
            'room_admission_id' => $admissionId,
            'event_type' => 'progress_note',
        ]);

        $this->assertDatabaseHas('room_admission_events', [
            'room_admission_id' => $admissionId,
            'event_type' => 'transferred',
        ]);
    }

    public function test_department_admin_can_only_view_scoped_admissions_and_cannot_manage(): void
    {
        $superAdminUser = $this->createAdminUser(
            name: 'Scope Seeder',
            email: 'scope.seeder@pulseportal.test',
            adminRole: 'Super Admin',
        );
        $superAdmin = $superAdminUser->admin;

        $departmentAdminUser = $this->createAdminUser(
            name: 'Department Viewer',
            email: 'dept.viewer@pulseportal.test',
            adminRole: 'Department Admin',
            department: 'Cardiology',
        );

        $cardioRoom = $this->createRoomWithBeds('TEST-SC-201', 'Cardiology', 1);
        $neuroRoom = $this->createRoomWithBeds('TEST-SC-301', 'Neurology', 1);

        $this->createAdmissionRecord(
            room: $cardioRoom,
            bed: $cardioRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Cardio Scoped Patient',
                'patient_identifier' => 'PT-SCOPE-001',
                'status' => 'pending',
            ],
        );

        $this->createAdmissionRecord(
            room: $neuroRoom,
            bed: $neuroRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Neurology Hidden Patient',
                'patient_identifier' => 'PT-SCOPE-002',
                'status' => 'pending',
            ],
        );

        $indexResponse = $this->actingAs($departmentAdminUser, 'api')
            ->getJson('/api/admin/room-admissions?per_page=10');

        $indexResponse->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.department', 'Cardiology')
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.status_counts.all', 1);

        $forbiddenResponse = $this->actingAs($departmentAdminUser, 'api')
            ->postJson('/api/admin/room-admissions', []);

        $forbiddenResponse->assertStatus(403)
            ->assertJsonPath(
                'message',
                'Only Front Desk Admin and Super Admin can manage room admissions.',
            );
    }

    public function test_index_supports_server_side_pagination_and_filters(): void
    {
        $superAdminUser = $this->createAdminUser(
            name: 'Filter Admin',
            email: 'filter.admin@pulseportal.test',
            adminRole: 'Super Admin',
        );
        $superAdmin = $superAdminUser->admin;

        $cardioRoom = $this->createRoomWithBeds('TEST-FL-101', 'Cardiology', 8);
        $neuroRoom = $this->createRoomWithBeds('TEST-FL-201', 'Neurology', 2);

        $cardioBeds = $cardioRoom->beds()->orderBy('id')->get()->values();
        $neuroBeds = $neuroRoom->beds()->orderBy('id')->get()->values();

        for ($i = 0; $i < 4; $i++) {
            $this->createAdmissionRecord(
                room: $cardioRoom,
                bed: $cardioBeds[$i],
                admin: $superAdmin,
                overrides: [
                    'patient_name' => "Karim Pending {$i}",
                    'patient_identifier' => "PT-FL-P-{$i}",
                    'status' => 'pending',
                ],
            );
        }

        for ($i = 0; $i < 2; $i++) {
            $this->createAdmissionRecord(
                room: $cardioRoom,
                bed: $cardioBeds[$i + 4],
                admin: $superAdmin,
                overrides: [
                    'patient_name' => "Karim Admitted {$i}",
                    'patient_identifier' => "PT-FL-A-{$i}",
                    'status' => 'admitted',
                ],
            );
        }

        for ($i = 0; $i < 2; $i++) {
            $this->createAdmissionRecord(
                room: $neuroRoom,
                bed: $neuroBeds[$i],
                admin: $superAdmin,
                overrides: [
                    'patient_name' => "Karim Neurology {$i}",
                    'patient_identifier' => "PT-FL-N-{$i}",
                    'status' => 'pending',
                ],
            );
        }

        $response = $this->actingAs($superAdminUser, 'api')
            ->getJson('/api/admin/room-admissions?search=Karim&department=Cardiology&status=pending&per_page=2&page=2');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.meta.current_page', 2)
            ->assertJsonPath('data.meta.per_page', 2)
            ->assertJsonPath('data.meta.total', 4)
            ->assertJsonPath('data.meta.last_page', 2)
            ->assertJsonPath('data.filters.search', 'Karim')
            ->assertJsonPath('data.filters.status', 'pending')
            ->assertJsonPath('data.filters.department', 'Cardiology')
            ->assertJsonPath('data.status_counts.all', 6)
            ->assertJsonPath('data.status_counts.pending', 4)
            ->assertJsonPath('data.status_counts.admitted', 2)
            ->assertJsonCount(2, 'data.items');

        $statuses = array_unique(array_column($response->json('data.items'), 'status'));
        $this->assertSame(['pending'], array_values($statuses));
    }

    public function test_patient_can_view_linked_room_admission_on_dashboard(): void
    {
        $superAdminUser = $this->createAdminUser(
            name: 'Portal Seed Admin',
            email: 'portal.patient.seed@pulseportal.test',
            adminRole: 'Super Admin',
        );
        $superAdmin = $superAdminUser->admin;

        $patientUser = $this->createPatientUser(
            name: 'Rianto Khan',
            email: 'rianto.khan@pulseportal.test',
            phone: '01867747162',
        );

        $matchedRoom = $this->createRoomWithBeds('TEST-PD-401', 'Cardiology', 1);
        $otherRoom = $this->createRoomWithBeds('TEST-PD-402', 'Cardiology', 1);

        $matchedAdmission = $this->createAdmissionRecord(
            room: $matchedRoom,
            bed: $matchedRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Legacy Label Mismatch',
                'patient_id' => $patientUser->patient->id,
                'patient_identifier' => 'PT-' . str_pad((string) $patientUser->patient->id, 5, '0', STR_PAD_LEFT),
                'contact_phone' => '01919999999',
                'attending_doctor' => 'Dr. Linked Physician',
                'status' => 'admitted',
            ],
        );

        $this->createAdmissionRecord(
            room: $otherRoom,
            bed: $otherRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Another Patient',
                'patient_identifier' => 'PT-99999',
                'contact_phone' => '01900000000',
                'attending_doctor' => 'Dr. Linked Physician',
                'status' => 'admitted',
            ],
        );

        $response = $this->actingAs($patientUser, 'api')
            ->getJson('/api/patient/room-admissions');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matchedAdmission->id)
            ->assertJsonPath('data.0.patient_id', $patientUser->patient->id)
            ->assertJsonPath('data.0.room_number', 'TEST-PD-401');
    }

    public function test_doctor_can_view_assigned_room_admission_on_dashboard(): void
    {
        $superAdminUser = $this->createAdminUser(
            name: 'Portal Seed Admin Two',
            email: 'portal.doctor.seed@pulseportal.test',
            adminRole: 'Super Admin',
        );
        $superAdmin = $superAdminUser->admin;

        $doctorUser = $this->createDoctorUser(
            name: 'Rezaul Karim',
            email: 'rezaul.karim@pulseportal.test',
        );

        $matchedRoom = $this->createRoomWithBeds('TEST-DD-401', 'Cardiology', 1);
        $otherRoom = $this->createRoomWithBeds('TEST-DD-402', 'Cardiology', 1);

        $matchedAdmission = $this->createAdmissionRecord(
            room: $matchedRoom,
            bed: $matchedRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Assigned Patient',
                'doctor_id' => $doctorUser->doctor->id,
                'attending_doctor' => '',
                'status' => 'admitted',
            ],
        );

        $this->createAdmissionRecord(
            room: $otherRoom,
            bed: $otherRoom->beds()->firstOrFail(),
            admin: $superAdmin,
            overrides: [
                'patient_name' => 'Not Assigned Patient',
                'attending_doctor' => 'Dr. Another Physician',
                'status' => 'admitted',
            ],
        );

        $response = $this->actingAs($doctorUser, 'api')
            ->getJson('/api/doctor/room-admissions');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matchedAdmission->id)
            ->assertJsonPath('data.0.doctor_id', $doctorUser->doctor->id)
            ->assertJsonPath('data.0.attending_doctor', 'Dr. Rezaul Karim')
            ->assertJsonPath('data.0.room_number', 'TEST-DD-401');
    }

    private function createAdminUser(
        string $name,
        string $email,
        string $adminRole,
        ?string $department = null,
    ): User {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('Password123'),
            'role' => 'admin',
        ]);

        Admin::create([
            'user_id' => $user->id,
            'admin_role' => $adminRole,
            'department' => $department,
        ]);

        return $user;
    }

    private function createPatientUser(string $name, string $email, ?string $phone = null): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('Password123'),
            'role' => 'patient',
        ]);

        Patient::create([
            'user_id' => $user->id,
            'phone' => $phone,
        ]);

        return $user->fresh('patient');
    }

    private function createDoctorUser(string $name, string $email, string $department = 'Cardiology'): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('Password123'),
            'role' => 'doctor',
        ]);

        Doctor::create([
            'user_id' => $user->id,
            'specialization' => 'General Medicine',
            'department' => $department,
            'is_available' => true,
        ]);

        return $user->fresh('doctor');
    }

    private function createRoomWithBeds(
        string $roomNumber,
        string $department,
        int $bedCount,
    ): Room {
        $room = Room::create([
            'room_number' => $roomNumber,
            'floor' => 1,
            'ward' => "{$department} Ward",
            'department' => $department,
            'room_type' => 'General',
            'is_active' => true,
        ]);

        for ($i = 1; $i <= $bedCount; $i++) {
            $room->beds()->create([
                'bed_code' => 'B' . $i,
                'status' => 'available',
            ]);
        }

        return $room->fresh('beds');
    }

    private function createAdmissionRecord(
        Room $room,
        RoomBed $bed,
        Admin $admin,
        array $overrides = [],
    ): RoomAdmission {
        $status = $overrides['status'] ?? 'pending';

        $admission = RoomAdmission::create(array_merge([
            'admission_no' => $this->nextAdmissionNo(),
            'patient_name' => 'Test Patient ' . $this->admissionSequence,
            'patient_identifier' => 'PT-TST-' . $this->admissionSequence,
            'patient_age' => 32,
            'patient_gender' => 'Male',
            'contact_phone' => '01710000000',
            'emergency_contact_name' => 'Test Relative',
            'emergency_contact_phone' => '01710000001',
            'admission_type' => 'Emergency',
            'department' => $room->department,
            'attending_doctor' => 'Dr. Test Physician',
            'room_id' => $room->id,
            'bed_id' => $bed->id,
            'payer_type' => 'Self',
            'estimated_stay_days' => 3,
            'priority' => 'Normal',
            'notes' => 'Seeded for test coverage.',
            'status' => $status,
            'admitted_at' => in_array($status, ['admitted', 'transfer'], true) ? now() : null,
            'discharged_at' => in_array($status, ['discharged', 'cancelled'], true) ? now() : null,
            'created_by_admin_id' => $admin->id,
            'updated_by_admin_id' => $admin->id,
        ], $overrides));

        if (in_array($status, ['pending', 'admitted', 'transfer'], true)) {
            $bed->update([
                'status' => 'occupied',
                'current_admission_id' => $admission->id,
            ]);
        } else {
            $bed->update([
                'status' => 'available',
                'current_admission_id' => null,
            ]);
        }

        return $admission;
    }

    private function nextAdmissionNo(): string
    {
        return 'TADM-' . str_pad((string) $this->admissionSequence++, 4, '0', STR_PAD_LEFT);
    }
}
