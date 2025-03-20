/*
  Warnings:

  - You are about to drop the column `path` on the `Directory` table. All the data in the column will be lost.
  - You are about to drop the column `directoryId` on the `File` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,resourceType,fileId]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,resourceType,directoryId]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `directory` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Permission_userId_permissionType_directoryId_key";

-- DropIndex
DROP INDEX "Permission_userId_permissionType_fileId_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Directory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "Directory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Directory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Directory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Directory" ("createdAt", "createdBy", "id", "name", "parentId") SELECT "createdAt", "createdBy", "id", "name", "parentId" FROM "Directory";
DROP TABLE "Directory";
ALTER TABLE "new_Directory" RENAME TO "Directory";
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "directory" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    CONSTRAINT "File_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "File_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_File" ("approvalStatus", "approvedBy", "createdAt", "createdBy", "id", "name", "path") SELECT "approvalStatus", "approvedBy", "createdAt", "createdBy", "id", "name", "path" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
CREATE UNIQUE INDEX "File_path_key" ON "File"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_userId_resourceType_fileId_key" ON "Permission"("userId", "resourceType", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_userId_resourceType_directoryId_key" ON "Permission"("userId", "resourceType", "directoryId");
