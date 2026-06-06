# Advanced Email Architecture

## Overview

This project implements a production-ready email system with:

✅ **Asynchronous Queuing**: BullMQ + Redis for background processing  
✅ **Enterprise ESP**: SendGrid for reliable delivery  
✅ **Reputation Management**: SPF, DKIM, DMARC support  
✅ **Bounce/Complaint Handling**: Automatic webhook processing  
✅ **Centralized Templates**: SendGrid Dynamic Templates  
✅ **Analytics & Tracking**: Message IDs, delivery status, engagement  

## Architecture Components

### 1. Message Queue (BullMQ)

**Location**: `src/infrastructure/queue/`

```
queue.ts              - Queue management & Redis connection
email.queue.ts        - Email job definitions
email.worker.ts       - Worker that processes email jobs
```

**Features**:
- Automatic retries with exponential backoff
- Priority-based processing
- Job persistence via Redis
- Concurrent job processing (10 by default)
- Health monitoring and statistics

### 2. Email Client (SendGrid)

**Location**: `src/infrastructure/email/clients/sendgrid.client.ts`

Communicates with SendGrid API for:
- Dynamic template rendering
- Message delivery
- Bounce/complaint tracking
- Analytics

### 3. Template Management

**Location**: `src/infrastructure/email/templates/template-config.ts`

**Benefits**:
- Centralized template configuration
- Type-safe template operations
- Environment-based template IDs
- Variable validation

**Available Templates**:
- Email verification
- Password reset
- 2FA codes
- Login notifications
- Security alerts
- Account status changes

### 4. Webhook Handlers

**Location**: `src/modules/webhooks/`

Processes SendGrid events:
- Hard bounces → Mark email as invalid
- Soft bounces → Log for monitoring
- Complaints → Flag and unsubscribe
- Unsubscribes → Respect user preference
- Delivered → Update delivery status

### 5. Queue Manager

**Location**: `src/infrastructure/email/email-queue.manager.ts`

High-level API for queuing emails:
```typescript
EmailQueueManager.queueVerificationEmail(email, firstName, url, userId);
EmailQueueManager.queueLoginOtp(email, firstName, otp, userId);
EmailQueueManager.queuePasswordResetEmail(email, firstName, url, userId);
// ... more methods
```

## Data Flow

```
┌─────────────────────┐
│  Auth Service       │
│  (sends)            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  EmailQueueManager.queue()  │
│  (queues job)              │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  BullMQ Queue                  │
│  (Redis-backed)                │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Email Worker                   │
│  (processes jobs)               │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  SendGrid API                    │
│  (sends email)                   │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Recipient Email Inbox           │
└──────────────────────────────────┘
           │
           ├─► Opens email
           ├─► Clicks link
           ├─► Bounces (hard/soft)
           └─► Reports as spam
           │
           ▼
┌──────────────────────────────────┐
│  SendGrid Webhook                │
│  POST /webhooks/sendgrid         │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Webhook Handler                 │
│  (processes event)               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Database                        │
│  (update user/email status)      │
└──────────────────────────────────┘
```

## Setup Instructions

### 1. SendGrid Configuration

```bash
# Sign up at https://sendgrid.com
# Create API key with Mail Send permission
# Add to environment:
export SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxx"
export SENDGRID_WEBHOOK_KEY="whsec_xxxxxxxxxxxx"

# Create dynamic templates:
# - Verification email
# - OTP code
# - Password reset
# - Login notification
# - Account locked alert
# - Suspicious activity alert

# Set template IDs in environment:
export SENDGRID_TEMPLATE_VERIFICATION="d-xxxxx"
export SENDGRID_TEMPLATE_LOGIN_OTP="d-xxxxx"
export SENDGRID_TEMPLATE_PASSWORD_RESET="d-xxxxx"
# ... etc
```

### 2. Domain Configuration (SPF, DKIM, DMARC)

**SPF (Sender Policy Framework)**:
```
v=spf1 sendgrid.net ~all
```

**DKIM (DomainKeys Identified Mail)**:
- Add CNAME record from SendGrid:
```
sendgrid._domainkey.yourdomain.com CNAME sendgrid.domains.com
```

**DMARC (Domain-based Message Authentication, Reporting and Conformance)**:
```
v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com
```

### 3. Webhook Configuration

**In SendGrid Dashboard**:
1. Go to Settings → Mail Send Settings → Event Webhook
2. Enter URL: `https://yourdomain.com/api/v1/webhooks/sendgrid`
3. Select events:
   - Bounce
   - Complaint
   - Unsubscribe
   - Delivered
4. Copy webhook signing key to `SENDGRID_WEBHOOK_KEY`

### 4. Database Migrations

Required tables for email tracking:
```typescript
// These will be auto-created on first job processing
- emailLog          // Track sent/delivered/failed emails
- emailBounce       // Log bounce events
- emailComplaint    // Log complaint events
```

### 5. Start the Email Worker

```typescript
// In your app initialization
import { getEmailWorker } from '@/infrastructure/queue/email.worker';

const emailWorker = getEmailWorker();
await emailWorker.start();

// On graceful shutdown
await emailWorker.stop();
```

## Environment Variables

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_WEBHOOK_KEY=whsec_xxxxxxxxxxxx

# SendGrid Template IDs (production)
SENDGRID_TEMPLATE_VERIFICATION=d-xxxxx
SENDGRID_TEMPLATE_EMAIL_VERIFIED=d-xxxxx
SENDGRID_TEMPLATE_LOGIN_OTP=d-xxxxx
SENDGRID_TEMPLATE_PASSWORD_RESET=d-xxxxx
SENDGRID_TEMPLATE_PASSWORD_CHANGED=d-xxxxx
SENDGRID_TEMPLATE_2FA_ENABLED=d-xxxxx
SENDGRID_TEMPLATE_LOGIN_NOTIFICATION=d-xxxxx
SENDGRID_TEMPLATE_ACCOUNT_LOCKED=d-xxxxx
SENDGRID_TEMPLATE_ACCOUNT_UNLOCKED=d-xxxxx
SENDGRID_TEMPLATE_SUSPICIOUS_ACTIVITY=d-xxxxx

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Email defaults
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=Your App

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com
```

## Job Priorities

Emails are prioritized in the queue:

| Priority | Type | Delay |
|----------|------|-------|
| 0 (Highest) | Login OTP | Immediate |
| 0 (Highest) | Account Locked | Immediate |
| 0 (Highest) | Suspicious Activity | Immediate |
| 1 | Verification Email | < 1 min |
| 1 | Password Reset | < 1 min |
| 2 | Other notifications | < 5 min |
| 3 | Login Notification | < 10 min |

## Monitoring

### Queue Health Check

```typescript
const stats = await EmailQueueManager.getQueueStats();
console.log({
  waiting: stats.waitingCount,
  active: stats.activeCount,
  completed: stats.completedCount,
  failed: stats.failedCount,
});
```

### Reputation Statistics

```
GET /api/v1/webhooks/sendgrid/stats

Response:
{
  "success": true,
  "data": {
    "totalBounces": 5,
    "permanentBounces": 2,
    "temporaryBounces": 3,
    "totalComplaints": 1,
    "invalidEmails": 2,
    "unsubscribedCount": 0
  }
}
```

### Database Queries

```typescript
// Check email logs
const logs = await db.emailLog.findMany({
  where: { userId: "user-id" },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// Check bounces
const bounces = await db.emailBounce.groupBy({
  by: ['bounceType'],
  _count: true,
});

// Check complaints
const complaints = await db.emailComplaint.findMany({
  orderBy: { occurredAt: 'desc' },
});
```

## Retry Logic

Failed emails automatically retry with exponential backoff:

```
Attempt 1:   Immediate
Attempt 2:   +2 seconds
Attempt 3:   +4 seconds
Max:         3 attempts
```

Failed jobs are persisted in Redis for analysis.

## Testing

### Development (No API Key)

If `SENDGRID_API_KEY` is not set, emails are queued but logged instead:
```
[Email Queue] Verification email queued
[Email Worker] Email sent (dev mode)
```

### Production Checklist

- [ ] Set `SENDGRID_API_KEY`
- [ ] Set all `SENDGRID_TEMPLATE_*` IDs
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Register webhook URL in SendGrid
- [ ] Set `SENDGRID_WEBHOOK_KEY`
- [ ] Start email worker on app startup
- [ ] Monitor queue health
- [ ] Test bounce/complaint handling

## Best Practices

### 1. Template Management

Create templates in SendGrid with handlebars syntax:
```handlebars
Hello {{firstName}},

Please verify your email by clicking below:
{{verificationUrl}}

Best regards,
Your App
```

### 2. Email Variables

All template data is validated before sending:
```typescript
// Type-safe template rendering
EmailTemplateService.validateTemplateData(
  EmailTemplateType.VERIFICATION,
  { firstName: 'John', verificationUrl: 'https://...' }
); // Returns true if valid
```

### 3. Bounce Handling

Hard bounces automatically mark emails as invalid:
```typescript
// User.isEmailInvalid = true
// User.emailInvalidReason = "Hard bounce: user unknown"
```

### 4. Complaint Handling

Spam complaints immediately remove addresses:
```typescript
// User.isEmailComplained = true
// User.emailComplainedAt = new Date()
```

### 5. Monitoring

Check reputation regularly:
```bash
# Get bounce/complaint stats
curl https://yourdomain.com/api/v1/webhooks/sendgrid/stats

# Monitor queue in Redis
redis-cli KEYS "bull:email:*"
redis-cli LRANGE bull:email:jobs 0 10
```

## Troubleshooting

### Emails not being sent

1. Check Redis connection: `redis-cli ping`
2. Check worker status: `EmailQueueManager.getQueueStats()`
3. Check logs: `./logs/` directory
4. Verify `SENDGRID_API_KEY` is set
5. Check queue jobs in Redis

### Bounces not being processed

1. Verify webhook URL in SendGrid
2. Check webhook signing key: `SENDGRID_WEBHOOK_KEY`
3. Check webhook logs
4. Verify database tables exist

### Template rendering issues

1. Check template IDs match SendGrid
2. Validate template variables
3. Check template syntax in SendGrid dashboard
4. Review email logs in database

## References

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [SPF/DKIM/DMARC](https://sendgrid.com/resource/email-deliverability-guide/)
- [Email Best Practices](https://sendgrid.com/blog/)
