-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isEmailInvalid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnsubscribed" BOOLEAN NOT NULL DEFAULT false;
