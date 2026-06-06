<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomAdmissionEvent extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'room_admission_id',
        'event_type',
        'action',
        'note',
        'actor_name',
        'actor_admin_id',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function admission()
    {
        return $this->belongsTo(RoomAdmission::class, 'room_admission_id');
    }

    public function actorAdmin()
    {
        return $this->belongsTo(Admin::class, 'actor_admin_id');
    }
}
