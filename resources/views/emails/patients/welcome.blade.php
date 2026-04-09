<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to PulsePortal</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td style="background-color: #0ea5e9; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">PulsePortal</h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Welcome, {{ $patientName }}!</h2>
                            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Your patient portal account has been successfully created. We are thrilled to have you on board.</p>
                            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">You can now securely log in to view your medical records, schedule appointments, and communicate directly with your healthcare providers.</p>

                            <div style="text-align: center; margin: 35px 0;">
                                <a href="http://localhost:5173/login" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Log In to Your Portal</a>
                            </div>

                            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Stay healthy,</p>
                            <p style="font-size: 16px; line-height: 1.6; color: #111827; font-weight: bold; margin-bottom: 0;">The PulsePortal Administration Team</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="font-size: 12px; color: #6b7280; margin: 0;">© {{ date('Y') }} PulsePortal Hospital System. All rights reserved.</p>
                            <p style="font-size: 12px; color: #9ca3af; margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
                        </td>
                    </tr>
                    
                </table>

            </td>
        </tr>
    </table>
    
</body>
</html>