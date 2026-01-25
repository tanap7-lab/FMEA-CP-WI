
export type ViewMode = 'DASHBOARD' | 'DFMEA' | 'PFMEA' | 'CONTROL_PLAN' | 'WORK_INSTRUCTIONS' | 'TRACEABILITY' | 'PROJECT_SETTINGS' | 'ADMIN';

export interface ProjectMaster {
  project_id: string;
  part_number: string;
  part_name: string;
  revision_level: string;
  core_team_members: string[];
  process_id?: string;
  customer?: string;
  product?: string;
  business_area?: string;
  location?: string;
}

export interface StructureElement {
  element_id: string;
  project_id: string;
  element_title: string;
  description?: string;
  specification?: string;
  category?: 'Component' | 'Sub-system' | 'Assembly';
  parent_element_id?: string | null;
}

export interface DfmeaItem {
  dfmea_id: string;
  project_id: string;
  structure_element_id: string;
  item_function: string;
  requirement: string;
  failure_mode: string;
  effect_of_failure: string;
  severity_score: number;
  classification?: string;
  potential_cause: string;
  occurrence_score: number;
  design_control_prevention: string;
  design_control_detection: string;
  detection_score: number;
  rpn: number;
  linked_parent_failure_id?: string;
  linked_child_failure_id?: string;
  failure_mode_id?: string;
}

export interface PfmeaItem {
  pfmea_id: string;
  project_id: string;
  linked_dfmea_id: string | null;
  process_step_number: number;
  process_function: string;
  process_requirement: string;
  process_specifications?: string[];
  failure_mode: string;
  failure_cause: string;
  prevention_control: string;
  detection_control: string;
  occurrence_score: number;
  detection_score: number;
}

export interface ControlPlanItem {
  cp_id: string;
  pfmea_link_id: string;
  part_process_number?: string;
  product_characteristic?: string;
  process_characteristic?: string;
  special_char_class?: string;
  specification_tolerance?: string;
  evaluation_technique?: string;
  sample_size?: string;
  sample_freq?: string;
  control_method?: string;
  reaction_plan?: string;
}

export interface ImageOverlay {
    id: string;
    type: 'box' | 'circle' | 'arrow' | 'label';
    x: number;
    y: number;
    width?: number;
    height?: number;
    x2?: number;
    y2?: number;
    text?: string;
    color?: string;
}

export interface WorkInstructionStep {
    step_number: number;
    title: string;
    image_url?: string;
    sub_steps: string[];
    overlays?: ImageOverlay[];
    warning_alert?: { type: string; message: string; };
    tool_specs?: Array<{ tool_type: string; value: number | string; unit: string; }>;
}

export interface WorkInstruction {
    wi_id: string;
    linked_cp_id?: string;
    doc_id: string;
    title: string;
    model_variant: string;
    steps: WorkInstructionStep[];
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

export type RiskMethod = 'RPN' | 'AP';

export interface RiskSettings {
    method: RiskMethod;
    rpnThresholds: { medium: number, high: number };
    apLogic: ApRule[];
    definitions: {
        severity: Record<number, string>;
        occurrence: Record<number, string>;
        detection: Record<number, string>;
        ap: Record<string, string>;
    }
}

export interface ExplodedViewBox {
    id: string;
    structure_element_id: string;
    x: number;
    y: number;
}

export interface ProjectDiagram {
    id: string;
    projectId: string;
    title: string;
    imageUrl?: string;
    boxes: ExplodedViewBox[];
}

export type Severity = number;
export type Occurrence = number;
export type Detection = number;
