<div style="font-family: sans-serif; background-color: #f9fafb; padding: 24px; display: flex; justify-content: center;">
    <div
        style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #f3f4f6; overflow: hidden;">

        <div
            style="padding: 24px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: start;">
            <div>
                <h1 style="font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">Appointment Details
                </h1>
            </div>

            <div style="margin-left: auto;">
                @if($appointment->status === 'confirmed')
                    <span
                        style="padding: 4px 12px; background-color: #f0fdf4; color: #15803d; font-size: 14px; font-weight: 500; border-radius: 9999px; border: 1px solid #bbf7d0;">
                        Confirmed
                    </span>
                @elseif($appointment->status === 'pending')
                    <span
                        style="padding: 4px 12px; background-color: #fefce8; color: #a16207; font-size: 14px; font-weight: 500; border-radius: 9999px; border: 1px solid #fef08a;">
                        Pending Review
                    </span>
                @elseif($appointment->status === 'cancelled')
                    <span
                        style="padding: 4px 12px; background-color: #fef2f2; color: #b91c1c; font-size: 14px; font-weight: 500; border-radius: 9999px; border: 1px solid #fecaca;">
                        Cancelled
                    </span>
                @endif
            </div>
        </div>

        @if($appointment->status === 'confirmed')
            <div style="padding: 16px 24px; background-color: #f0fdf4; border-bottom: 1px solid #f3f4f6;">
                <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
                    <strong>Great news!</strong> Your appointment has been officially confirmed. Please review the details
                    below.
                </p>
            </div>
        @elseif($appointment->status === 'pending')
            <div style="padding: 16px 24px; background-color: #fefce8; border-bottom: 1px solid #f3f4f6;">
                <p style="margin: 0; font-size: 14px; color: #854d0e; line-height: 1.5;">
                    Your appointment request has been received and is currently pending review. We will notify you once an
                    admin confirms it.
                </p>
            </div>
        @elseif($appointment->status === 'cancelled')
            <div style="padding: 16px 24px; background-color: #fef2f2; border-bottom: 1px solid #f3f4f6;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">
                    <strong>Notice:</strong> This appointment has been cancelled. If you believe this is an error or wish to
                    reschedule, please log into your portal.
                </p>
            </div>
        @endif

        <div style="padding: 24px; background-color: #f8fafc; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; flex-wrap: wrap; gap: 24px;">

                <div style="flex: 1; min-width: 200px;">
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Date & Time</p>
                    <p style="font-weight: 600; color: #111827; margin: 0;">
                        {{ \Carbon\Carbon::parse($appointment->appointment_date)->format('F j, Y') }}
                    </p>
                    <p style="font-size: 14px; color: #4b5563; margin-top: 4px;">
                        {{ \Carbon\Carbon::parse($appointment->appointment_time)->format('g:i A') }}
                    </p>
                </div>

                <div style="flex: 1; min-width: 200px;">
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Location / Type</p>
                    @if($appointment->type === 'online')
                        <p style="font-weight: 600; color: #111827; margin: 0;">Video Consultation</p>
                        @if(isset($appointment->meeting_link) && $appointment->meeting_link)
                            <a href="{{ $appointment->meeting_link }}"
                                style="font-size: 14px; color: #2563eb; text-decoration: none; font-weight: 500; display: block; margin-top: 4px;">
                                Join Meeting Room &rarr;
                            </a>
                        @else
                            <p style="font-size: 14px; color: #6b7280; margin-top: 4px;">Link will be provided before start.</p>
                        @endif
                    @else
                        <p style="font-weight: 600; color: #111827; margin: 0;">In-Person Visit</p>
                    @endif
                </div>
            </div>
        </div>

        <div style="padding: 24px; border-bottom: 1px solid #f3f4f6;">
            <p style="font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 12px;">Doctor Information</p>
            <div>
                <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0;">
                    Dr. {{ $appointment->doctor->user->name }}
                </h3>
                <p style="color: #2563eb; font-weight: 500; margin-top: 2px;">
                    {{ $appointment->doctor->department ?? 'Specialist' }}
                </p>
                <p style="color: #4b5563; font-weight: 500; margin-top: 2px;">
                    Fee: ৳{{ $appointment->doctor->consultation_fee ?? 'TBD' }}
                </p>
            </div>
        </div>

        <div style="padding: 24px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>This is an automated notification from PulsePortal. Please do not reply to this email.</p>
        </div>
    </div>
</div>