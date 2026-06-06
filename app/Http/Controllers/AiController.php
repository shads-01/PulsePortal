<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Services\AiService;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Appointment;

class AiController extends Controller
{
    protected AiService $aiService;

    public function __construct(AiService $aiService)
    {
        $this->middleware('auth:api');
        $this->aiService = $aiService;
    }

    /**
     * POST /api/patient/ai/chat
     * AI Health Assistant — general symptom guidance chatbot.
     */
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array',
        ]);

        $user    = auth()->user();
        $message = $request->input('message');
        $history = $request->input('history', []);

        // Gather database context
        $specializations = Doctor::where('is_available', true)
            ->distinct()
            ->pluck('specialization')
            ->toArray();

        $doctors = Doctor::with('user')
            ->where('is_available', true)
            ->get()
            ->map(fn($d) => "{$d->user->name} ({$d->specialization})")
            ->toArray();

        $systemPrompt = <<<PROMPT
You are a helpful AI Health Assistant for PulsePortal Hospital Management System.

Your role:
- Provide general health guidance based on symptoms described by the patient.
- Suggest what to do and what NOT to do for common symptoms.
- Recommend basic home treatments where appropriate.
- If symptoms sound serious or life-threatening, clearly advise the patient to seek IMMEDIATE medical attention at a hospital.
- Suggest which medical specialization the patient should visit.
- Be warm, empathetic, and clear in your responses.
- Keep responses concise (2-4 paragraphs max).

Available specializations at our hospital: {implSpecializations}
Available doctors: {implDoctors}

IMPORTANT RULES:
- You are NOT a doctor. You cannot diagnose or prescribe medication.
- Always recommend consulting a professional doctor for proper diagnosis.
- For emergencies (chest pain, difficulty breathing, severe bleeding, loss of consciousness), always advise calling emergency services or visiting the ER immediately.
- Only suggest doctors and specializations from the lists above.
PROMPT;

        $systemPrompt = str_replace(
            ['{implSpecializations}', '{implDoctors}'],
            [implode(', ', $specializations), implode(', ', $doctors)],
            $systemPrompt
        );

        try {
            $response = $this->aiService->chat($systemPrompt, $message, $history);

            return response()->json([
                'status'  => 'success',
                'data'    => [
                    'message' => $response,
                ],
            ]);
        } catch (\Exception $e) {
            $errorMsg = $this->getUserFriendlyError($e->getMessage());

            return response()->json([
                'status'  => 'error',
                'message' => $errorMsg,
            ], 503);
        }
    }

    /**
     * POST /api/patient/ai/suggest-doctors
     * Analyze symptoms and return matching specializations from the database.
     */
    public function suggestDoctors(Request $request)
    {
        $request->validate([
            'symptoms' => 'required|string|max:2000',
        ]);

        $symptoms = $request->input('symptoms');

        // Get all available specializations from the database
        $specializations = Doctor::where('is_available', true)
            ->distinct()
            ->pluck('specialization')
            ->toArray();

        // Get doctors with details for context
        $doctorDetails = Doctor::with('user')
            ->where('is_available', true)
            ->get()
            ->map(fn($d) => [
                'name'           => $d->user->name,
                'specialization' => $d->specialization,
                'fee'            => $d->consultation_fee,
            ])
            ->toArray();

        $specList = implode(', ', $specializations);

        $systemPrompt = <<<PROMPT
You are a medical triage assistant for PulsePortal Hospital. Your job is to analyze patient symptoms and recommend which medical specializations they should consult.

Available specializations at our hospital: {$specList}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside JSON) in this exact format:
{
  "specializations": ["Specialization1", "Specialization2"],
  "explanation": "Brief 1-2 sentence explanation of why these specializations are recommended."
}

RULES:
- ONLY include specializations from the available list above.
- If symptoms could relate to multiple specializations, include all relevant ones (max 3).
- If symptoms are vague, suggest "General Medicine" or the most relevant available specialization.
- The explanation should be helpful and reassuring.
- Do NOT include any text outside the JSON object.
PROMPT;

        try {
            $result = $this->aiService->structuredChat($systemPrompt, "Patient symptoms: {$symptoms}");

            // Validate the AI returned valid specializations
            $validSpecs = [];
            if (isset($result['specializations']) && is_array($result['specializations'])) {
                $validSpecs = array_filter($result['specializations'], function ($spec) use ($specializations) {
                    return in_array($spec, $specializations);
                });
            }

            // If no valid specializations found, fallback
            if (empty($validSpecs)) {
                $validSpecs = $specializations; // Show all doctors
            }

            return response()->json([
                'status' => 'success',
                'data'   => [
                    'specializations' => array_values($validSpecs),
                    'explanation'     => $result['explanation'] ?? 'Based on your symptoms, we recommend consulting the following specialists.',
                ],
            ]);
        } catch (\Exception $e) {
            $errorMsg = $this->getUserFriendlyError($e->getMessage());

            return response()->json([
                'status'  => 'error',
                'message' => $errorMsg,
            ], 503);
        }
    }

    /**
     * POST /api/doctor/ai/patient-summary/{patientId}
     * Generate an AI clinical summary of a patient's medical history.
     * Also persists the summary to the patient's medical_history field.
     */
    public function summarizePatientHistory($patientId)
    {
        $doctor = auth()->user()->doctor;
        if (!$doctor) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $patient = Patient::with('user')->find($patientId);
        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Patient not found.'], 404);
        }

        // Gather all completed appointments for this patient (across all doctors)
        $completedAppointments = Appointment::with(['doctor.user', 'prescriptions'])
            ->where('patient_id', $patientId)
            ->where('status', 'completed')
            ->orderBy('appointment_date', 'asc')
            ->get();

        if ($completedAppointments->isEmpty()) {
            return response()->json([
                'status' => 'success',
                'data'   => ['summary' => 'No completed appointments found for this patient yet.'],
            ]);
        }

        // Build context from appointment records
        $appointmentSummaries = $completedAppointments->map(function ($appt) {
            $parts = [
                "Date: {$appt->appointment_date->format('Y-m-d')}",
                "Doctor: " . ($appt->doctor->user->name ?? 'Unknown'),
                "Specialization: " . ($appt->doctor->specialization ?? 'Unknown'),
                "Symptoms: {$appt->symptoms}",
            ];

            if ($appt->prescriptions->isNotEmpty()) {
                foreach ($appt->prescriptions as $p) {
                    if ($p->disease_or_problem) {
                        $parts[] = "Diagnosis: {$p->disease_or_problem}";
                    }
                    $meds = json_decode($p->medication, true);
                    if (is_array($meds)) {
                        $medList = collect($meds)->map(fn($m) => $m['name'] . ($m['dosage'] ? " ({$m['dosage']})" : ''))->implode(', ');
                        $parts[] = "Medicines: {$medList}";
                    }
                    if ($p->instructions) {
                        $parts[] = "Doctor Notes: {$p->instructions}";
                    }
                }
            }

            return implode(' | ', $parts);
        })->implode("\n");

        $systemPrompt = <<<PROMPT
You are a medical records assistant for PulsePortal Hospital. Your job is to write a concise clinical summary of a patient's medical history based on their appointment records.

Guidelines:
- Write in third person (e.g., "Patient has a history of...")
- Keep it to 3-5 sentences maximum
- Highlight key conditions, diagnoses, recurring issues, and treatments
- Mention relevant specializations consulted
- Note any prescribed medications and their purposes
- Be factual, professional, and concise — this will be displayed to doctors
- If the patient has had only one appointment, still summarize it meaningfully
- Do NOT include specific dates unless medically relevant
PROMPT;

        $userMessage = "Generate a clinical summary for patient '{$patient->user->name}' based on these appointment records:\n\n{$appointmentSummaries}";

        try {
            $summary = $this->aiService->chat($systemPrompt, $userMessage);

            // Persist the summary to the patient's medical_history field
            $patient->update(['medical_history' => trim($summary)]);

            return response()->json([
                'status' => 'success',
                'data'   => ['summary' => trim($summary)],
            ]);
        } catch (\Exception $e) {
            $errorMsg = $this->getUserFriendlyError($e->getMessage());
            return response()->json(['status' => 'error', 'message' => $errorMsg], 503);
        }
    }

    /**
     * POST /api/patient/ai/prescription-summary/{appointmentId}
     * Generate an AI patient-friendly summary of a prescription.
     */
    public function summarizePrescription($appointmentId)
    {
        $patient = auth()->user()->patient;
        if (!$patient) {
            return response()->json(['status' => 'error', 'message' => 'Patient profile not found.'], 404);
        }

        $appointment = Appointment::where('id', $appointmentId)
            ->where('patient_id', $patient->id)
            ->with(['doctor.user', 'prescriptions'])
            ->first();

        if (!$appointment) {
            return response()->json(['status' => 'error', 'message' => 'Appointment not found.'], 404);
        }

        $prescription = $appointment->prescriptions->first();
        if (!$prescription) {
            return response()->json(['status' => 'error', 'message' => 'No prescription found.'], 404);
        }

        // Build prescription context
        $medicines = json_decode($prescription->medication, true) ?? [];
        $medDetails = collect($medicines)->map(function ($m) {
            $detail = $m['name'];
            if (!empty($m['dosage'])) $detail .= " — Dosage: {$m['dosage']}";
            if (!empty($m['instruction'])) $detail .= " — Instructions: {$m['instruction']}";
            return $detail;
        })->implode("\n");

        $context = "Doctor: Dr. {$appointment->doctor->user->name} ({$appointment->doctor->specialization})\n";
        $context .= "Diagnosis: " . ($prescription->disease_or_problem ?: 'Not specified') . "\n";
        $context .= "Medicines:\n{$medDetails}\n";
        $context .= "Doctor's Notes: " . ($prescription->instructions ?: 'None') . "\n";

        $systemPrompt = <<<PROMPT
You are a patient-friendly health advisor for PulsePortal Hospital. Your job is to explain a prescription in simple, easy-to-understand language for a patient.

Your response MUST include these sections:
1. **Your Diagnosis**: Briefly explain what condition/disease was diagnosed in simple terms.
2. **Your Medicines**: For each medicine, explain what it does and why the doctor prescribed it. Include dosage reminders.
3. **Important Suggestions**: Provide 3-5 practical health suggestions based on the diagnosis and medicines (diet, rest, things to avoid, when to seek further help).
4. **⚠️ Warnings**: Any side effects to watch for or situations where they should contact their doctor immediately.

Guidelines:
- Use warm, reassuring, simple language (avoid medical jargon)
- Keep each section concise (2-3 sentences each)
- Use bullet points for clarity
- Remind the patient to follow the doctor's instructions
- Do NOT contradict or change the doctor's prescription
PROMPT;

        $userMessage = "Please summarize this prescription for the patient:\n\n{$context}";

        try {
            $summary = $this->aiService->chat($systemPrompt, $userMessage);

            return response()->json([
                'status' => 'success',
                'data'   => ['summary' => trim($summary)],
            ]);
        } catch (\Exception $e) {
            $errorMsg = $this->getUserFriendlyError($e->getMessage());
            return response()->json(['status' => 'error', 'message' => $errorMsg], 503);
        }
    }

    /**
     * Convert raw API error messages into user-friendly text.
     */
    private function getUserFriendlyError(string $rawError): string
    {
        if (stripos($rawError, 'quota') !== false || stripos($rawError, 'rate') !== false) {
            return 'AI API quota exceeded. Your API key has reached its usage limit. Please check your plan/billing or try again later.';
        }
        if (stripos($rawError, 'invalid') !== false && stripos($rawError, 'key') !== false) {
            return 'Invalid AI API key. Please check your AI_API_KEY in the .env file.';
        }
        if (stripos($rawError, 'unauthorized') !== false || stripos($rawError, '401') !== false) {
            return 'AI API authentication failed. Please verify your API key.';
        }

        return 'AI service is temporarily unavailable. Please try again later.';
    }
}

