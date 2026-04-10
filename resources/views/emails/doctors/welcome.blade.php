<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to the PulsePortal Medical Staff</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td style="background-color: #0369a1; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">PulsePortal</h1>
                            <p style="color: #bae6fd; margin: 5px 0 0 0; font-size: 14px;">Provider Network</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Welcome to the team, Dr. {{ $doctorName }}!</h2>
                            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Your official provider account has been successfully provisioned by the hospital administration.</p>
                            
                            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Through your secure dashboard, you can now manage your daily appointments, review patient histories, and update medical records and prescriptions.</p>

                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0;">
                                <h3 style="margin-top: 0; font-size: 16px; color: #0f172a; margin-bottom: 10px;">Your Login Credentials</h3>
                                <p style="margin: 0 0 8px 0; font-size: 15px; color: #4b5563;"><strong>Portal URL:</strong> <a href="http://localhost:5173/auth" style="color: #0284c7; text-decoration: none;">Login Portal</a></p>
                                <p style="margin: 0 0 8px 0; font-size: 15px; color: #4b5563;"><strong>Login Email:</strong> {{ $loginEmail }}</p>
                                <p style="margin: 0; font-size: 15px; color: #4b5563;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{{ $tempPassword }}</span></p>
                            </div>

                            <div style="text-align: center; margin: 35px 0;">
                                <a href="http://localhost:5173/doctor" style="background-color: #0369a1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Access Dashboard</a>
                            </div>

                            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; font-style: italic;">* Please remember to change your temporary password immediately upon your first login for security purposes.</p>

                            <p style="font-size: 16px; line-height: 1.6; color: #111827; font-weight: bold; margin-top: 30px; margin-bottom: 0;">System Administration</p>
                            <p style="font-size: 14px; color: #6b7280; margin-top: 2px;">PulsePortal Hospital Management</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="font-size: 12px; color: #6b7280; margin: 0;">© {{ date('Y') }} PulsePortal. Confidential and secure communication.</p>
                            <p style="font-size: 12px; color: #9ca3af; margin: 5px 0 0 0;">If you require technical assistance, please contact IT support.</p>
                        </td>
                    </tr>
                    
                </table>

            </td>
        </tr>
    </table>
    
</body>
</html>