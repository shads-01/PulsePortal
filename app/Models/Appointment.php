<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'appointment_date',
        'appointment_time',
        'type',
        'status',
        'symptoms',
        'admin_notes',
        'rating',
    ];

    protected $casts = [
        'appointment_date' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function visitNote()
    {
        return $this->hasOne(VisitNote::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }

    public function consultation()
    {
        return $this->hasOne(Consultation::class);
    }
}
