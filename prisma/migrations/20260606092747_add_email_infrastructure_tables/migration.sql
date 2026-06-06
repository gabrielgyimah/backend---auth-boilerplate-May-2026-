-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('VERIFICATION', 'EMAIL_VERIFIED', 'LOGIN_OTP', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'TWO_FACTOR_ENABLED', 'LOGIN_NOTIFICATION', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SUSPICIOUS_ACTIVITY');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "messageId" TEXT,
    "eventType" "EmailEventType" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "bounceType" TEXT,
    "complained" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailBounce" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bounceType" TEXT NOT NULL,
    "bounceSubtype" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailBounce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailComplaint" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "complaintType" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_uuid_key" ON "EmailLog"("uuid");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_eventType_idx" ON "EmailLog"("eventType");

-- CreateIndex
CREATE INDEX "EmailLog_messageId_idx" ON "EmailLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailBounce_uuid_key" ON "EmailBounce"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "EmailBounce_email_key" ON "EmailBounce"("email");

-- CreateIndex
CREATE INDEX "EmailBounce_email_idx" ON "EmailBounce"("email");

-- CreateIndex
CREATE INDEX "EmailBounce_bounceType_idx" ON "EmailBounce"("bounceType");

-- CreateIndex
CREATE INDEX "EmailBounce_occurredAt_idx" ON "EmailBounce"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailComplaint_uuid_key" ON "EmailComplaint"("uuid");

-- CreateIndex
CREATE INDEX "EmailComplaint_email_idx" ON "EmailComplaint"("email");

-- CreateIndex
CREATE INDEX "EmailComplaint_occurredAt_idx" ON "EmailComplaint"("occurredAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
