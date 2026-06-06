<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitNote extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'appointment_id',
        'doctor_notes',
        'ai_summary',
        'ai_specialist_recommendation',
        'ai_history_summary',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
