# Email Architecture Quick Start

## Overview

The system now uses:
- **BullMQ + Redis** for async email queuing
- **SendGrid API** for reliable email delivery
- **Webhook handlers** for bounce/complaint feedback
- **Dynamic templates** for centralized template management

## 1-Minute Setup

### Step 1: Configure Redis

```bash
# Make sure Redis is running
redis-cli ping
# Should return: PONG
```

### Step 2: Set Environment Variables

```bash
# Copy template
cp .env.example .env.development

# Edit and add SendGrid API key
export SENDGRID_API_KEY="SG.your-api-key-here"
export SENDGRID_WEBHOOK_KEY="whsec_your-webhook-key"
export FRONTEND_URL="http://localhost:3000"
```

### Step 3: Start Email Worker

```typescript
// In your app initialization (app.ts or index.ts)
import { getEmailWorker } from '@/infrastructure/queue/email.worker';

async function initializeApp() {
  // ... other initialization ...
  
  const emailWorker = getEmailWorker();
  await emailWorker.start();
  console.log('Email worker started');
}
```

### Step 4: Test Email Queuing

```bash
# Start the app
npm run dev

# Register a user - should queue verification email
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

## How It Works

### Email Flow

```
1. User Action (register, login, etc.)
   ↓
2. Auth Service calls EmailQueueManager.queue*()
   ↓
3. Email job added to Redis queue
   ↓
4. Email Worker picks up job
   ↓
5. SendGrid API sends email
   ↓
6. User receives email
   ↓
7. User opens/bounces/complains
   ↓
8. SendGrid webhook notifies app
   ↓
9. App updates user status in DB
```

### Key Methods

```typescript
// Queue emails (non-blocking)
await EmailQueueManager.queueVerificationEmail(email, firstName, url, userId);
await EmailQueueManager.queueLoginOtp(email, firstName, otp, userId);
await EmailQueueManager.queuePasswordResetEmail(email, firstName, url, userId);
await EmailQueueManager.queueLoginNotification(email, firstName, deviceInfo, userId);

// Check status
const stats = await EmailQueueManager.getQueueStats();
const health = await EmailQueueManager.getQueueHealth();
```

## Production Setup

### 1. Create SendGrid Account

```bash
# Sign up at https://sendgrid.com
# Create API key with Mail Send permission
# Setup verified sender domain
```

### 2. Create Email Templates

In SendGrid dashboard:
1. Go to **Email API** → **Dynamic Templates**
2. Create template for each email type
3. Use variables: `{{firstName}}`, `{{otpCode}}`, etc.
4. Copy template IDs to `.env`

### 3. Configure Domain

Add DNS records:
```
# SPF
v=spf1 sendgrid.net ~all

# DKIM (get from SendGrid)
sendgrid._domainkey.yourdomain.com CNAME sendgrid.domains.com

# DMARC
v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com
```

### 4. Setup Webhook

In SendGrid:
1. Settings → Mail Send → Event Webhook
2. URL: `https://yourdomain.com/api/v1/webhooks/sendgrid`
3. Events: Bounce, Complaint, Delivered, Unsubscribe
4. Save webhook signing key

### 5. Update Routes

```typescript
// In app.ts
import webhookRoutes from '@/modules/webhooks/routes';

app.use('/api/v1/webhooks', webhookRoutes);
```

### 6. Start Worker

```typescript
// In index.ts - ensure worker starts on app boot
const emailWorker = getEmailWorker();
await emailWorker.start();

// On shutdown
process.on('SIGTERM', async () => {
  await emailWorker.stop();
  process.exit(0);
});
```

## Monitoring

### Queue Stats

```bash
# View queue health
curl http://localhost:3005/api/v1/webhooks/sendgrid/stats

# Output:
{
  "success": true,
  "data": {
    "totalBounces": 5,
    "permanentBounces": 2,
    "totalComplaints": 0,
    "invalidEmails": 2,
    "unsubscribedCount": 0
  }
}
```

### Database Logs

```typescript
// Check email delivery logs
const logs = await db.emailLog.findMany({
  where: { userId: "user-id" },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// Check bounces
const bounces = await db.emailBounce.findMany({
  orderBy: { occurredAt: 'desc' },
});
```

### Redis CLI

```bash
# Connect to Redis
redis-cli

# List email queue jobs
KEYS bull:email:*
LRANGE bull:email:jobs 0 10

# Get queue stats
ZCARD bull:email:active
ZCARD bull:email:waiting
ZCARD bull:email:completed
```

## Troubleshooting

### Emails not queuing

```
❌ "Cannot connect to Redis"
✅ Ensure Redis is running: redis-cli ping

❌ "Cannot queue email"
✅ Check REDIS_HOST, REDIS_PORT in env

❌ "Worker not processing jobs"
✅ Ensure worker.start() called: getEmailWorker().start()
```

### Emails not sending

```
❌ "SENDGRID_API_KEY not configured"
✅ Set API key: export SENDGRID_API_KEY="SG.xxx"

❌ "Template not found"
✅ Set template IDs: SENDGRID_TEMPLATE_VERIFICATION="d-xxx"

❌ "Delivery failures"
✅ Check SendGrid dashboard for bounces/complaints
```

### Webhooks not working

```
❌ "Webhook not receiving events"
✅ Check URL registered in SendGrid
✅ Verify public IP/domain is accessible
✅ Check logs: ./logs/

❌ "Invalid signature"
✅ Verify SENDGRID_WEBHOOK_KEY matches
✅ Check webhook created with same key
```

## File Structure

```
src/
├── infrastructure/
│   ├── queue/
│   │   ├── queue.ts                 # Queue management
│   │   ├── email.queue.ts           # Job definitions
│   │   ├── email.worker.ts          # Worker process
│   │   └── index.ts                 # Exports
│   └── email/
│       ├── clients/
│       │   ├── sendgrid.client.ts   # SendGrid API
│       │   └── index.ts
│       ├── templates/
│       │   ├── template-config.ts   # Template config
│       │   └── index.ts
│       ├── email-queue.manager.ts   # Queue API
│       ├── email.service.ts         # Legacy (deprecated)
│       ├── templates.ts             # Legacy (deprecated)
│       └── index.ts
├── modules/
│   ├── webhooks/
│   │   ├── sendgrid-webhook.service.ts  # Webhook handler
│   │   ├── webhook.controller.ts        # Webhook controller
│   │   ├── routes.ts                    # Webhook routes
│   │   └── index.ts
│   └── auth/
│       └── services/
│           └── auth.service.ts      # Updated to use queues
└── config/
    └── index.ts                     # SendGrid config vars
```

## Next Steps

- [ ] Set up SendGrid account
- [ ] Create email templates
- [ ] Set SENDGRID_API_KEY
- [ ] Configure DNS records
- [ ] Register webhook URL
- [ ] Start email worker
- [ ] Monitor queue health
- [ ] Test bounce handling
- [ ] Monitor delivery rates

## Documentation

- [ADVANCED_EMAIL_ARCHITECTURE.md](./ADVANCED_EMAIL_ARCHITECTURE.md) - Complete architecture guide
- [SendGrid Docs](https://docs.sendgrid.com/) - Official API documentation
- [BullMQ Docs](https://docs.bullmq.io/) - Queue documentation
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Legacy SMTP setup (deprecated)
