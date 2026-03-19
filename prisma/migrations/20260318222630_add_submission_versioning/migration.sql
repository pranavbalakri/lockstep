-- DropIndex
DROP INDEX "Submission_gigId_key";

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
