-- AlterTable
ALTER TABLE "PfmeaItem" ADD COLUMN "image_url" TEXT;

-- CreateTable
CREATE TABLE "OptimizationAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dfmea_id" TEXT NOT NULL,
    "preventive_measure" TEXT NOT NULL,
    "detection_measure" TEXT NOT NULL,
    "responsible_owner" TEXT NOT NULL,
    "due_date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "new_severity" INTEGER,
    "new_occurrence" INTEGER,
    "new_detection" INTEGER,
    "comment" TEXT,
    "history" TEXT,
    CONSTRAINT "OptimizationAction_dfmea_id_fkey" FOREIGN KEY ("dfmea_id") REFERENCES "DfmeaItem" ("dfmea_id") ON DELETE CASCADE ON UPDATE CASCADE
);
