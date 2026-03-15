-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "education" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "professionalTitle" TEXT,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "skills" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "workExperience" TEXT NOT NULL DEFAULT '[]';
