-- AlterEnum
ALTER TYPE "Currency" ADD VALUE 'EUR';

-- AlterTable
ALTER TABLE "quotes" ALTER COLUMN "currency" SET DEFAULT 'AZN';

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

-- CreateIndex
CREATE INDEX "quote_items_itemId_idx" ON "quote_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_items_quoteId_itemId_key" ON "quote_items"("quoteId", "itemId");

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "purchase_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
