<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomAdmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'admission_no',
        'patient_name',
        'patient_identifier',
        'patient_id',
        'patient_age',
        'patient_gender',
        'contact_phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'admission_type',
        'department',
        'attending_doctor',
        'doctor_id',
        'room_id',
        'bed_id',
        'payer_type',
        'estimated_stay_days',
        'priority',
        'notes',
        'status',
        'admitted_at',
        'discharged_at',
        'created_by_admin_id',
        'updated_by_admin_id',
    ];

    protected $casts = [
        'patient_id' => 'integer',
        'doctor_id' => 'integer',
        'patient_age' => 'integer',
        'estimated_stay_days' => 'integer',
        'admitted_at' => 'datetime',
        'discharged_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function bed()
    {
        return $this->belongsTo(RoomBed::class, 'bed_id');
    }

    public function createdByAdmin()
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    public function updatedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'updated_by_admin_id');
    }

    public function events()
    {
        return $this->hasMany(RoomAdmissionEvent::class)->orderBy('created_at');
    }
}
