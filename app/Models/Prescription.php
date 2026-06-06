<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'appointment_id',
        'disease_or_problem',
        'medication',
        'instructions',
        'recommended_tests',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
