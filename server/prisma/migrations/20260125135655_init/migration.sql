-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL PRIMARY KEY,
    "part_number" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "revision_level" TEXT NOT NULL,
    "core_team_members" TEXT NOT NULL,
    "process_id" TEXT,
    "customer" TEXT,
    "product" TEXT,
    "business_area" TEXT,
    "location" TEXT
);

-- CreateTable
CREATE TABLE "StructureElement" (
    "element_id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "element_title" TEXT NOT NULL,
    "description" TEXT,
    "specification" TEXT,
    "category" TEXT,
    "parent_element_id" TEXT,
    CONSTRAINT "StructureElement_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DfmeaItem" (
    "dfmea_id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "structure_element_id" TEXT NOT NULL,
    "item_function" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "failure_mode" TEXT NOT NULL,
    "effect_of_failure" TEXT NOT NULL,
    "severity_score" INTEGER NOT NULL,
    "classification" TEXT,
    "potential_cause" TEXT NOT NULL,
    "occurrence_score" INTEGER NOT NULL,
    "design_control_prevention" TEXT NOT NULL,
    "design_control_detection" TEXT NOT NULL,
    "detection_score" INTEGER NOT NULL,
    "rpn" INTEGER NOT NULL,
    "linked_parent_failure_id" TEXT,
    "linked_child_failure_id" TEXT,
    "failure_mode_id" TEXT,
    CONSTRAINT "DfmeaItem_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DfmeaItem_structure_element_id_fkey" FOREIGN KEY ("structure_element_id") REFERENCES "StructureElement" ("element_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PfmeaItem" (
    "pfmea_id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "linked_dfmea_id" TEXT,
    "process_step_number" INTEGER NOT NULL,
    "process_function" TEXT NOT NULL,
    "process_requirement" TEXT NOT NULL,
    "process_specifications" TEXT,
    "failure_mode" TEXT NOT NULL,
    "failure_cause" TEXT NOT NULL,
    "prevention_control" TEXT NOT NULL,
    "detection_control" TEXT NOT NULL,
    "occurrence_score" INTEGER NOT NULL,
    "detection_score" INTEGER NOT NULL,
    CONSTRAINT "PfmeaItem_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PfmeaItem_linked_dfmea_id_fkey" FOREIGN KEY ("linked_dfmea_id") REFERENCES "DfmeaItem" ("dfmea_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ControlPlanItem" (
    "cp_id" TEXT NOT NULL PRIMARY KEY,
    "pfmea_link_id" TEXT NOT NULL,
    "part_process_number" TEXT,
    "product_characteristic" TEXT,
    "process_characteristic" TEXT,
    "special_char_class" TEXT,
    "specification_tolerance" TEXT,
    "evaluation_technique" TEXT,
    "sample_size" TEXT,
    "sample_freq" TEXT,
    "control_method" TEXT,
    "reaction_plan" TEXT,
    CONSTRAINT "ControlPlanItem_pfmea_link_id_fkey" FOREIGN KEY ("pfmea_link_id") REFERENCES "PfmeaItem" ("pfmea_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkInstruction" (
    "wi_id" TEXT NOT NULL PRIMARY KEY,
    "linked_cp_id" TEXT,
    "doc_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "model_variant" TEXT NOT NULL,
    "steps" TEXT NOT NULL
);
