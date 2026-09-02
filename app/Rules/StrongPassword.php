<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

/**
 * Password policy: min 8 chars with at least one uppercase letter,
 * one lowercase letter, and one digit. Shared rule for all auth flows.
 */
class StrongPassword implements Rule
{
    public function passes($attribute, $value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', $value) === 1
            && strlen($value) >= 8;
    }

    public function message(): string
    {
        return 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number.';
    }
}
