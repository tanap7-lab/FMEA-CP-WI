-- CreateTable
CREATE TABLE "Diagram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    CONSTRAINT "Diagram_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagramBox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diagram_id" TEXT NOT NULL,
    "structure_element_id" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    CONSTRAINT "DiagramBox_diagram_id_fkey" FOREIGN KEY ("diagram_id") REFERENCES "Diagram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagramBox_structure_element_id_fkey" FOREIGN KEY ("structure_element_id") REFERENCES "StructureElement" ("element_id") ON DELETE CASCADE ON UPDATE CASCADE
);
