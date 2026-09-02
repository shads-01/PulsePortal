<?php

namespace App\Http\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic AI service.
 *
 * Supported providers (set AI_PROVIDER in .env):
 *   openai, gemini, anthropic, xai, mistral, ollama
 *
 * Required .env keys (read via config/ai.php — safe under config:cache):
 *   AI_PROVIDER=gemini
 *   AI_API_KEY=your-key-here
 *   AI_MODEL=gemini-2.0-flash        (optional — sensible defaults per provider)
 */
class AiService
{
    protected string $provider;
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->provider = strtolower((string) config('ai.provider'));
        $this->apiKey   = (string) config('ai.api_key');
        $this->model    = (string) (config('ai.model') ?: config('ai.default_models.' . $this->provider, 'gpt-4o-mini'));
    }

    // ─── Public API ──────────────────────────────────────────────

    /**
     * Send a chat prompt and get a plain-text response.
     */
    public function chat(string $systemPrompt, string $userMessage, array $conversationHistory = []): string
    {
        return $this->sendRequest($systemPrompt, $userMessage, $conversationHistory);
    }

    /**
     * Send a chat prompt and parse the response as JSON.
     * Falls back to wrapping the text in a default structure on parse failure.
     */
    public function structuredChat(string $systemPrompt, string $userMessage, array $conversationHistory = []): array
    {
        $raw = $this->sendRequest($systemPrompt, $userMessage, $conversationHistory);

        // Try to extract JSON from the response (it may be wrapped in ```json ... ```)
        $json = $this->extractJson($raw);

        if ($json !== null) {
            return $json;
        }

        // If parsing fails, return the raw text wrapped
        return ['text' => $raw];
    }

    // ─── Provider Dispatch ───────────────────────────────────────

    private function sendRequest(string $systemPrompt, string $userMessage, array $conversationHistory = []): string
    {
        try {
            return match ($this->provider) {
                'openai', 'xai', 'mistral' => $this->sendOpenAiCompatible($systemPrompt, $userMessage, $conversationHistory),
                'gemini'                    => $this->sendGemini($systemPrompt, $userMessage, $conversationHistory),
                'anthropic'                 => $this->sendAnthropic($systemPrompt, $userMessage, $conversationHistory),
                'ollama'                    => $this->sendOllama($systemPrompt, $userMessage, $conversationHistory),
                default                     => throw new \RuntimeException("Unsupported AI provider: {$this->provider}"),
            };
        } catch (\Exception $e) {
            Log::error('AI Service error', [
                'provider' => $this->provider,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    // ─── OpenAI-compatible (OpenAI, xAI, Mistral) ────────────────

    private function sendOpenAiCompatible(string $systemPrompt, string $userMessage, array $history): string
    {
        $messages   = [['role' => 'system', 'content' => $systemPrompt]];
        $messages   = array_merge($messages, $this->formatOpenAiHistory($history));
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type'  => 'application/json',
        ])
        ->timeout(60)
        ->post(config('ai.base_urls.' . $this->provider) . '/chat/completions', [
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.7,
            'max_tokens'  => 1024,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException("AI API error ({$this->provider}): " . $response->body());
        }

        return $response->json('choices.0.message.content', '');
    }

    // ─── Google Gemini ───────────────────────────────────────────

    private function sendGemini(string $systemPrompt, string $userMessage, array $history): string
    {
        $contents = [];

        // Add conversation history
        foreach ($history as $msg) {
            $role = ($msg['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role'  => $role,
                'parts' => [['text' => $msg['content'] ?? '']],
            ];
        }

        // Add the current user message
        $contents[] = [
            'role'  => 'user',
            'parts' => [['text' => $userMessage]],
        ];

        $url = config('ai.base_urls.gemini') . "/models/{$this->model}:generateContent?key={$this->apiKey}";

        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->timeout(60)
            ->post($url, [
                'system_instruction' => [
                    'parts' => [['text' => $systemPrompt]],
                ],
                'contents'           => $contents,
                'generationConfig'   => [
                    'temperature'   => 0.7,
                    'maxOutputTokens' => 1024,
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException("AI API error (gemini): " . $response->body());
        }

        return $response->json('candidates.0.content.parts.0.text', '');
    }

    // ─── Anthropic (Claude) ──────────────────────────────────────

    private function sendAnthropic(string $systemPrompt, string $userMessage, array $history): string
    {
        $messages   = $this->formatOpenAiHistory($history);
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ])
        ->timeout(60)
        ->post(config('ai.base_urls.anthropic') . '/messages', [
            'model'      => $this->model,
            'system'     => $systemPrompt,
            'messages'   => $messages,
            'max_tokens' => 1024,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException("AI API error (anthropic): " . $response->body());
        }

        return $response->json('content.0.text', '');
    }

    // ─── Ollama (local) ──────────────────────────────────────────

    private function sendOllama(string $systemPrompt, string $userMessage, array $history): string
    {
        $messages   = [['role' => 'system', 'content' => $systemPrompt]];
        $messages   = array_merge($messages, $this->formatOpenAiHistory($history));
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->timeout(120)
            ->post(config('ai.base_urls.ollama') . '/chat', [
                'model'    => $this->model,
                'messages' => $messages,
                'stream'   => false,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException("AI API error (ollama): " . $response->body());
        }

        return $response->json('message.content', '');
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function formatOpenAiHistory(array $history): array
    {
        return array_map(fn($msg) => [
            'role'    => $msg['role'] ?? 'user',
            'content' => $msg['content'] ?? '',
        ], $history);
    }

    /**
     * Extract JSON from a response that may contain markdown fences.
     */
    private function extractJson(string $text): ?array
    {
        // Try direct parse first
        $decoded = json_decode($text, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        // Try to extract from ```json ... ``` fences
        if (preg_match('/```(?:json)?\s*\n?(.*?)\n?\s*```/s', $text, $matches)) {
            $decoded = json_decode(trim($matches[1]), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
