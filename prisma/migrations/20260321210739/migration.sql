/*
  Warnings:

  - A unique constraint covering the columns `[paymentSessionId]` on the table `Request` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "clientWallet" TEXT,
ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'custodial';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "depositRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expectedEthAmount" TEXT,
ADD COLUMN     "moonpayTransactionId" TEXT,
ADD COLUMN     "paymentFailureReason" TEXT,
ADD COLUMN     "paymentSessionId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentTxHash" TEXT,
ADD COLUMN     "receivedEthAmount" TEXT,
ADD COLUMN     "slippagePercent" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Request_paymentSessionId_key" ON "Request"("paymentSessionId");
