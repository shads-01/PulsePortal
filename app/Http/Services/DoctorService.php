<?php

namespace App\Http\Services;

use App\Models\Doctor;

class DoctorService
{
    public function getAvailableDoctors()
    {
        return Doctor::with('user')
            ->where('is_available', true)
            ->get()
            ->map(fn($d) => [
                'id'             => $d->id,
                'name'           => $d->user->name,
                'specialization' => $d->specialization,
                'department'     => $d->department,
                'bio'            => $d->bio,
                'fee'            => $d->consultation_fee,
                'availability'   => $this->normalizeAvailability($d->availability),
                'service_hours'  => $this->resolveServiceHours($d->availability),
                'service_hours_label' => $this->formatServiceHoursLabel($d->availability),
            ]);
    }

    private function normalizeAvailability(?array $availability): ?array
    {
        if (!is_array($availability)) {
            return null;
        }

        $normalized = $availability;
        $serviceHours = $this->resolveServiceHours($availability);

        $dayMap = [
            'SUN' => 'sun',
            'MON' => 'mon',
            'TUE' => 'tue',
            'WED' => 'wed',
            'THU' => 'thu',
            'FRI' => 'fri',
            'SAT' => 'sat',
        ];

        if ($serviceHours && isset($availability['days']) && is_array($availability['days'])) {
            foreach ($availability['days'] as $dayCode) {
                $dayKey = $dayMap[strtoupper((string) $dayCode)] ?? null;
                if (!$dayKey || isset($normalized[$dayKey])) {
                    continue;
                }

                $normalized[$dayKey] = [$serviceHours['start'], $serviceHours['end']];
            }
        }

        if ($serviceHours) {
            $normalized['service_hours'] = $serviceHours;
        }

        return $normalized;
    }

    private function resolveServiceHours(?array $availability): ?array
    {
        if (!is_array($availability)) {
            return null;
        }

        if (
            isset($availability['service_hours']) &&
            is_array($availability['service_hours']) &&
            !empty($availability['service_hours']['start']) &&
            !empty($availability['service_hours']['end'])
        ) {
            return [
                'start' => (string) $availability['service_hours']['start'],
                'end' => (string) $availability['service_hours']['end'],
            ];
        }

        $dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $ranges = collect($dayKeys)
            ->map(fn ($day) => $availability[$day] ?? null)
            ->filter(fn ($range) => is_array($range) && count($range) === 2)
            ->values();

        if ($ranges->isEmpty()) {
            return null;
        }

        $starts = $ranges->map(fn ($range) => (string) $range[0])->sort()->values();
        $ends = $ranges->map(fn ($range) => (string) $range[1])->sort()->values();

        return [
            'start' => $starts->first(),
            'end' => $ends->last(),
        ];
    }

    private function formatServiceHoursLabel(?array $availability): ?string
    {
        $serviceHours = $this->resolveServiceHours($availability);
        if (!$serviceHours) {
            return null;
        }

        $start = date('h:i A', strtotime($serviceHours['start']));
        $end = date('h:i A', strtotime($serviceHours['end']));

        return "{$start} - {$end}";
    }
}
