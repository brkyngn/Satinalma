-- CreateEnum
CREATE TYPE "ReferenceKind" AS ENUM ('link', 'file');

-- CreateTable
CREATE TABLE "request_references" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "ReferenceKind" NOT NULL,
    "url" TEXT,
    "label" TEXT,
    "fileData" BYTEA,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_references_requestId_idx" ON "request_references"("requestId");

-- AddForeignKey
ALTER TABLE "request_references" ADD CONSTRAINT "request_references_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
