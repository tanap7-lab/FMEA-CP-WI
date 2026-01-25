
// Type definitions matching the Quality Management Database Schema

export interface ProjectMaster {
  project_id: string; // PK
  part_number: string;
  part_name: string;
  revision_level: string;
  core_team_members: string[];
  // New Fields
  process_id?: string;
  customer?: string;
  product?: string;
  business_area?: string;
  location?: string;
}

export interface StructureElement {
  element_id: string; // PK
  project_id: string; // FK
  element_title: string;
  description: string;
  specification: string;
  parent_element_id?: string | null; // For future hierarchy
  category?: 'Component' | 'Sub-system' | 'Assembly'; // Added category
}

export interface DfmeaItem {
  dfmea_id: string; // PK
  project_id: string; // FK
  structure_element_id: string | null; // FK -> StructureElement
  
  // 1 Function : N Failure Modes
  item_function: string; 
  
  // Failure Chain Links
  failure_mode: string;
  failure_mode_id?: string; // UUID to identify this node in the failure net

  // Link to Higher Level (Effect)
  effect_of_failure: string; // Text description
  linked_parent_failure_id?: string | null; // ID of the failure mode in the Parent Element

  // Link to Lower Level (Cause)
  potential_cause: string; // Text description
  linked_child_failure_id?: string | null; // ID of the failure mode in a Child Element

  requirement: string;
  
  severity_score: number; // 1-10
  classification: string;
  
  occurrence_score: number; // 1-10
  design_control_prevention: string;
  design_control_detection: string;
  detection_score: number; // 1-10
  rpn: number; // Calculated
}

export interface PfmeaItem {
  pfmea_id: string; // PK
  project_id: string; // FK
  linked_dfmea_id: string | null; // FK (Golden Thread)
  process_step_number: number;
  process_function: string;
  process_requirement: string;
  failure_mode: string;
  failure_cause: string;
  prevention_control: string;
  detection_control: string;
  occurrence_score: number; // 1-10
  detection_score: number; // 1-10
}

export interface ControlPlanItem {
  cp_id: string; // PK
  pfmea_link_id: string; // FK
  part_process_number: string;
  product_characteristic: string;
  process_characteristic: string;
  special_char_class: string;
  specification_tolerance: string;
  evaluation_technique: string;
  sample_size: string;
  sample_freq: string;
  control_method: string;
  reaction_plan: string;
}

// --- Digital Work Instruction Types ---

export interface ImageOverlay {
  id: string;
  type: 'arrow' | 'box' | 'circle' | 'label';
  x: number; // Percentage X position (0-100)
  y: number; // Percentage Y position (0-100)
  width?: number; // Percentage width (for box/circle)
  height?: number; // Percentage height (for box/circle)
  x2?: number; // Percentage X end position (for arrow)
  y2?: number; // Percentage Y end position (for arrow)
  text?: string; // Text content (for label)
  color?: string; // Hex code or tailwind color class prefix
}

export interface WorkInstructionStep {
  step_number: number;
  title: string;
  image_url: string; // URL for the visual aid
  overlays?: ImageOverlay[]; // New: Visual overlays for the image
  sub_steps: string[]; // e.g., ["1.1 Inspect...", "1.2 Align..."]
  warning_alert?: {
    message: string;
    type: 'critical' | 'warning' | 'info'; // Determines icon/color
  };
  tool_specs?: {
    value: number;
    unit: string;
    tool_type: string;
  }[];
}

export interface WorkInstruction {
  wi_id: string; // PK
  linked_cp_id: string; // FK to ControlPlanItem
  doc_id: string; // e.g., "EWI-001"
  title: string; // e.g., "Front Door Panel Installation"
  model_variant: string; // e.g., "Model X"
  steps: WorkInstructionStep[];
}

// Diagram Types
export interface ExplodedViewBox {
  id: string;
  structure_element_id: string;
  x: number; // Percentage X position (0-100)
  y: number; // Percentage Y position (0-100)
}

export interface ProjectDiagram {
  imageUrl: string | null;
  boxes: ExplodedViewBox[];
}

// Helper types for App State
export type ViewMode = 'DASHBOARD' | 'DFMEA' | 'PFMEA' | 'CONTROL_PLAN' | 'WORK_INSTRUCTIONS' | 'TRACEABILITY' | 'PROJECT_SETTINGS' | 'ADMIN';
export type RiskMethod = 'RPN' | 'AP';

export interface RiskDefinitions {
  severity: Record<number, string>;
  occurrence: Record<number, string>;
  detection: Record<number, string>;
  ap: {
      H: string;
      M: string;
      L: string;
  };
}

export interface ApRule {
    id: string;
    sMin: number;
    sMax: number;
    oMin: number;
    oMax: number;
    dMin: number;
    dMax: number;
    result: 'H' | 'M' | 'L';
}

export interface RiskSettings {
  method: RiskMethod;
  rpnThresholds: { medium: number; high: number };
  definitions: RiskDefinitions;
  apLogic: ApRule[];
}

export interface AppState {
  projects: ProjectMaster[];
  structureElements: StructureElement[];
  dfmeaItems: DfmeaItem[];
  pfmeaItems: PfmeaItem[];
  controlPlanItems: ControlPlanItem[];
  projectDiagrams: Record<string, ProjectDiagram>; // Keyed by project_id
  
  // DWI Data
  workInstructions: WorkInstruction[];

  selectedProjectId: string | null;
  currentView: ViewMode;
  riskSettings: RiskSettings;
  
  // Admin Managed Lists
  businessAreas: string[];
  locations: string[];
  
  // Relationship Map
  businessAreaLocationMap: Record<string, string[]>;
}

export type Severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Occurrence = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Detection = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
