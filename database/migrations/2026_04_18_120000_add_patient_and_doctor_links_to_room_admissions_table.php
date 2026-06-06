<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('room_admissions', function (Blueprint $table) {
            $table->foreignId('patient_id')
                ->nullable()
                ->after('patient_identifier')
                ->constrained('patients')
                ->nullOnDelete();

            $table->foreignId('doctor_id')
                ->nullable()
                ->after('attending_doctor')
                ->constrained('doctors')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_admissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('patient_id');
            $table->dropConstrainedForeignId('doctor_id');
        });
    }
};
