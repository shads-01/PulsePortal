<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prescription - {{ $prescription->patient_name }}</title>
    <style>
        /* Base Reset */
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b; /* slate-800 */
            margin: 0;
            padding: 0;
            font-size: 14px;
        }
        
        /* Layout Wrappers */
        .container {
            width: 100%;
            margin: 0 auto;
        }

        /* Header (Mimicking the Gradient Banner) */
        .header {
            background-color: #127fec; /* Fallback for gradient */
            color: #ffffff;
            padding: 30px;
        }
        .header table {
            width: 100%; border: none;
        }
        .header-title {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
        }
        .header-subtitle {
            color: #dbeafe; /* blue-100 */
            font-size: 12px;
            margin-top: 4px;
        }
        .header-date {
            text-align: right;
        }
        .header-date p {
            margin: 0;
        }
        .header-date .date {
            font-weight: bold;
            font-size: 14px;
        }
        .header-date .time {
            font-size: 12px;
            color: #dbeafe;
            margin-top: 4px;
        }

        /* Body Section */
        .body-content {
            padding: 30px;
        }

        /* Doctor & Patient Info Cards (Using Tables for Grid) */
        .info-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 15px 0; /* Creates the gap between the two cards */
            margin-left: -15px; /* Offsets the spacing on the left */
            margin-bottom: 30px;
        }
        .info-card {
            background-color: #f8fafc; /* slate-50 */
            border: 1px solid #f1f5f9; /* slate-100 */
            padding: 20px;
            width: 50%;
            vertical-align: top;
        }
        .card-label {
            font-size: 11px;
            font-weight: bold;
            color: #64748b; /* slate-500 */
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .card-name {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 5px 0;
        }
        .card-detail {
            font-size: 12px;
            color: #64748b;
            margin: 0 0 3px 0;
        }
        .diagnosis-badge {
            display: inline-block;
            background-color: #ffffff;
            border: 1px solid #f1f5f9;
            padding: 4px 8px;
            font-size: 12px;
            color: #64748b;
            margin-top: 10px;
        }

        /* Medicines Section */
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 15px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 5px;
        }
        .medicine-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .medicine-table th {
            background-color: #ffffff;
            color: #94a3b8; /* slate-400 */
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        .medicine-table td {
            background-color: #f8fafc; /* slate-50 */
            padding: 15px 10px;
            border-bottom: 5px solid #ffffff; /* Creates a gap between rows */
            font-size: 13px;
        }
        .med-name { font-weight: bold; color: #1e293b; }
        .med-detail { color: #475569; }

        /* Notes Section */
        .notes-box {
            background-color: #fffbeb; /* amber-50 */
            border: 1px solid #fef3c7; /* amber-100 */
            padding: 20px;
            color: #334155; /* slate-700 */
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .notes-title {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;
            font-size: 14px;
        }

        /* Recommended Tests Section */
        .tests-box {
            background-color: #eff6ff; /* blue-50 */
            border: 1px solid #dbeafe; /* blue-100 */
            padding: 20px;
            color: #334155; /* slate-700 */
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .tests-title {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;
            font-size: 14px;
        }

        /* Footer */
        .footer {
            border-top: 1px solid #f1f5f9;
            padding-top: 15px;
            font-size: 12px;
            color: #94a3b8; /* slate-400 */
        }
    </style>
</head>
<body>

    <div class="container">
        
        <div class="header">
            <table>
                <tr>
                    <td style="vertical-align: middle;">
                        <h1 class="header-title">PRESCRIPTION</h1>
                        <p class="header-subtitle">PulsePortal Medical System</p>
                    </td>
                    <td class="header-date" style="vertical-align: middle;">
                        <p class="date">{{ \Carbon\Carbon::parse($prescription->appointment_date)->format('M d, Y') }}</p>
                        <p class="time">{{ \Carbon\Carbon::parse($prescription->appointment_time)->format('h:i A') }}</p>
                    </td>
                </tr>
            </table>
        </div>

        <div class="body-content">
            
            <table class="info-table">
                <tr>
                    <td class="info-card">
                        <div class="card-label">Prescribing Doctor</div>
                        <p class="card-name">Dr. {{ $prescription->doctor_name }}</p>
                        @if($prescription->doctor_specialization)
                            <p class="card-detail">{{ $prescription->doctor_specialization }}</p>
                        @endif
                        @if($prescription->doctor_license)
                            <p class="card-detail">License: {{ $prescription->doctor_license }}</p>
                        @endif
                    </td>

                    <td class="info-card">
                        <div class="card-label">Patient</div>
                        <p class="card-name">{{ $prescription->patient_name }}</p>
                        @if($prescription->disease_or_problem)
                            <div class="diagnosis-badge">
                                <strong>Diagnosis:</strong> {{ $prescription->disease_or_problem }}
                            </div>
                        @endif
                    </td>
                </tr>
            </table>

            <div class="section-title">Prescribed Medicines</div>
            @if(count($prescription->medicines) > 0)
                <table class="medicine-table">
                    <thead>
                        <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Instructions</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($prescription->medicines as $med)
                            <tr>
                                <td class="med-name">{{ $med['name'] ?? '—' }}</td>
                                <td class="med-detail">{{ $med['dosage'] ?? '—' }}</td>
                                <td class="med-detail">{{ $med['instruction'] ?? '—' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="font-size: 13px; color: #94a3b8; font-style: italic;">No medicines listed.</p>
            @endif

            @if($prescription->notes)
                <div class="notes-box">
                    <div class="notes-title">Doctor's Notes</div>
                    {!! nl2br(e($prescription->notes)) !!}
                </div>
            @endif

            @if($prescription->recommended_tests)
                <div class="tests-box">
                    <div class="tests-title">Recommended Tests / Reports</div>
                    {!! nl2br(e($prescription->recommended_tests)) !!}
                </div>
            @endif

            <div class="footer">
                Issued on {{ \Carbon\Carbon::parse($prescription->appointment_date)->format('F j, Y') }}
            </div>

        </div>
    </div>

</body>
</html>