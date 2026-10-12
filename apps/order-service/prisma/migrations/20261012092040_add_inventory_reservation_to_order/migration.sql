/*
  Warnings:

  - Added the required column `inventory_reservation_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "inventory_reservation_id" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE INDEX "orders_inventory_reservation_id_idx" ON "orders"("inventory_reservation_id");
