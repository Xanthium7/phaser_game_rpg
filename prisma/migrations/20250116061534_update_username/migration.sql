/*
  Warnings:

  - You are about to drop the column `user_email` on the `History` table. All the data in the column will be lost.
  - Added the required column `username` to the `History` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "History" DROP COLUMN "user_email",
ADD COLUMN     "username" TEXT NOT NULL;
