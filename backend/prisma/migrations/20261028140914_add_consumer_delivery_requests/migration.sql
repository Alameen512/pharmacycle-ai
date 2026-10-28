-- CreateEnum
CREATE TYPE "DeliveryRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'DELIVERY_REQUEST';

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "alertDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailDelivery" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DeliveryRequest" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "status" "DeliveryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryRequest_pharmacyId_status_createdAt_idx" ON "DeliveryRequest"("pharmacyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryRequest_inventoryItemId_idx" ON "DeliveryRequest"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
