<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Prevent double booking: one active appointment per doctor per date+time.
     *
     * "Active" = not cancelled. MySQL has no partial index, so this is a
     * full unique index on (doctor_id, appointment_date, appointment_time)
     * with cancelled rows' time nulled out. Cancelled appointments are
     * historical records — clearing their time is an acceptable tradeoff
     * (the row keeps id/date/status; the slot becomes bookable again).
     */
    public function up(): void
    {
        // Safety net for existing duplicates: keep newest, soften the rest
        // by moving their time off the unique key.
        if (Schema::hasTable('appointments')) {
            $duplicates = DB::table('appointments')
                ->select('doctor_id', 'appointment_date', 'appointment_time', DB::raw('MAX(id) as keep_id'))
                ->where('status', '!=', 'cancelled')
                ->whereNotNull('appointment_time')
                ->groupBy('doctor_id', 'appointment_date', 'appointment_time')
                ->havingRaw('COUNT(*) > 1')
                ->get();

            foreach ($duplicates as $duplicate) {
                DB::table('appointments')
                    ->where('doctor_id', $duplicate->doctor_id)
                    ->where('appointment_date', $duplicate->appointment_date)
                    ->where('appointment_time', $duplicate->appointment_time)
                    ->where('id', '!=', $duplicate->keep_id)
                    ->where('status', '!=', 'cancelled')
                    ->update([
                        'appointment_time' => DB::raw("CONCAT(appointment_time, '-', id)"),
                    ]);
            }
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->unique(['doctor_id', 'appointment_date', 'appointment_time'], 'appointments_doctor_slot_unique');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropUnique('appointments_doctor_slot_unique');
        });
    }
};
