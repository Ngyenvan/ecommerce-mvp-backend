-- AlterEnum
ALTER TYPE "OutboxStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "locked_at" TIMESTAMPTZ(3);
