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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');
            $table->foreignId('doctor_id')
                ->constrained('doctors')
                ->onDelete('cascade');
            $table->date('appointment_date');
            $table->time('appointment_time')->nullable();
            $table->enum('type', ['in_person', 'online'])->default('in_person');
            $table->enum('status', ['pending', 'confirmed', 'completed', 'cancelled'])
                ->default('pending');
            $table->text('symptoms');
            $table->text('admin_notes')->nullable();
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('appointment_date');
            $table->tinyInteger('rating')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};

