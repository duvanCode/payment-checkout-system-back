/*
  Warnings:

  - Added the required column `productName` to the `transaction_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN     "productName" TEXT NOT NULL;
