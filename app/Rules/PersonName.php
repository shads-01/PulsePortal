<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

/**
 * Person names: letters, spaces, hyphens, and dots only (Unicode).
 * Shared rule for patient/doctor/admin name fields.
 */
class PersonName implements Rule
{
    public function passes($attribute, $value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        return preg_match('/^[\pL\s\-\.]+$/u', $value) === 1;
    }

    public function message(): string
    {
        return 'Name can only contain letters, spaces, hyphens, and dots.';
    }
}
