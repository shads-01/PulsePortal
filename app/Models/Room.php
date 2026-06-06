<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_number',
        'floor',
        'ward',
        'department',
        'room_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function beds()
    {
        return $this->hasMany(RoomBed::class);
    }

    public function admissions()
    {
        return $this->hasMany(RoomAdmission::class);
    }
}
