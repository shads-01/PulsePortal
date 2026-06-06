<?php

namespace App\Http\Services;

use App\Models\Admin;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Room;
use App\Models\RoomAdmission;
use App\Models\RoomAdmissionEvent;
use App\Models\RoomBed;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomAdmissionService
{
    private const MANAGER_ROLES = ['Super Admin', 'Front Desk Admin'];

    private const WORKFLOW_STATUSES = [
        'pending',
        'admitted',
        'transfer',
        'discharged',
        'cancelled',
    ];

    public function getAdmissions(Admin $admin, array $filters = []): array
    {
        $perPage = $this->resolvePerPage($filters['per_page'] ?? null);
        $search = $this->normalizeFilterValue($filters['search'] ?? null);
        $status = $this->normalizeFilterValue($filters['status'] ?? null);
        $department = $this->normalizeFilterValue($filters['department'] ?? null);

        if ($status === 'all' || !in_array($status, self::WORKFLOW_STATUSES, true)) {
            $status = null;
        }

        if ($department === 'all') {
            $department = null;
        }

        $query = RoomAdmission::query()
            ->with(['room', 'bed', 'events', 'patient.user', 'doctor.user'])
            ->orderByDesc('updated_at');

        $this->applyDepartmentScope($query, $admin);
        $this->applyAdmissionFilters($query, $search, $status, $department);

        $statusCountQuery = RoomAdmission::query();
        $this->applyDepartmentScope($statusCountQuery, $admin);
        $this->applyAdmissionFilters($statusCountQuery, $search, null, $department);

        $statusCounts = $this->buildStatusCounts($statusCountQuery);

        $paginator = $query->paginate($perPage)->appends([
            'per_page' => $perPage,
            'search' => $search,
            'status' => $status ?: 'all',
            'department' => $department ?: 'all',
        ]);

        $items = collect($paginator->items())
            ->map(fn (RoomAdmission $admission) => $this->mapAdmission($admission))
            ->values()
            ->all();

        return [
            'items' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem() ?? 0,
                'to' => $paginator->lastItem() ?? 0,
            ],
            'status_counts' => [
                'all' => array_sum($statusCounts),
                ...$statusCounts,
            ],
            'filters' => [
                'search' => $search ?: '',
                'status' => $status ?: 'all',
                'department' => $department ?: 'all',
            ],
        ];
    }

    public function getRoomInventory(Admin $admin): array
    {
        $query = Room::query()
            ->with(['beds' => fn ($q) => $q->orderBy('bed_code')])
            ->where('is_active', true)
            ->orderBy('department')
            ->orderBy('room_number');

        $this->applyDepartmentScope($query, $admin, 'department');

        return $query
            ->get()
            ->map(function (Room $room) {
                return [
                    'id' => $room->id,
                    'roomNumber' => $room->room_number,
                    'floor' => $room->floor,
                    'ward' => $room->ward,
                    'department' => $room->department,
                    'roomType' => $room->room_type,
                    'beds' => $room->beds->map(function (RoomBed $bed) {
                        return [
                            'id' => $bed->id,
                            'label' => $bed->bed_code,
                            'status' => $bed->status,
                            'occupantAdmissionId' => $bed->current_admission_id,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    public function getDepartments(Admin $admin): array
    {
        $query = Room::query()->where('is_active', true);
        $this->applyDepartmentScope($query, $admin, 'department');

        return $query
            ->whereNotNull('department')
            ->distinct()
            ->orderBy('department')
            ->pluck('department')
            ->values()
            ->all();
    }

    public function getPatientAdmissions(Patient $patient): array
    {
        $patient->loadMissing('user');

        $query = RoomAdmission::query()
            ->with(['room', 'bed', 'patient.user', 'doctor.user'])
            ->orderByDesc('updated_at');

        $this->applyPatientScope($query, $patient);

        return $query
            ->get()
            ->map(fn (RoomAdmission $admission) => $this->mapDashboardAdmission($admission))
            ->values()
            ->all();
    }

    public function getDoctorAdmissions(Doctor $doctor): array
    {
        $doctor->loadMissing('user');

        $query = RoomAdmission::query()
            ->with(['room', 'bed', 'patient.user', 'doctor.user'])
            ->orderByDesc('updated_at');

        $this->applyDoctorScope($query, $doctor);

        return $query
            ->get()
            ->map(fn (RoomAdmission $admission) => $this->mapDashboardAdmission($admission))
            ->values()
            ->all();
    }

    public function createAdmission(Admin $admin, array $data): array
    {
        $this->ensureManager($admin);

        $admission = DB::transaction(function () use ($admin, $data) {
            $room = Room::query()
                ->where('id', $data['room_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (!$room) {
                throw ValidationException::withMessages([
                    'room_id' => 'Selected room is unavailable.',
                ]);
            }

            $bed = RoomBed::query()
                ->where('id', $data['bed_id'])
                ->where('room_id', $room->id)
                ->lockForUpdate()
                ->first();

            if (!$bed) {
                throw ValidationException::withMessages([
                    'bed_id' => 'Selected bed does not belong to the selected room.',
                ]);
            }

            if ($bed->status !== 'available') {
                throw ValidationException::withMessages([
                    'bed_id' => 'This bed is already occupied. Please choose another bed.',
                ]);
            }

            $department = $data['department'] ?? $room->department;
            if (is_string($department) && trim($department) === '') {
                $department = $room->department;
            }

            $admissionNo = $this->nextAdmissionNo();
            $linkedPatientId = $this->resolveLinkedPatientId($data);
            $linkedDoctor = $this->resolveLinkedDoctor($data);
            $patientIdentifier = $this->resolvePatientIdentifier($data, $admissionNo, $linkedPatientId);
            $resolvedDoctorName = $this->resolveAttendingDoctorName($data, $linkedDoctor);

            $admission = RoomAdmission::create([
                'admission_no' => $admissionNo,
                'patient_name' => $data['patient_name'],
                'patient_identifier' => $patientIdentifier,
                'patient_id' => $linkedPatientId,
                'patient_age' => $data['patient_age'],
                'patient_gender' => $data['patient_gender'],
                'contact_phone' => $data['contact_phone'],
                'emergency_contact_name' => $data['emergency_contact_name'],
                'emergency_contact_phone' => $data['emergency_contact_phone'],
                'admission_type' => $data['admission_type'],
                'department' => $department,
                'attending_doctor' => $resolvedDoctorName,
                'doctor_id' => $linkedDoctor?->id,
                'room_id' => $room->id,
                'bed_id' => $bed->id,
                'payer_type' => $data['payer_type'],
                'estimated_stay_days' => $data['estimated_stay_days'],
                'priority' => $data['priority'],
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
                'created_by_admin_id' => $admin->id,
                'updated_by_admin_id' => $admin->id,
            ]);

            $bed->status = 'occupied';
            $bed->current_admission_id = $admission->id;
            $bed->save();

            $this->createEvent(
                $admission,
                'admission_created',
                'Admission created',
                $data['note'] ?? 'Patient admission has been created and bed is reserved.',
                $admin,
                $data['actor'] ?? null,
                [
                    'room_id' => $room->id,
                    'bed_id' => $bed->id,
                ],
            );

            return $admission->fresh(['room', 'bed', 'events', 'patient.user', 'doctor.user']);
        });

        return $this->mapAdmission($admission);
    }

    public function updateStatus(Admin $admin, int $admissionId, string $status, ?string $note = null, ?string $actor = null): array
    {
        $this->ensureManager($admin);

        if (!in_array($status, self::WORKFLOW_STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => 'Invalid admission status selected.',
            ]);
        }

        $admission = DB::transaction(function () use ($admin, $admissionId, $status, $note, $actor) {
            $admission = RoomAdmission::query()->lockForUpdate()->find($admissionId);
            if (!$admission) {
                throw ValidationException::withMessages([
                    'admission_id' => 'Admission record not found.',
                ]);
            }

            $bed = RoomBed::query()->lockForUpdate()->find($admission->bed_id);
            if (!$bed) {
                throw ValidationException::withMessages([
                    'bed_id' => 'Assigned bed not found for this admission.',
                ]);
            }

            if (in_array($status, ['discharged', 'cancelled'], true)) {
                if ((int) $bed->current_admission_id === (int) $admission->id) {
                    $bed->status = 'available';
                    $bed->current_admission_id = null;
                    $bed->save();
                }
            } else {
                $bed->status = 'occupied';
                $bed->current_admission_id = $admission->id;
                $bed->save();
            }

            $updates = [
                'status' => $status,
                'updated_by_admin_id' => $admin->id,
            ];

            if ($status === 'admitted' && !$admission->admitted_at) {
                $updates['admitted_at'] = now();
            }

            if (in_array($status, ['discharged', 'cancelled'], true)) {
                $updates['discharged_at'] = now();
            }

            $admission->fill($updates)->save();

            $this->createEvent(
                $admission,
                'status_changed',
                'Status changed to ' . $status,
                $note ?: 'Admission status updated.',
                $admin,
                $actor,
                ['status' => $status],
            );

            return $admission->fresh(['room', 'bed', 'events']);
        });

        return $this->mapAdmission($admission);
    }

    public function transferBed(Admin $admin, int $admissionId, array $data): array
    {
        $this->ensureManager($admin);

        $admission = DB::transaction(function () use ($admin, $admissionId, $data) {
            $admission = RoomAdmission::query()->lockForUpdate()->find($admissionId);
            if (!$admission) {
                throw ValidationException::withMessages([
                    'admission_id' => 'Admission record not found.',
                ]);
            }

            $targetRoom = Room::query()
                ->where('id', $data['room_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (!$targetRoom) {
                throw ValidationException::withMessages([
                    'room_id' => 'Transfer room is unavailable.',
                ]);
            }

            $targetBed = RoomBed::query()
                ->where('id', $data['bed_id'])
                ->where('room_id', $targetRoom->id)
                ->lockForUpdate()
                ->first();

            if (!$targetBed) {
                throw ValidationException::withMessages([
                    'bed_id' => 'Transfer bed does not belong to the selected room.',
                ]);
            }

            if ($targetBed->status !== 'available') {
                throw ValidationException::withMessages([
                    'bed_id' => 'Transfer bed is already occupied.',
                ]);
            }

            $sourceBed = RoomBed::query()->where('id', $admission->bed_id)->lockForUpdate()->first();
            if ($sourceBed && (int) $sourceBed->current_admission_id === (int) $admission->id) {
                $sourceBed->status = 'available';
                $sourceBed->current_admission_id = null;
                $sourceBed->save();
            }

            $targetBed->status = 'occupied';
            $targetBed->current_admission_id = $admission->id;
            $targetBed->save();

            $admission->fill([
                'room_id' => $targetRoom->id,
                'bed_id' => $targetBed->id,
                'department' => $targetRoom->department ?? $admission->department,
                'status' => 'transfer',
                'updated_by_admin_id' => $admin->id,
            ])->save();

            $this->createEvent(
                $admission,
                'transferred',
                'Transferred',
                $data['note'] ?: sprintf('Transferred to room %s, bed %s.', $targetRoom->room_number, $targetBed->bed_code),
                $admin,
                $data['actor'] ?? null,
                [
                    'room_id' => $targetRoom->id,
                    'bed_id' => $targetBed->id,
                ],
            );

            return $admission->fresh(['room', 'bed', 'events']);
        });

        return $this->mapAdmission($admission);
    }

    public function addProgressNote(Admin $admin, int $admissionId, string $note, ?string $actor = null): array
    {
        $this->ensureManager($admin);

        $admission = DB::transaction(function () use ($admin, $admissionId, $note, $actor) {
            $admission = RoomAdmission::query()->lockForUpdate()->find($admissionId);
            if (!$admission) {
                throw ValidationException::withMessages([
                    'admission_id' => 'Admission record not found.',
                ]);
            }

            $admission->updated_by_admin_id = $admin->id;
            $admission->save();

            $this->createEvent(
                $admission,
                'progress_note',
                'Progress note',
                $note,
                $admin,
                $actor,
            );

            return $admission->fresh(['room', 'bed', 'events']);
        });

        return $this->mapAdmission($admission);
    }

    private function ensureManager(Admin $admin): void
    {
        if (!in_array($admin->admin_role, self::MANAGER_ROLES, true)) {
            throw new AuthorizationException('Only Front Desk Admin and Super Admin can manage room admissions.');
        }
    }

    private function applyDepartmentScope($query, Admin $admin, string $column = 'department'): void
    {
        if (in_array($admin->admin_role, self::MANAGER_ROLES, true)) {
            return;
        }

        if ($admin->department) {
            $query->where($column, $admin->department);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function applyAdmissionFilters($query, ?string $search, ?string $status, ?string $department): void
    {
        if ($department) {
            $query->where('department', $department);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if (!$search) {
            return;
        }

        $searchLike = '%' . addcslashes($search, '%_\\') . '%';

        $query->where(function (Builder $builder) use ($searchLike) {
            $builder
                ->where('patient_name', 'like', $searchLike)
                ->orWhere('patient_identifier', 'like', $searchLike)
                ->orWhere('admission_no', 'like', $searchLike)
                ->orWhere('attending_doctor', 'like', $searchLike)
                ->orWhereHas('patient.user', fn (Builder $patientQuery) => $patientQuery->where('name', 'like', $searchLike))
                ->orWhereHas('doctor.user', fn (Builder $doctorQuery) => $doctorQuery->where('name', 'like', $searchLike))
                ->orWhereHas('room', fn (Builder $roomQuery) => $roomQuery->where('room_number', 'like', $searchLike))
                ->orWhereHas('bed', fn (Builder $bedQuery) => $bedQuery->where('bed_code', 'like', $searchLike));
        });
    }

    private function applyPatientScope($query, Patient $patient): void
    {
        $patientName = $this->normalizePersonName($patient->user?->name);
        $phone = $this->normalizePhone($patient->phone);
        $identifierCandidates = $this->resolvePatientIdentifierCandidates($patient);

        $query->where(function (Builder $builder) use ($patient, $patientName, $phone, $identifierCandidates) {
            $builder->where('patient_id', $patient->id);

            $hasLegacyHints = $patientName !== null || $phone !== null || $identifierCandidates !== [];
            if (!$hasLegacyHints) {
                return;
            }

            $builder->orWhere(function (Builder $legacyBuilder) use ($patientName, $phone, $identifierCandidates) {
                $legacyBuilder->whereNull('patient_id');

                $hasCondition = false;

                if ($patientName !== null) {
                    $legacyBuilder->whereRaw('LOWER(patient_name) = ?', [$patientName]);
                    $hasCondition = true;
                }

                if ($phone !== null) {
                    $method = $hasCondition ? 'orWhereRaw' : 'whereRaw';
                    $legacyBuilder->{$method}(
                        "REPLACE(REPLACE(REPLACE(contact_phone, ' ', ''), '-', ''), '+', '') = ?",
                        [$phone],
                    );
                    $hasCondition = true;
                }

                if ($identifierCandidates !== []) {
                    $method = $hasCondition ? 'orWhereIn' : 'whereIn';
                    $legacyBuilder->{$method}('patient_identifier', $identifierCandidates);
                }
            });
        });
    }

    private function applyDoctorScope($query, Doctor $doctor): void
    {
        $doctorNameCandidates = $this->resolveDoctorNameCandidates($doctor->user?->name);

        $query->where(function (Builder $builder) use ($doctor, $doctorNameCandidates) {
            $builder->where('doctor_id', $doctor->id);

            if ($doctorNameCandidates === []) {
                return;
            }

            $builder->orWhere(function (Builder $legacyBuilder) use ($doctorNameCandidates) {
                $legacyBuilder->whereNull('doctor_id')
                    ->where(function (Builder $doctorNameQuery) use ($doctorNameCandidates) {
                        $hasCondition = false;

                        foreach ($doctorNameCandidates as $doctorName) {
                            if (!$hasCondition) {
                                $doctorNameQuery->whereRaw('LOWER(attending_doctor) = ?', [$doctorName]);
                                $hasCondition = true;
                                continue;
                            }

                            $doctorNameQuery->orWhereRaw('LOWER(attending_doctor) = ?', [$doctorName]);
                        }
                    });
            });
        });
    }

    private function buildStatusCounts($query): array
    {
        $counts = array_fill_keys(self::WORKFLOW_STATUSES, 0);

        $resolvedCounts = $query
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->all();

        foreach ($resolvedCounts as $status => $count) {
            if (array_key_exists($status, $counts)) {
                $counts[$status] = (int) $count;
            }
        }

        return $counts;
    }

    private function resolvePerPage(mixed $value): int
    {
        $perPage = (int) ($value ?: 7);
        if ($perPage < 1) {
            return 7;
        }

        return min(50, $perPage);
    }

    private function normalizeFilterValue(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function normalizePersonName(?string $name): ?string
    {
        if (!is_string($name)) {
            return null;
        }

        $collapsed = preg_replace('/\s+/', ' ', trim($name)) ?? '';
        $normalized = strtolower($collapsed);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (!is_string($phone)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        return $digits === '' ? null : $digits;
    }

    private function resolvePatientIdentifierCandidates(Patient $patient): array
    {
        $id = (int) $patient->id;
        if ($id <= 0) {
            return [];
        }

        return array_values(array_unique([
            (string) $id,
            'PT-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT),
            'PT-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT),
        ]));
    }

    private function resolveDoctorNameCandidates(?string $doctorName): array
    {
        $normalized = $this->normalizePersonName($doctorName);
        if ($normalized === null) {
            return [];
        }

        $withoutPrefix = preg_replace('/^dr\.?\s+/i', '', $normalized) ?? $normalized;
        $withoutPrefix = trim($withoutPrefix);

        $candidates = [$normalized];
        if ($withoutPrefix !== '') {
            $candidates[] = $withoutPrefix;
            $candidates[] = 'dr. ' . $withoutPrefix;
        }

        return array_values(array_unique(array_filter($candidates)));
    }

    private function resolveLinkedPatientId(array $data): ?int
    {
        $rawPatientId = $data['patient_id'] ?? null;
        $parsedPatientId = $this->normalizeRelationalId($rawPatientId);

        if ($parsedPatientId !== null) {
            return Patient::query()->whereKey($parsedPatientId)->exists()
                ? $parsedPatientId
                : null;
        }

        $patientName = $this->normalizePersonName($data['patient_name'] ?? null);
        $phone = $this->normalizePhone($data['contact_phone'] ?? null);

        if ($patientName === null && $phone === null) {
            return null;
        }

        $query = Patient::query();

        if ($patientName !== null) {
            $query->whereHas('user', fn (Builder $userQuery) => $userQuery->whereRaw('LOWER(name) = ?', [$patientName]));
        }

        if ($phone !== null) {
            $query->whereRaw(
                "REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = ?",
                [$phone],
            );
        }

        $matches = $query->limit(2)->pluck('id')->values();

        if ($matches->count() !== 1) {
            return null;
        }

        return (int) $matches->first();
    }

    private function resolveLinkedDoctor(array $data): ?Doctor
    {
        $parsedDoctorId = $this->normalizeRelationalId($data['doctor_id'] ?? null);
        if ($parsedDoctorId !== null) {
            return Doctor::query()->with('user')->whereKey($parsedDoctorId)->lockForUpdate()->first();
        }

        $attendingDoctor = $data['attending_doctor'] ?? null;
        if (!is_string($attendingDoctor) || trim($attendingDoctor) === '') {
            return null;
        }

        $doctorNameCandidates = $this->resolveDoctorNameCandidates($attendingDoctor);
        if ($doctorNameCandidates === []) {
            return null;
        }

        $matches = Doctor::query()
            ->with('user')
            ->whereHas('user', function (Builder $userQuery) use ($doctorNameCandidates) {
                $hasCondition = false;

                foreach ($doctorNameCandidates as $doctorName) {
                    if (!$hasCondition) {
                        $userQuery->whereRaw('LOWER(name) = ?', [$doctorName]);
                        $hasCondition = true;
                        continue;
                    }

                    $userQuery->orWhereRaw('LOWER(name) = ?', [$doctorName]);
                }
            })
            ->lockForUpdate()
            ->get();

        if ($matches->count() !== 1) {
            return null;
        }

        return $matches->first();
    }

    private function resolveAttendingDoctorName(array $data, ?Doctor $linkedDoctor): string
    {
        if ($linkedDoctor && is_string($linkedDoctor->user?->name)) {
            return $this->formatDoctorDisplayName($linkedDoctor->user->name);
        }

        $providedDoctorName = isset($data['attending_doctor'])
            ? trim((string) $data['attending_doctor'])
            : '';

        if ($providedDoctorName !== '') {
            return $providedDoctorName;
        }

        throw ValidationException::withMessages([
            'attending_doctor' => 'Attending doctor is required.',
        ]);
    }

    private function normalizeRelationalId(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }

        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '' || !ctype_digit($trimmed)) {
            return null;
        }

        $parsed = (int) $trimmed;
        return $parsed > 0 ? $parsed : null;
    }

    private function formatDoctorDisplayName(string $doctorName): string
    {
        $trimmed = trim($doctorName);
        if ($trimmed === '') {
            return $trimmed;
        }

        if (preg_match('/^dr\.?\s+/i', $trimmed) === 1) {
            return preg_replace('/^dr\.?\s+/i', 'Dr. ', $trimmed) ?? $trimmed;
        }

        return 'Dr. ' . $trimmed;
    }

    private function resolvePatientIdentifier(array $data, string $admissionNo, ?int $linkedPatientId): string
    {
        $providedIdentifier = isset($data['patient_identifier'])
            ? trim((string) $data['patient_identifier'])
            : '';
        if ($providedIdentifier !== '') {
            return $providedIdentifier;
        }

        $legacyIdentifier = isset($data['patient_id']) ? trim((string) $data['patient_id']) : '';
        if ($legacyIdentifier !== '' && $this->normalizeRelationalId($legacyIdentifier) === null) {
            return $legacyIdentifier;
        }

        if ($linkedPatientId !== null) {
            return 'PT-' . str_pad((string) $linkedPatientId, 5, '0', STR_PAD_LEFT);
        }

        if (preg_match('/^ADM-(\d+)$/', $admissionNo, $matches) === 1) {
            return 'PT-' . str_pad($matches[1], 6, '0', STR_PAD_LEFT);
        }

        return 'PT-' . now()->format('YmdHis');
    }

    private function mapDashboardAdmission(RoomAdmission $admission): array
    {
        $admission->loadMissing(['room', 'bed', 'patient.user', 'doctor.user']);

        $resolvedDoctorName = $admission->attending_doctor;
        if ((!is_string($resolvedDoctorName) || trim($resolvedDoctorName) === '') && $admission->doctor?->user?->name) {
            $resolvedDoctorName = $this->formatDoctorDisplayName($admission->doctor->user->name);
        }

        return [
            'id' => $admission->id,
            'admission_no' => $admission->admission_no,
            'patient_name' => $admission->patient_name,
            'patient_id' => $admission->patient_id,
            'patient_identifier' => $admission->patient_identifier,
            'patient_age' => $admission->patient_age,
            'patient_gender' => $admission->patient_gender,
            'contact_phone' => $admission->contact_phone,
            'emergency_contact_name' => $admission->emergency_contact_name,
            'emergency_contact_phone' => $admission->emergency_contact_phone,
            'admission_type' => $admission->admission_type,
            'department' => $admission->department,
            'doctor_id' => $admission->doctor_id,
            'attending_doctor' => $resolvedDoctorName,
            'room_id' => $admission->room_id,
            'room_number' => $admission->room?->room_number,
            'bed_id' => $admission->bed_id,
            'bed_label' => $admission->bed?->bed_code,
            'payer_type' => $admission->payer_type,
            'estimated_stay_days' => $admission->estimated_stay_days,
            'priority' => $admission->priority,
            'notes' => $admission->notes,
            'status' => $admission->status,
            'admitted_at' => optional($admission->admitted_at)?->toISOString(),
            'discharged_at' => optional($admission->discharged_at)?->toISOString(),
            'created_at' => optional($admission->created_at)?->toISOString(),
            'updated_at' => optional($admission->updated_at)?->toISOString(),
        ];
    }

    private function mapAdmission(RoomAdmission $admission): array
    {
        $admission->loadMissing(['room', 'bed', 'events', 'patient.user', 'doctor.user']);

        $resolvedDoctorName = $admission->attending_doctor;
        if ((!is_string($resolvedDoctorName) || trim($resolvedDoctorName) === '') && $admission->doctor?->user?->name) {
            $resolvedDoctorName = $this->formatDoctorDisplayName($admission->doctor->user->name);
        }

        return [
            'id' => $admission->id,
            'admission_no' => $admission->admission_no,
            'patient_name' => $admission->patient_name,
            'patient_id' => $admission->patient_id,
            'patient_identifier' => $admission->patient_identifier,
            'patient_age' => $admission->patient_age,
            'patient_gender' => $admission->patient_gender,
            'contact_phone' => $admission->contact_phone,
            'emergency_contact_name' => $admission->emergency_contact_name,
            'emergency_contact_phone' => $admission->emergency_contact_phone,
            'admission_type' => $admission->admission_type,
            'department' => $admission->department,
            'doctor_id' => $admission->doctor_id,
            'attending_doctor' => $resolvedDoctorName,
            'room_id' => $admission->room_id,
            'room_number' => $admission->room?->room_number,
            'bed_id' => $admission->bed_id,
            'bed_label' => $admission->bed?->bed_code,
            'payer_type' => $admission->payer_type,
            'estimated_stay_days' => $admission->estimated_stay_days,
            'priority' => $admission->priority,
            'notes' => $admission->notes,
            'status' => $admission->status,
            'created_at' => optional($admission->created_at)?->toISOString(),
            'updated_at' => optional($admission->updated_at)?->toISOString(),
            'timeline' => $admission->events
                ->map(function (RoomAdmissionEvent $event) {
                    return [
                        'id' => 'EV-' . $event->id,
                        'action' => $event->action,
                        'note' => $event->note,
                        'actor' => $event->actor_name ?: 'Admin',
                        'timestamp' => optional($event->created_at)?->toISOString(),
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function nextAdmissionNo(): string
    {
        $maxNumber = (int) RoomAdmission::query()
            ->selectRaw("MAX(CAST(SUBSTRING_INDEX(admission_no, '-', -1) AS UNSIGNED)) AS max_no")
            ->value('max_no');

        return 'ADM-' . str_pad((string) ($maxNumber + 1), 4, '0', STR_PAD_LEFT);
    }

    private function createEvent(
        RoomAdmission $admission,
        string $eventType,
        string $action,
        ?string $note,
        Admin $admin,
        ?string $actorName = null,
        array $metadata = [],
    ): void {
        RoomAdmissionEvent::create([
            'room_admission_id' => $admission->id,
            'event_type' => $eventType,
            'action' => $action,
            'note' => $note,
            'actor_name' => $actorName ?: ($admin->user?->name ?: $admin->admin_role ?: 'Admin'),
            'actor_admin_id' => $admin->id,
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }
}
