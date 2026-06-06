# SendGrid Email Templates

Copy and paste each template into SendGrid's visual editor. Use the **Code** mode to paste HTML, then switch to **Design** mode to customize colors and add your logo.

---

## 1. Email Verification Template

**Template Name:** Email Verification

**Use:** New user signup verification

**Variables:** `firstName`, `verificationUrl`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #3498db; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #2980b9; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .security-note { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; border-radius: 3px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <h1>Verify Your Email Address</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <p>Welcome to our platform! To complete your signup and secure your account, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="{{verificationUrl}}" class="cta-button">Verify Email Address</a>
                </div>
                
                <p><strong>Or copy this link:</strong></p>
                <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 13px;">{{verificationUrl}}</p>
                
                <div class="security-note">
                    <strong>⚠️ Security Tip:</strong> This link will expire in 24 hours. If you didn't create this account, please ignore this email.
                </div>
                
                <p>If you have any questions, feel free to contact our support team.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 2. Email Verified Notification

**Template Name:** Email Verified Confirmation

**Use:** After user successfully verifies email

**Variables:** `firstName`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verified</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .success-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #27ae60; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #27ae60; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #229954; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .success-box { background-color: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="success-badge">✅</div>
                <h1>Email Verified!</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="success-box">
                    <p><strong>Your email has been successfully verified!</strong> Your account is now fully activated and ready to use.</p>
                </div>
                
                <p>You can now:</p>
                <ul style="font-size: 16px;">
                    <li>Access all features of your account</li>
                    <li>Enable two-factor authentication for extra security</li>
                    <li>Manage your account settings</li>
                    <li>Connect with other users</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Log In to Your Account</a>
                </div>
                
                <p>Thank you for joining us! If you need any assistance, our support team is here to help.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 3. Login OTP Template

**Template Name:** Two-Factor Authentication Code

**Use:** Login with 2FA enabled

**Variables:** `firstName`, `otpCode`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #e74c3c; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .otp-box { background-color: #f5f5f5; border: 2px solid #e74c3c; padding: 20px; text-align: center; border-radius: 5px; margin: 25px 0; }
        .otp-code { font-size: 48px; font-weight: bold; color: #e74c3c; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .otp-expiry { color: #e74c3c; font-weight: bold; font-size: 14px; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .security-warning { background-color: #ffe0e0; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0; border-radius: 3px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <h1>Your Login Code</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <p>We received a login attempt to your account. Use the code below to complete your login:</p>
                
                <div class="otp-box">
                    <div class="otp-code">{{otpCode}}</div>
                    <div class="otp-expiry">⏱️ This code expires in 5 minutes</div>
                </div>
                
                <div class="security-warning">
                    <strong>🔒 Security Alert:</strong> Never share this code with anyone. Our team will never ask for it.
                </div>
                
                <p><strong>Didn't try to log in?</strong> If this wasn't you, please:</p>
                <ul style="font-size: 16px;">
                    <li>Do not share this code with anyone</li>
                    <li>Change your password immediately</li>
                    <li>Contact our support team</li>
                </ul>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 4. Password Reset Template

**Template Name:** Password Reset Request

**Use:** User requests password reset

**Variables:** `firstName`, `resetUrl`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #f39c12; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #f39c12; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #e67e22; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .warning-box { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <h1>Reset Your Password</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center;">
                    <a href="{{resetUrl}}" class="cta-button">Reset Password</a>
                </div>
                
                <p><strong>Or copy this link:</strong></p>
                <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 13px;">{{resetUrl}}</p>
                
                <div class="warning-box">
                    <strong>⏰ Time Limit:</strong> This link will expire in 1 hour.
                </div>
                
                <p><strong>Didn't request a password reset?</strong> If this wasn't you, please:</p>
                <ul style="font-size: 16px;">
                    <li>Ignore this email</li>
                    <li>Your password will remain unchanged</li>
                    <li>Contact support if you need help</li>
                </ul>
                
                <p>For your security, we never ask for passwords via email.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 5. Password Changed Notification

**Template Name:** Password Changed Confirmation

**Use:** After user successfully changes password

**Variables:** `firstName`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .success-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #27ae60; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #27ae60; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #229954; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .success-box { background-color: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="success-badge">✅</div>
                <h1>Password Changed Successfully</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="success-box">
                    <p><strong>Your password has been successfully updated!</strong> Your account is now secured with your new password.</p>
                </div>
                
                <p>Your account security is important to us. Here are some tips to keep your account safe:</p>
                <ul style="font-size: 16px;">
                    <li>Use a strong, unique password</li>
                    <li>Enable two-factor authentication for extra security</li>
                    <li>Never share your password with anyone</li>
                    <li>Log out of other sessions if you suspect unauthorized access</li>
                </ul>
                
                <p><strong>If you didn't make this change,</strong> please:</p>
                <ul style="font-size: 16px;">
                    <li>Contact support immediately</li>
                    <li>Change your password again</li>
                    <li>Review your account activity</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Manage Account Settings</a>
                </div>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 6. Two-Factor Authentication Enabled

**Template Name:** 2FA Enabled Confirmation

**Use:** User enables 2FA on their account

**Variables:** `firstName`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication Enabled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .shield-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #9b59b6; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #9b59b6; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #8e44ad; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .security-box { background-color: #f3e5f5; padding: 20px; border-left: 4px solid #9c27b0; margin: 20px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="shield-badge">🛡️</div>
                <h1>Two-Factor Authentication Enabled</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="security-box">
                    <p><strong>Congratulations!</strong> You have successfully enabled two-factor authentication (2FA) on your account. Your account is now much more secure!</p>
                </div>
                
                <p><strong>What this means:</strong></p>
                <ul style="font-size: 16px;">
                    <li>When you log in, you'll need both your password and a verification code</li>
                    <li>The verification code is sent to your email</li>
                    <li>Even if someone has your password, they can't access your account without the code</li>
                    <li>This protects your account from unauthorized access</li>
                </ul>
                
                <p><strong>Important: Save Your Backup Codes</strong></p>
                <p>Make sure you have saved your backup codes in a safe place. You can use these codes if you ever lose access to your email or authenticator app.</p>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">View Security Settings</a>
                </div>
                
                <p>Thank you for keeping your account secure! If you need any help, our support team is available 24/7.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 7. Login Notification (New Device)

**Template Name:** New Login Alert

**Use:** User logs in from new device

**Variables:** `firstName`, `deviceName`, `deviceType`, `ipAddress`, `userAgent`, `timestamp`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Login Detected</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #3498db; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .device-box { background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db; }
        .device-box p { margin: 10px 0; }
        .device-icon { font-size: 24px; margin-right: 10px; }
        .cta-button { display: inline-block; background-color: #3498db; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #2980b9; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <h1>New Login Detected</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <p>We detected a new login to your account. Here are the details:</p>
                
                <div class="device-box">
                    <p><span class="device-icon">📱</span><strong>Device:</strong> {{deviceName}} ({{deviceType}})</p>
                    <p><span class="device-icon">🌐</span><strong>IP Address:</strong> {{ipAddress}}</p>
                    <p><span class="device-icon">⏰</span><strong>Time:</strong> {{timestamp}}</p>
                </div>
                
                <p><strong>Is this you?</strong></p>
                <p>If you recognize this login and device, you can ignore this message. Your account is secure.</p>
                
                <p><strong>Don't recognize this login?</strong> Take action immediately:</p>
                <ul style="font-size: 16px;">
                    <li>Change your password right away</li>
                    <li>Enable two-factor authentication if not already enabled</li>
                    <li>Review your account activity</li>
                    <li>Contact support if you suspect unauthorized access</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Review Account Activity</a>
                </div>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 8. Account Locked Notification

**Template Name:** Account Locked Alert

**Use:** Account locked due to multiple failed login attempts

**Variables:** `firstName`, `reason`, `unlockTime`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Locked</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .warning-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #e74c3c; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #e74c3c; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #c0392b; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .alert-box { background-color: #fadbd8; padding: 20px; border-left: 4px solid #e74c3c; margin: 20px 0; border-radius: 3px; }
        .reason-box { background-color: #f5f5f5; padding: 15px; border-left: 4px solid #95a5a6; margin: 15px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="warning-badge">🔒</div>
                <h1>Your Account Has Been Locked</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="alert-box">
                    <p><strong>⚠️ Security Alert:</strong> Your account has been temporarily locked to protect your security.</p>
                </div>
                
                <p><strong>Reason:</strong></p>
                <div class="reason-box">
                    <p>{{reason}}</p>
                </div>
                
                <p><strong>What happens now?</strong></p>
                <ul style="font-size: 16px;">
                    <li>Your account is locked until {{unlockTime}}</li>
                    <li>You cannot log in during this period</li>
                    <li>After this time, try logging in again</li>
                </ul>
                
                <p><strong>If this was you:</strong></p>
                <p>Don't worry! Your account will be automatically unlocked after the lock period. Just try logging in again later.</p>
                
                <p><strong>If this wasn't you:</strong></p>
                <ul style="font-size: 16px;">
                    <li>Someone may have tried to access your account</li>
                    <li>Change your password immediately when the lock is lifted</li>
                    <li>Enable two-factor authentication for extra security</li>
                    <li>Contact support if you need immediate assistance</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Contact Support</a>
                </div>
                
                <p>Your account security is our priority. We're here to help if you need anything.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 9. Account Unlocked Notification

**Template Name:** Account Unlocked

**Use:** After account is automatically unlocked

**Variables:** `firstName`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Unlocked</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .success-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #27ae60; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #27ae60; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #229954; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .success-box { background-color: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="success-badge">🔓</div>
                <h1>Your Account Has Been Unlocked</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="success-box">
                    <p><strong>Good news!</strong> Your account has been unlocked and you can now log in again.</p>
                </div>
                
                <p>You can proceed with logging into your account. Here are some tips to keep your account secure:</p>
                <ul style="font-size: 16px;">
                    <li>Use a strong, unique password</li>
                    <li>Enable two-factor authentication for extra security</li>
                    <li>Log out of devices you no longer use</li>
                    <li>Regularly review your account activity</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Log In Now</a>
                </div>
                
                <p><strong>If you continue to experience issues:</strong> Please contact our support team for assistance.</p>
                
                <p>Best regards,<br><strong>The Auth App Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 10. Suspicious Activity Alert

**Template Name:** Suspicious Activity Alert

**Use:** Suspicious account activity detected

**Variables:** `firstName`, `activityType`, `ipAddress`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suspicious Activity Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .alert-badge { font-size: 48px; margin-bottom: 15px; }
        .header h1 { color: #c0392b; margin: 0; font-size: 28px; }
        .logo { font-size: 24px; font-weight: bold; color: #3498db; margin-bottom: 20px; }
        .content { margin: 30px 0; }
        .content p { margin: 15px 0; font-size: 16px; }
        .cta-button { display: inline-block; background-color: #c0392b; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background-color: #a93226; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
        .alert-box { background-color: #fadbd8; padding: 20px; border-left: 4px solid #c0392b; margin: 20px 0; border-radius: 3px; }
        .activity-box { background-color: #f5f5f5; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-content">
            <div class="header">
                <div class="logo">🔐 Auth App</div>
                <div class="alert-badge">🚨</div>
                <h1>Suspicious Activity Detected</h1>
            </div>
            
            <div class="content">
                <p>Hi {{firstName}},</p>
                
                <div class="alert-box">
                    <p><strong>⚠️ Security Alert:</strong> We detected suspicious activity on your account. Please review the details below.</p>
                </div>
                
                <p><strong>Activity Details:</strong></p>
                <div class="activity-box">
                    <p><strong>Activity Type:</strong> {{activityType}}</p>
                    <p><strong>IP Address:</strong> {{ipAddress}}</p>
                    <p><strong>Time:</strong> Just now</p>
                </div>
                
                <p><strong>Was this you?</strong></p>
                <ul style="font-size: 16px;">
                    <li>✅ <strong>Yes:</strong> You can safely ignore this message</li>
                    <li>❌ <strong>No:</strong> Take immediate action (see below)</li>
                </ul>
                
                <p><strong>If this wasn't you, take action immediately:</strong></p>
                <ul style="font-size: 16px;">
                    <li>Change your password right away</li>
                    <li>Review your account activity for unauthorized access</li>
                    <li>Enable two-factor authentication if not already active</li>
                    <li>Check connected devices and log out suspicious ones</li>
                    <li>Contact support if you suspect a breach</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="#" class="cta-button">Secure Your Account</a>
                </div>
                
                <p>Your account security is extremely important to us. If you need any assistance, our security team is available 24/7.</p>
                
                <p>Best regards,<br><strong>The Auth App Security Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2026 Auth App. All rights reserved. | <a href="#" style="color: #3498db; text-decoration: none;">Privacy Policy</a> | <a href="#" style="color: #3498db; text-decoration: none;">Terms of Service</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## How to Use These Templates in SendGrid

### For Each Template:

1. **Go to SendGrid Dashboard** → [Dynamic Templates](https://app.sendgrid.com/dynamic_templates)
2. **Click "Create Template"**
3. **Enter the template name** (e.g., "Email Verification")
4. **Click "Create"**
5. **Click "Add Version"**
6. **Click "Code Editor"** (toggle at top)
7. **Paste the HTML code** from above
8. **Click "Save"** 
9. **Switch back to Design mode** to customize colors and add your logo
10. **Copy the template ID** (format: `d-xxxxxxxxxxxxxxxx`)
11. **Add to your `.env`** file

### Example `.env` Entry:
```
SENDGRID_TEMPLATE_VERIFICATION=d-abc1234567890xyz
SENDGRID_TEMPLATE_LOGIN_OTP=d-def1234567890xyz
# etc...
```

---

## Customization Tips

- **Change colors:** Replace hex codes like `#3498db` with your brand colors
- **Add your logo:** In the header section, replace "🔐 Auth App" with an `<img>` tag
- **Update links:** Replace `#` in button hrefs with your actual URLs
- **Adjust spacing:** Modify `padding` and `margin` values
- **Change fonts:** Replace `Arial` with your preferred font

All templates are mobile-responsive and will display beautifully on any device! ✨
