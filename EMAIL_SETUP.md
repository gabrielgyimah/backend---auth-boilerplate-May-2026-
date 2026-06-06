# Email Configuration Guide

This project includes a complete email notification system using **Nodemailer** with SMTP support. Emails are automatically sent at key authentication events.

## Email Events

The following emails are automatically sent:

| Event | When | Recipient |
|-------|------|-----------|
| **Verification Email** | User registers | New user |
| **Email Verified Confirmation** | User verifies email | User |
| **Login OTP** | User logs in with 2FA enabled | User |
| **Password Reset Link** | User requests password reset | User |
| **Password Changed Notification** | User changes/resets password | User |
| **2FA Enabled** | User enables two-factor authentication | User |
| **Login Notification** | Successful login after 2FA | User |
| **Account Locked Alert** | Account locked due to failed attempts | User |

## Setting Up SMTP

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Step Verification** in your Google Account settings
2. **Create an App Password**:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer"
   - Copy the generated 16-character password

3. **Update `.env.development`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   SMTP_FROM_NAME=Your App Name
   ```

### Option 2: Mailtrap (Best for Development)

Mailtrap is a fake SMTP service perfect for testing without sending real emails.

1. **Sign up** at [mailtrap.io](https://mailtrap.io) (free)
2. **Create a new inbox** and copy SMTP credentials
3. **Update `.env.development`**:
   ```env
   SMTP_HOST=live.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-username
   SMTP_PASSWORD=your-password
   SMTP_FROM=dev@example.com
   SMTP_FROM_NAME=Your App Name
   ```
4. View sent emails in the Mailtrap dashboard

### Option 3: Ethereal (Free Temporary Email)

Ethereal provides temporary disposable SMTP credentials for testing.

1. **Visit** [ethereal.email](https://ethereal.email)
2. **Click "Create Ethereal Account"**
3. **Copy the SMTP details** and update `.env.development`:
   ```env
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your-ethereal-username
   SMTP_PASSWORD=your-ethereal-password
   SMTP_FROM=your-ethereal-email@ethereal.email
   SMTP_FROM_NAME=Your App Name
   ```
4. View emails at: https://ethereal.email/messages

### Option 4: SendGrid (Production-Ready)

SendGrid is ideal for production with excellent deliverability and tracking.

1. **Sign up** at [sendgrid.com](https://sendgrid.com)
2. **Create an API key** in Settings → API Keys
3. **Update environment variables**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   SMTP_FROM=noreply@yourdomain.com
   SMTP_FROM_NAME=Your App Name
   ```

### Option 5: AWS SES

For AWS infrastructure, use SES for scalable email sending.

1. **Set up AWS SES** in your region
2. **Create SMTP credentials** in SES Console
3. **Update environment variables**:
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-ses-username
   SMTP_PASSWORD=your-ses-password
   SMTP_FROM=verified-email@yourdomain.com
   SMTP_FROM_NAME=Your App Name
   ```

### Option 6: Custom SMTP Server

If you have your own SMTP server:

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=Your App Name
```

## Email Templates

All email templates are located in `src/infrastructure/email/templates.ts`. Templates are professionally styled HTML with:

- Responsive design
- Branded colors and styling
- Clear call-to-action buttons
- Security-focused messaging
- Footer with app branding

### Customizing Templates

To customize email templates, edit `src/infrastructure/email/templates.ts`:

```typescript
export function verificationEmailTemplate(
  firstName: string,
  verificationUrl: string
): string {
  // Modify the HTML here
}
```

## Testing Email Delivery

### 1. Manual Testing with Postman

1. Register a new user:
   ```
   POST http://localhost:3005/api/v1/auth/register
   {
     "email": "test@example.com",
     "password": "SecurePassword123!",
     "firstName": "John",
     "lastName": "Doe"
   }
   ```

2. Check your email service (Mailtrap, Gmail, etc.) for the verification email

### 2. Automated Testing

```typescript
// Run tests with email capture
npm run test:integration

// Check email logs in ./logs/
```

### 3. Debug Mode

Enable debug logging in `.env.development`:

```env
LOG_LEVEL=debug
```

All email operations will be logged with details about success/failure.

## Security Best Practices

1. **Never commit credentials**: Use `.env` files in `.gitignore`
2. **Rotate API keys regularly**: Especially for SendGrid/SES
3. **Use strong SMTP passwords**: Minimum 16 characters
4. **Enable TLS/SSL**: Always use port 587 (TLS) or 465 (SSL)
5. **Test in development first**: Never test with production emails
6. **Monitor bounce rates**: Track failed deliveries
7. **Implement unsubscribe links**: For transactional emails

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**: Verify host, port, username, password
2. **Enable TLS**: Use port 587 (TLS) instead of 25
3. **Check logs**: Look in `./logs/` directory
4. **Verify firewall**: Ensure outbound SMTP is allowed
5. **Test connection**: Use `telnet` to test SMTP port

```bash
telnet smtp.gmail.com 587
```

### Authentication Failed

1. **Gmail**: Generate new App Password (not regular password)
2. **SendGrid**: Verify API key is correct
3. **Mailtrap**: Check username is correct (usually email)

### Emails in Spam

1. **Add SPF record**: Include SMTP provider's SPF entry
2. **Add DKIM record**: Sign emails with DKIM
3. **Add DMARC policy**: Implement DMARC alignment
4. **Test reputation**: Use tools like MXToolbox

## Monitoring Email Performance

### Key Metrics to Track

- **Delivery rate**: Percentage of emails successfully delivered
- **Open rate**: Percentage of emails opened
- **Click rate**: Percentage of links clicked
- **Bounce rate**: Percentage of failed deliveries
- **Complaint rate**: Percentage of spam complaints

Most SMTP providers include analytics dashboards (SendGrid, Mailgun, etc.).

## Environment Variables Reference

```env
# Required
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
SMTP_FROM=noreply@app.com

# Optional
SMTP_FROM_NAME=Your App Name
```

## Production Checklist

- [ ] Use production SMTP provider (SendGrid, Mailgun, AWS SES)
- [ ] Verify all email domains with SPF/DKIM/DMARC
- [ ] Test email delivery with multiple providers
- [ ] Monitor bounce and complaint rates
- [ ] Set up email unsubscribe mechanism
- [ ] Implement rate limiting on email sends
- [ ] Back up email templates to version control
- [ ] Set up email alerts for delivery failures
- [ ] Test error handling and retries
- [ ] Document email retention policy

## Support

For issues with email configuration, check:

1. Provider documentation (Gmail, SendGrid, etc.)
2. SMTP server logs
3. Application logs in `./logs/`
4. Network connectivity to SMTP server
5. Firewall and port restrictions
