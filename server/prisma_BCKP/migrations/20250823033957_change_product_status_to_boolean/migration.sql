/*
  Warnings:

  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "status",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;
