CREATE TABLE "Comment" (
 "id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "content" VARCHAR(1000) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReportLike" (
 "reportId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReportLike_pkey" PRIMARY KEY ("reportId", "userId")
);
CREATE TABLE "ReportBookmark" (
 "reportId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReportBookmark_pkey" PRIMARY KEY ("reportId", "userId")
);
CREATE INDEX "Comment_reportId_createdAt_idx" ON "Comment"("reportId", "createdAt");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "ReportLike_userId_idx" ON "ReportLike"("userId");
CREATE INDEX "ReportBookmark_userId_idx" ON "ReportBookmark"("userId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportLike" ADD CONSTRAINT "ReportLike_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportLike" ADD CONSTRAINT "ReportLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportBookmark" ADD CONSTRAINT "ReportBookmark_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportBookmark" ADD CONSTRAINT "ReportBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
