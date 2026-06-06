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
        Schema::create('visit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')
                ->unique()
                ->constrained('appointments')
                ->onDelete('cascade');
            $table->text('doctor_notes');
            $table->text('ai_summary')->nullable();
            $table->text('ai_specialist_recommendation')->nullable();
            $table->text('ai_history_summary')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visit_notes');
    }
};

