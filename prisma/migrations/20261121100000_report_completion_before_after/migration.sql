-- CivicSense: bukti penyelesaian wajib berupa pasangan foto Before dan After.
-- Migrasi ini hanya menambahkan tabel dan indeks; tidak mengubah/menghapus data lama.
CREATE TABLE "ReportCompletionEvidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "beforeImageUrl" VARCHAR(500) NOT NULL,
    "beforePublicId" VARCHAR(255) NOT NULL,
    "beforeMimeType" VARCHAR(50) NOT NULL,
    "beforeSizeBytes" INTEGER NOT NULL,
    "afterImageUrl" VARCHAR(500) NOT NULL,
    "afterPublicId" VARCHAR(255) NOT NULL,
    "afterMimeType" VARCHAR(50) NOT NULL,
    "afterSizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCompletionEvidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReportCompletionEvidence_distinct_photos_check" CHECK ("beforePublicId" <> "afterPublicId")
);

CREATE UNIQUE INDEX "ReportCompletionEvidence_reportId_key"
    ON "ReportCompletionEvidence"("reportId");
CREATE UNIQUE INDEX "ReportCompletionEvidence_beforePublicId_key"
    ON "ReportCompletionEvidence"("beforePublicId");
CREATE UNIQUE INDEX "ReportCompletionEvidence_afterPublicId_key"
    ON "ReportCompletionEvidence"("afterPublicId");
CREATE INDEX "ReportCompletionEvidence_uploadedById_createdAt_idx"
    ON "ReportCompletionEvidence"("uploadedById", "createdAt");

ALTER TABLE "ReportCompletionEvidence"
    ADD CONSTRAINT "ReportCompletionEvidence_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportCompletionEvidence"
    ADD CONSTRAINT "ReportCompletionEvidence_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
