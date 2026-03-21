-- AlterTable: make password optional and add privyId
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "privyId" TEXT;
CREATE UNIQUE INDEX "User_privyId_key" ON "User"("privyId");
