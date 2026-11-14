-- Profil publik tersedia untuk seluruh peran, termasuk petugas dan admin.
ALTER TABLE "User" ADD COLUMN "bio" VARCHAR(280), ADD COLUMN "location" VARCHAR(120),
  ADD COLUMN "avatarUrl" VARCHAR(500), ADD COLUMN "avatarPublicId" VARCHAR(255);
CREATE UNIQUE INDEX "User_avatarPublicId_key" ON "User"("avatarPublicId");

-- Dislike tidak menghapus/mereset data like yang sudah ada.
CREATE TABLE "ReportDislike" (
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportDislike_pkey" PRIMARY KEY ("reportId", "userId")
);
CREATE INDEX "ReportDislike_userId_idx" ON "ReportDislike"("userId");
ALTER TABLE "ReportDislike" ADD CONSTRAINT "ReportDislike_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportDislike" ADD CONSTRAINT "ReportDislike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
