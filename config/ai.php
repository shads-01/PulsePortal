<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Service Configuration
    |--------------------------------------------------------------------------
    |
    | Read by App\Http\Services\AiService. Values come from .env only here —
    | never call env() at runtime (breaks under config:cache).
    |
    */

    'provider' => env('AI_PROVIDER', 'gemini'),
    'api_key'  => env('AI_API_KEY', ''),
    'model'    => env('AI_MODEL'), // null = provider default

    // Default models per provider, used when AI_MODEL is not set.
    'default_models' => [
        'openai'    => 'gpt-4o-mini',
        'gemini'    => 'gemini-2.0-flash',
        'anthropic' => 'claude-haiku-4-5-20251001',
        'xai'       => 'grok-3-mini',
        'mistral'   => 'mistral-small-latest',
        'ollama'    => 'llama3',
    ],

    // API base URLs per provider.
    'base_urls' => [
        'openai'    => 'https://api.openai.com/v1',
        'gemini'    => 'https://generativelanguage.googleapis.com/v1beta',
        'anthropic' => 'https://api.anthropic.com/v1',
        'xai'       => 'https://api.x.ai/v1',
        'mistral'   => 'https://api.mistral.ai/v1',
        'ollama'    => 'http://localhost:11434/api',
    ],

];
