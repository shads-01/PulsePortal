<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomBed extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'bed_code',
        'status',
        'current_admission_id',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function currentAdmission()
    {
        return $this->belongsTo(RoomAdmission::class, 'current_admission_id');
    }

    public function admissions()
    {
        return $this->hasMany(RoomAdmission::class, 'bed_id');
    }
}
