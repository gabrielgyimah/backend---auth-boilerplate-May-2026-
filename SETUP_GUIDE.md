# Complete Email Infrastructure Setup Guide

## System Overview

Your auth boilerplate now includes a **production-grade email infrastructure** with:

- ✅ **Async message queue** (BullMQ + Redis)
- ✅ **Enterprise email service** (SendGrid)
- ✅ **Webhook handlers** for bounce/complaint/delivery tracking
- ✅ **Database logging** for email audit trail
- ✅ **Priority-based job processing** for time-sensitive emails
- ✅ **Type-safe template management**
- ✅ **Automatic retry logic** with exponential backoff

---

## 🚀 Quick Start (5 minutes)

### 1. Verify Redis is Running

```bash
redis-cli ping
# Expected output: PONG
```

### 2. Get SendGrid API Key

1. Go to https://sendgrid.com (sign up if needed)
2. Navigate to Settings → API Keys
3. Create new API key with "Mail Send" permission
4. Copy the key (starts with `SG.`)

### 3. Set Environment Variables

```bash
# Copy example configuration
cp .env.example .env.development

# Edit and add (replace with real values):
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_WEBHOOK_KEY=whsec_placeholder  # Set later
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Application

```bash
npm install
npm run dev
```

**Expected logs:**
```
[INFO] Testing database connection...
[INFO] Database connection successful
[INFO] Initializing email worker...
[INFO] Email worker started successfully
[INFO] Server started
```

### 5. Test Email Queuing

```bash
# Register a user (queues verification email)
curl -X POST http://localhost:3005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Check queue status
curl http://localhost:3005/api/v1/webhooks/sendgrid/stats
```

---

## 📋 Complete Setup (Production)

### Step 1: Create SendGrid Account & Domain

**A. Create Account**
1. Sign up at https://sendgrid.com
2. Complete email verification
3. Add organization details

**B. Verify Sender Domain** (for production)
1. Go to Settings → Sender Authentication → Domain
2. Click "Create"
3. Enter your domain (e.g., `noreply.yourapp.com`)
4. Add DNS records provided:
   - **CNAME for DKIM**: `sendgrid._domainkey.yourapp.com`
   - **SPF**: Add to existing SPF record: `include:sendgrid.net`
   - **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:admin@yourapp.com`

**C. Create Verified Sender**
1. Settings → Sender Verification
2. Click "Create New Sender"
3. Enter your from name and email (e.g., `noreply@yourapp.com`)

### Step 2: Create Email Templates

In SendGrid dashboard:

1. **Email API** → **Dynamic Templates**
2. Click **Create Template**
3. Repeat for each of 10 template types:

```
VERIFICATION_EMAIL
├─ Name: Email Verification
├─ Variables: {{firstName}}, {{verificationUrl}}
└─ Template ID: d-xxxx...

LOGIN_OTP
├─ Name: Login OTP Code
├─ Variables: {{firstName}}, {{otpCode}}, {{expiresIn}}
└─ Template ID: d-xxxx...

PASSWORD_RESET
├─ Name: Password Reset
├─ Variables: {{firstName}}, {{resetUrl}}, {{expiresIn}}
└─ Template ID: d-xxxx...

PASSWORD_CHANGED
├─ Name: Password Changed Confirmation
├─ Variables: {{firstName}}, {{changedAt}}
└─ Template ID: d-xxxx...

EMAIL_VERIFIED
├─ Name: Email Verified
├─ Variables: {{firstName}}
└─ Template ID: d-xxxx...

TWO_FACTOR_ENABLED
├─ Name: Two-Factor Authentication Enabled
├─ Variables: {{firstName}}
└─ Template ID: d-xxxx...

LOGIN_NOTIFICATION
├─ Name: New Login Alert
├─ Variables: {{firstName}}, {{deviceName}}, {{location}}, {{time}}
└─ Template ID: d-xxxx...

ACCOUNT_LOCKED
├─ Name: Account Locked
├─ Variables: {{firstName}}, {{reason}}, {{unlockTime}}
└─ Template ID: d-xxxx...

ACCOUNT_UNLOCKED
├─ Name: Account Unlocked
├─ Variables: {{firstName}}
└─ Template ID: d-xxxx...

SUSPICIOUS_ACTIVITY
├─ Name: Suspicious Activity Alert
├─ Variables: {{firstName}}, {{activityType}}, {{ipAddress}}
└─ Template ID: d-xxxx...
```

### Step 3: Configure Environment Variables

Update `.env.production`:

```bash
# SendGrid API
SENDGRID_API_KEY=SG.your-production-key

# Template IDs (from step 2)
SENDGRID_TEMPLATE_VERIFICATION=d-xxx
SENDGRID_TEMPLATE_EMAIL_VERIFIED=d-xxx
SENDGRID_TEMPLATE_LOGIN_OTP=d-xxx
SENDGRID_TEMPLATE_PASSWORD_RESET=d-xxx
SENDGRID_TEMPLATE_PASSWORD_CHANGED=d-xxx
SENDGRID_TEMPLATE_2FA_ENABLED=d-xxx
SENDGRID_TEMPLATE_LOGIN_NOTIFICATION=d-xxx
SENDGRID_TEMPLATE_ACCOUNT_LOCKED=d-xxx
SENDGRID_TEMPLATE_ACCOUNT_UNLOCKED=d-xxx
SENDGRID_TEMPLATE_SUSPICIOUS_ACTIVITY=d-xxx

# Webhook (set after registration)
SENDGRID_WEBHOOK_KEY=whsec_xxx
```

### Step 4: Register Webhook for Bounce/Complaint Handling

**In SendGrid Dashboard:**

1. **Settings** → **Mail Send** → **Event Webhook**
2. Click **Create New Webhook**
3. **URL**: `https://yourapp.com/api/v1/webhooks/sendgrid`
4. **Select Events**:
   - ☑ Bounce
   - ☑ Complaint
   - ☑ Delivered
   - ☑ Unsubscribe
5. Click **Create**
6. Copy the **Signing Key** (starts with `whsec_`)
7. Update `.env.production` with `SENDGRID_WEBHOOK_KEY=whsec_xxx`

**In Your Application:**

```typescript
// app.ts already includes:
import webhookRoutes from '@/modules/webhooks/routes';
app.use('/api/v1/webhooks', webhookRoutes);

// Webhook endpoints available:
POST   /api/v1/webhooks/sendgrid        # Receive events
GET    /api/v1/webhooks/sendgrid/stats  # Get reputation stats
```

### Step 5: Configure Redis for Production

```bash
# Install Redis (if not installed)
# macOS
brew install redis

# Linux
sudo apt-get install redis-server

# Windows
# Download from https://redis.io/download

# Start Redis
redis-server

# Verify
redis-cli ping  # Should return PONG
```

Update `.env.production`:

```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # if required
```

### Step 6: Database Schema

The migration is already created. Run:

```bash
npm run prisma:migrate
```

This creates three new tables:
- `EmailLog` - All sent emails with status tracking
- `EmailBounce` - Hard/soft bounce tracking
- `EmailComplaint` - Spam complaint tracking

### Step 7: Deploy Email Worker

The email worker starts automatically when the app starts:

```typescript
// src/index.ts (already configured)
const emailWorker = getEmailWorker();
await emailWorker.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.stop();
  process.exit(0);
});
```

---

## 🔍 Monitoring & Debugging

### Check Queue Health

```bash
curl http://localhost:3005/api/v1/webhooks/sendgrid/stats

# Response:
{
  "success": true,
  "data": {
    "totalBounces": 0,
    "permanentBounces": 0,
    "temporaryBounces": 0,
    "totalComplaints": 0,
    "invalidEmails": 0,
    "unsubscribedCount": 0
  }
}
```

### View Email Logs in Database

```bash
# Start Prisma Studio
npx prisma studio

# Navigate to:
# EmailLog → View all sent emails
# EmailBounce → View bounce list
# EmailComplaint → View complaints
```

### Monitor Redis Queue

```bash
# Connect to Redis
redis-cli

# View queue stats
> KEYS bull:email:*
> ZCARD bull:email:waiting   # Waiting jobs
> ZCARD bull:email:active    # Currently processing
> ZCARD bull:email:completed # Completed jobs
```

### View Application Logs

```bash
# Logs are in ./logs directory
tail -f logs/app.log | grep -i email
```

### Test Bounce Handling

1. In SendGrid, click a template
2. Go to **Test** tab
3. Send test email to bounce address:
   - **Permanent bounce**: `bounce@simulator.amazonses.com`
   - **Complaint**: `complaint@simulator.amazonses.com`
4. Check `EmailBounce` table in database

---

## 📊 Email Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│         User Action (Register, Login, etc.)         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│    Auth Service calls EmailQueueManager.queue*()    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│   Redis Queue: Email job stored with metadata      │
│   Priority: 0-3 based on type (OTP=high)           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│      Email Worker (Concurrency: 10 jobs)           │
│   1. Fetch job from queue                          │
│   2. Validate template variables                    │
│   3. Prepare SendGrid payload                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│     SendGrid API: Send email via HTTP POST         │
│   Response: messageId + status                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│   Database Logging:                                 │
│   - EmailLog: SENT status + messageId               │
│   - User notification stored                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│     User Receives Email + Interacts                 │
│   (Opens, Bounces, Complains, Unsubscribes)        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│   SendGrid Event: Webhook HTTP POST                 │
│   X-Twilio-Email-Event-Webhook-Signature: HMAC-256 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│   Webhook Handler:                                  │
│   - Verify signature (security)                     │
│   - Process event (bounce/complaint/delivered)      │
│   - Update user status (isEmailInvalid, etc.)       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│    Database Updates:                                │
│   - EmailLog: DELIVERED/BOUNCED status              │
│   - EmailBounce: Track bounce type                  │
│   - User: Mark as invalid/complained               │
└─────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Considerations

### 1. API Key Security

```bash
# ❌ NEVER commit API keys
# .env files should be in .gitignore

# ✅ Store in environment variables
export SENDGRID_API_KEY="SG.xxx"

# ✅ Use CI/CD secrets for deployments
# GitHub Actions, GitLab CI, etc.
```

### 2. Webhook Signature Verification

```typescript
// Already implemented in webhook.service.ts
validateWebhookSignature(payload, signature, timestamp) {
  // Verifies HMAC-SHA256 signature from SendGrid
  // Prevents replay attacks
}
```

### 3. Email Validation

```typescript
// Zod schema validates email format
const EmailJobData = z.object({
  to: z.string().email(),  // ← Validates RFC 5322
  // ...
});
```

### 4. Rate Limiting

```typescript
// app.ts includes global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

### 5. CORS Protection

```typescript
// Only allow frontend domain
cors({
  origin: config.CORS_ORIGIN,  // Your frontend URL
  credentials: true,
})
```

---

## 🧪 Testing Guide

### Test Email Queuing

```bash
# 1. Register user (queues verification email)
curl -X POST http://localhost:3005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Check queue was populated
redis-cli ZCARD bull:email:waiting  # Should be > 0

# 3. Verify worker processed it
redis-cli ZCARD bull:email:completed  # Should increase

# 4. Verify database was updated
# SELECT * FROM "EmailLog" WHERE status = 'SENT';
```

### Test Bounce Handling

```bash
# 1. Send email to bounce simulator
# In SendGrid, use test recipient: bounce@simulator.amazonses.com

# 2. Webhook fires automatically
# Check logs for webhook processing

# 3. Verify database updated
# SELECT * FROM "EmailBounce" WHERE email = 'bounce@simulator.amazonses.com';
```

### Test Webhook Signature Verification

```bash
# 1. Send webhook with wrong signature
curl -X POST http://localhost:3005/api/v1/webhooks/sendgrid \
  -H "X-Twilio-Email-Event-Webhook-Signature: invalid" \
  -H "X-Twilio-Email-Event-Webhook-Timestamp: $(date +%s)" \
  -H "Content-Type: application/json" \
  -d '[{"event":"delivered"}]'

# Should return 401 Unauthorized
```

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to Redis"

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
redis-server

# Update .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Issue: "SENDGRID_API_KEY not configured"

**Solution:**
```bash
# Get key from SendGrid
# https://sendgrid.com/settings/api_keys

# Set in .env
export SENDGRID_API_KEY="SG.your-key"

# Restart app
npm run dev
```

### Issue: "Template not found"

**Solution:**
```bash
# Create templates in SendGrid
# https://sendgrid.com/dynamic_templates

# Update .env with template IDs
SENDGRID_TEMPLATE_VERIFICATION=d-xxx
SENDGRID_TEMPLATE_LOGIN_OTP=d-xxx
# ... etc for all 10 templates
```

### Issue: "Webhook not receiving events"

**Solution:**
```bash
# 1. Verify webhook URL is public
# Use ngrok for local testing:
ngrok http 3005
# Update webhook URL in SendGrid to ngrok URL

# 2. Check webhook signing key
# Make sure SENDGRID_WEBHOOK_KEY matches SendGrid dashboard

# 3. Verify webhook events selected
# Go to SendGrid → Settings → Mail Send → Event Webhook
# Ensure Bounce, Complaint, Delivered are checked

# 4. Check application logs
tail -f logs/app.log | grep webhook
```

---

## 📚 File Structure

```
src/
├── infrastructure/
│   ├── queue/
│   │   ├── queue.ts              # Queue management
│   │   ├── email.queue.ts        # Job definitions
│   │   ├── email.worker.ts       # Worker process
│   │   └── index.ts              # Exports
│   └── email/
│       ├── clients/
│       │   ├── sendgrid.client.ts # SendGrid client
│       │   └── index.ts
│       ├── templates/
│       │   ├── template-config.ts # Config
│       │   └── index.ts
│       ├── email-queue.manager.ts # Queue API
│       ├── email.service.ts      # Legacy SMTP
│       └── index.ts
├── modules/
│   ├── webhooks/
│   │   ├── sendgrid-webhook.service.ts
│   │   ├── webhook.controller.ts
│   │   ├── routes.ts
│   │   └── index.ts
│   └── auth/
│       └── services/auth.service.ts  # Uses queue
├── config/
│   └── index.ts                  # SendGrid vars
├── app.ts                        # Includes webhooks
└── index.ts                      # Starts worker
```

---

## 📖 Further Reading

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Prisma ORM Guide](https://www.prisma.io/docs/)

---

## ✅ Checklist

- [ ] Redis is running locally
- [ ] SendGrid account created
- [ ] Domain verified (if production)
- [ ] API key created and saved to `.env`
- [ ] 10 email templates created in SendGrid
- [ ] Template IDs added to `.env`
- [ ] Webhook registered and key saved to `.env`
- [ ] Database migration run (`npm run prisma:migrate`)
- [ ] App starts without errors (`npm run dev`)
- [ ] Queue stats endpoint responds (`curl localhost:3005/api/v1/webhooks/sendgrid/stats`)
- [ ] Test user registration queues email
- [ ] Email received in inbox (or SendGrid dashboard if no API key)
- [ ] Bounce/complaint handling tested

---

## 🎯 Next Steps

1. **Production Deployment**
   - Set up Redis on production server
   - Configure SendGrid webhook to production domain
   - Set all environment variables
   - Run database migrations
   - Monitor email delivery metrics

2. **Advanced Monitoring**
   - Set up email delivery dashboards
   - Configure alerts for high bounce rates
   - Implement retry monitoring
   - Track queue performance

3. **Scaling**
   - Increase worker concurrency in email.worker.ts
   - Add multiple worker instances
   - Implement multi-queue strategy (by priority)
   - Monitor Redis memory usage

4. **Customization**
   - Add more email templates
   - Implement email preferences (opt-in/out)
   - Add email scheduling
   - Implement batch sending

---

**Questions?** Check ADVANCED_EMAIL_ARCHITECTURE.md for detailed technical documentation.
