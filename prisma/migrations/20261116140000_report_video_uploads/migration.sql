-- Tambahkan penyimpanan metadata video laporan. Tidak mengubah atau menghapus data lama.
CREATE TABLE "ReportVideo" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "videoUrl" VARCHAR(1000) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportVideo_publicId_key" ON "ReportVideo"("publicId");
CREATE INDEX "ReportVideo_reportId_idx" ON "ReportVideo"("reportId");

ALTER TABLE "ReportVideo"
ADD CONSTRAINT "ReportVideo_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
