<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Doctor extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'specialization',
        'department',
        'bio',
        'phone',
        'consultation_fee',
        'availability',
        'is_available',
        'license_number',
        'rating',
        'reviews_count',
    ];

    protected $casts = [
        'availability'     => 'array',
        'is_available'     => 'boolean',
        'consultation_fee' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}
