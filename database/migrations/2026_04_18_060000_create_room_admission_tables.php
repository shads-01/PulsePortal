<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('room_number')->unique();
            $table->unsignedSmallInteger('floor')->nullable();
            $table->string('ward', 120)->nullable();
            $table->string('department', 120)->nullable()->index();
            $table->string('room_type', 120)->default('General');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('room_beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->string('bed_code', 20);
            $table->enum('status', ['available', 'occupied', 'maintenance'])->default('available');
            $table->unsignedBigInteger('current_admission_id')->nullable()->index();
            $table->timestamps();

            $table->unique(['room_id', 'bed_code']);
        });

        Schema::create('room_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('admission_no', 30)->unique();

            $table->string('patient_name', 255);
            $table->string('patient_identifier', 100);
            $table->unsignedTinyInteger('patient_age');
            $table->string('patient_gender', 20);

            $table->string('contact_phone', 25);
            $table->string('emergency_contact_name', 255);
            $table->string('emergency_contact_phone', 25);

            $table->string('admission_type', 100);
            $table->string('department', 120)->nullable()->index();
            $table->string('attending_doctor', 255);

            $table->foreignId('room_id')->constrained('rooms')->restrictOnDelete();
            $table->foreignId('bed_id')->constrained('room_beds')->restrictOnDelete();

            $table->string('payer_type', 50);
            $table->unsignedSmallInteger('estimated_stay_days');
            $table->string('priority', 20);
            $table->text('notes')->nullable();

            $table->enum('status', ['pending', 'admitted', 'transfer', 'discharged', 'cancelled'])->default('pending')->index();
            $table->timestamp('admitted_at')->nullable();
            $table->timestamp('discharged_at')->nullable();

            $table->foreignId('created_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->foreignId('updated_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();

            $table->timestamps();

            $table->index('patient_name');
            $table->index('patient_identifier');
        });

        Schema::create('room_admission_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_admission_id')->constrained('room_admissions')->cascadeOnDelete();
            $table->string('event_type', 50);
            $table->string('action', 150);
            $table->text('note')->nullable();
            $table->string('actor_name', 120)->nullable();
            $table->foreignId('actor_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('room_admission_id');
        });

        $now = now();
        $defaultRooms = [
            [
                'room_number' => 'ER-201',
                'floor' => 2,
                'ward' => 'Emergency Ward',
                'department' => 'Emergency',
                'room_type' => 'Critical Care',
                'beds' => ['B1', 'B2'],
            ],
            [
                'room_number' => 'CD-314',
                'floor' => 3,
                'ward' => 'Cardiology Wing',
                'department' => 'Cardiology',
                'room_type' => 'Step-Down',
                'beds' => ['B1', 'B2'],
            ],
            [
                'room_number' => 'NR-402',
                'floor' => 4,
                'ward' => 'Neuro Care',
                'department' => 'Neurology',
                'room_type' => 'Isolation',
                'beds' => ['B1', 'B2'],
            ],
            [
                'room_number' => 'PD-118',
                'floor' => 1,
                'ward' => 'Paediatric Block',
                'department' => 'Paediatrics',
                'room_type' => 'General',
                'beds' => ['B1', 'B2'],
            ],
            [
                'room_number' => 'IM-225',
                'floor' => 2,
                'ward' => 'Medicine Block',
                'department' => 'Internal Medicine',
                'room_type' => 'General',
                'beds' => ['B1', 'B2', 'B3'],
            ],
            [
                'room_number' => 'GS-106',
                'floor' => 1,
                'ward' => 'Surgery Ward',
                'department' => 'General Surgery',
                'room_type' => 'Post-Op',
                'beds' => ['B1', 'B2'],
            ],
        ];

        foreach ($defaultRooms as $room) {
            $beds = $room['beds'];
            unset($room['beds']);

            $roomId = DB::table('rooms')->insertGetId([
                ...$room,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($beds as $bedCode) {
                DB::table('room_beds')->insert([
                    'room_id' => $roomId,
                    'bed_code' => $bedCode,
                    'status' => 'available',
                    'current_admission_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_admission_events');
        Schema::dropIfExists('room_admissions');
        Schema::dropIfExists('room_beds');
        Schema::dropIfExists('rooms');
    }
};
