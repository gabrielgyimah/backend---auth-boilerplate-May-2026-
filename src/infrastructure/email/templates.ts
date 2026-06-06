/**
 * Email Templates
 * HTML email templates for all email communications
 */

// ============================================================================
// EMAIL VERIFICATION TEMPLATE
// ============================================================================

export function verificationEmailTemplate(
  firstName: string,
  verificationUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; margin: 20px 0; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Thank you for registering with us! To get started, please verify your email address.</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p><small>${verificationUrl}</small></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// OTP EMAIL TEMPLATE
// ============================================================================

export function otpEmailTemplate(firstName: string, otpCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .otp-box { background-color: #e9ecef; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #28a745; letter-spacing: 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Login Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Your login verification code is:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't attempt to login, please ignore this email. Your account is secure.</p>
            <p><strong>Never share this code with anyone.</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// PASSWORD RESET TEMPLATE
// ============================================================================

export function passwordResetTemplate(
  firstName: string,
  resetUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; margin: 20px 0; padding: 12px 30px; background-color: #ffc107; color: #333; text-decoration: none; border-radius: 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link in your browser:</p>
            <p><small>${resetUrl}</small></p>
            <div class="warning">
              <p><strong>Important:</strong> This link will expire in 24 hours. If you don't reset your password within this time, you'll need to request a new reset link.</p>
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// PASSWORD CHANGED TEMPLATE
// ============================================================================

export function passwordChangedTemplate(firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please reset your password immediately and contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// TWO-FACTOR ENABLED TEMPLATE
// ============================================================================

export function twoFactorEnabledTemplate(
  firstName: string,
  backupCodes?: string[]
): string {
  const backupCodesHtml = backupCodes
    ? `
      <div style="background-color: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace;">
        <p><strong>Backup Codes (save these in a safe place):</strong></p>
        ${backupCodes.map((code) => `<p>${code}</p>`).join('')}
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication Enabled</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Two-factor authentication has been successfully enabled on your account.</p>
            <p>From now on, you'll need to enter a verification code in addition to your password when logging in.</p>
            ${backupCodesHtml}
            <p><strong>Keep these codes safe.</strong> You can use them to access your account if you lose access to your authentication app.</p>
            <p>If you didn't enable two-factor authentication, please disable it immediately in your account settings.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// LOGIN NOTIFICATION TEMPLATE
// ============================================================================

export function loginNotificationTemplate(
  firstName: string,
  deviceInfo: {
    name: string;
    type: string;
    ipAddress?: string;
    userAgent?: string;
  }
): string {
  const timestamp = new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .device-info { background-color: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .device-info p { margin: 5px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Login Detected</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We detected a new login to your account at <strong>${timestamp}</strong>.</p>
            <div class="device-info">
              <p><strong>Device:</strong> ${deviceInfo.name}</p>
              <p><strong>Type:</strong> ${deviceInfo.type}</p>
              ${deviceInfo.ipAddress ? `<p><strong>IP Address:</strong> ${deviceInfo.ipAddress}</p>` : ''}
              ${deviceInfo.userAgent ? `<p><strong>Browser:</strong> ${deviceInfo.userAgent}</p>` : ''}
            </div>
            <p>If this was you, you can safely ignore this email.</p>
            <p>If you don't recognize this login, please change your password immediately and review your active sessions.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
