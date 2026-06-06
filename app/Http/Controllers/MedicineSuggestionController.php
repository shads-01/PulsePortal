<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MedicineSuggestionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
        $this->middleware('role:doctor');
    }

    /**
     * GET /api/doctor/medicines/suggestions?q=napa
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => 'required|string|max:80',
        ]);

        $query = trim($validated['q']);
        if (mb_strlen($query) < 2) {
            return response()->json([
                'status' => 'success',
                'data' => [],
            ]);
        }

        $cacheKey = 'medex:medicine-search:' . md5(Str::lower($query));

        $suggestions = Cache::remember($cacheKey, now()->addMinutes(20), function () use ($query) {
            $response = Http::timeout(6)
                ->retry(1, 150)
                ->get('https://medex.com.bd/ajax/search', [
                    'searchtype' => 'search',
                    'searchkey' => $query,
                ]);

            if (!$response->successful()) {
                return [];
            }

            return $this->extractSuggestions($response->body());
        });

        return response()->json([
            'status' => 'success',
            'data' => $suggestions,
        ]);
    }

    private function extractSuggestions(string $html): array
    {
        if (trim($html) === '') {
            return [];
        }

        libxml_use_internal_errors(true);
        $dom = new \DOMDocument();
        $loaded = $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
        libxml_clear_errors();

        if ($loaded === false) {
            return [];
        }

        $xpath = new \DOMXPath($dom);
        $cards = $xpath->query('//a[contains(@class, "lsri")]');

        if (!$cards) {
            return [];
        }

        $results = [];
        $seen = [];

        foreach ($cards as $card) {
            $entry = $this->mapSuggestionCard($xpath, $card);
            if (!$entry) {
                continue;
            }

            $dedupeKey = Str::lower($entry['display']);
            if (isset($seen[$dedupeKey])) {
                continue;
            }

            $seen[$dedupeKey] = true;
            $results[] = $entry;

            if (count($results) >= 10) {
                break;
            }
        }

        return $results;
    }

    private function mapSuggestionCard(\DOMXPath $xpath, \DOMNode $card): ?array
    {
        $li = $xpath->query('.//li', $card)->item(0);
        $labelSpan = $xpath->query('.//li/span[1]', $card)->item(0);

        if (!$labelSpan instanceof \DOMNode) {
            return null;
        }

        $strengthNode = $xpath->query('.//span[contains(@class, "sr-strength")]', $labelSpan)->item(0);
        $strength = $strengthNode
            ? trim((string) preg_replace('/\s+/', ' ', $strengthNode->textContent ?? ''))
            : '';

        $combinedLabel = trim((string) preg_replace('/\s+/', ' ', $labelSpan->textContent ?? ''));
        if ($combinedLabel === '') {
            return null;
        }

        $name = $combinedLabel;
        if ($strength !== '' && str_ends_with($combinedLabel, $strength)) {
            $name = trim(substr($combinedLabel, 0, -strlen($strength)));
        }

        if ($name === '') {
            $name = $combinedLabel;
        }

        $form = '';
        if ($li instanceof \DOMElement) {
            $form = trim($li->getAttribute('title'));
        }

        $href = '';
        if ($card instanceof \DOMElement) {
            $href = trim($card->getAttribute('href'));
        }

        return [
            'name' => $name,
            'strength' => $strength !== '' ? $strength : null,
            'form' => $form !== '' ? $form : null,
            'display' => $strength !== '' ? ($name . ' ' . $strength) : $name,
            'url' => $href !== '' ? $href : null,
        ];
    }
}
