<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

/**
 * Allowed email domains for registration. One place for the whitelist
 * shared by AuthService, AdminController, and ProfileController.
 */
class AllowedEmailDomain implements Rule
{
    public const DOMAINS = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'aust.edu',
        'pulseportal.com',
    ];

    public function passes($attribute, $value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        $domain = strtolower(substr(strrchr($value, '@'), 1));

        return $domain !== false && in_array($domain, self::DOMAINS, true);
    }

    public function message(): string
    {
        return 'Only gmail.com, yahoo.com, outlook.com, aust.edu, and pulseportal.com emails are allowed.';
    }
}
