
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- Mock Data (Embedded to avoid relative import issues) ---
const MOCK_PROJECTS = [
    {
        project_id: "PROJ-001",
        part_number: "ASM-2024-X",
        part_name: "High Pressure Fuel Pump Housing",
        revision_level: "B",
        core_team_members: ["Alice Eng", "Bob Mfg", "Charlie Quality"],
        process_id: "PROC-8821",
        customer: "OEM-A",
        product: "Fuel Pump",
        business_area: "Automotive - Powertrain",
        location: "Stuttgart (DE)"
    },
    {
        project_id: "PROJ-002",
        part_number: "EL-500-Z",
        part_name: "Electric Motor Stator",
        revision_level: "A",
        core_team_members: ["Dave Design", "Eve Proc"],
        process_id: "PROC-9912",
        customer: "OEM-B",
        product: "E-Motor",
        business_area: "Automotive - Electronics",
        location: "Shanghai (CN)"
    },
    {
        project_id: "PROJ-003",
        part_number: "SK-2024-SYS",
        part_name: "Front Steering Knuckle Assembly",
        revision_level: "C",
        core_team_members: ["Sarah Chassis", "Mike Mfg", "Tom Quality"],
        business_area: "Automotive - Chassis",
        location: "Detroit, MI (USA)"
    },
    {
        project_id: "PROJ-004",
        part_number: "SK-GEN2-001",
        part_name: "Steering Knuckle Gen 2 (Test)",
        revision_level: "A",
        core_team_members: ["Test Engineer", "QA Lead", "Design Lead"],
        process_id: "NPI-004",
        customer: "OEM-C",
        product: "Knuckle",
        business_area: "Automotive - Chassis",
        location: "Puebla (MX)"
    }
];

const MOCK_STRUCTURE_ELEMENTS = [
    {
        element_id: "STR-001",
        project_id: "PROJ-001",
        element_title: "Main Housing Body",
        description: "The primary cast aluminum shell.",
        specification: "AlSi9Cu3(Fe), Die Cast"
    },
    {
        element_id: "STR-002",
        project_id: "PROJ-001",
        element_title: "Mounting Flange",
        description: "Interface surface for engine block.",
        specification: "Flatness 0.05mm, Ra 3.2"
    },
    {
        element_id: "STR-003",
        project_id: "PROJ-003",
        element_title: "Steering Knuckle Casting",
        description: "Main structural node connecting suspension and steering.",
        specification: "Ductile Iron GJS-400",
        category: "Component"
    },
    {
        element_id: "STR-004",
        project_id: "PROJ-003",
        element_title: "Wheel Bearing Interface",
        description: "Precision bore where the wheel bearing is pressed in.",
        specification: "Dia 75mm H7",
        category: "Sub-system",
        parent_element_id: "STR-003"
    },
    {
        element_id: "STR-010",
        project_id: "PROJ-004",
        element_title: "Steering Knuckle Body",
        description: "Forged steel main body connecting suspension components.",
        specification: "Forged Steel 42CrMo4",
        category: "Component"
    },
    {
        element_id: "STR-011",
        project_id: "PROJ-004",
        element_title: "Ball Joint Bosses",
        description: "Attachment points for control arms.",
        specification: "Taper 1:8, Surface Hardness 50 HRC",
        category: "Sub-system",
        parent_element_id: "STR-010"
    },
    {
        element_id: "STR-012",
        project_id: "PROJ-004",
        element_title: "Wheel Bearing Bore",
        description: "Interface for wheel bearing unit.",
        specification: "Dia 80mm H7, Cylindricity 0.01",
        category: "Sub-system",
        parent_element_id: "STR-010"
    }
];

const MOCK_DFMEA = [
    {
        dfmea_id: "DF-001",
        project_id: "PROJ-001",
        structure_element_id: "STR-001",
        item_function: "Contain fuel at high pressure",
        requirement: "Withstand 250 bar pressure without leakage",
        failure_mode: "Housing cracks under pressure",
        effect_of_failure: "Fuel leak, potential fire hazard",
        severity_score: 10,
        classification: "CC",
        potential_cause: "Wall thickness insufficient at stress concentrations",
        occurrence_score: 3,
        design_control_prevention: "FEA Simulation",
        design_control_detection: "Burst testing validation",
        detection_score: 3,
        rpn: 90
    },
    {
        dfmea_id: "DF-002",
        project_id: "PROJ-001",
        structure_element_id: "STR-002",
        item_function: "Mount to engine block",
        requirement: "Flatness 0.05mm on mounting face",
        failure_mode: "Mounting face warped",
        effect_of_failure: "Improper seal, oil leak",
        severity_score: 7,
        classification: "SC",
        potential_cause: "Thermal distortion design",
        occurrence_score: 4,
        design_control_prevention: "Material selection",
        design_control_detection: "Prototype measurement",
        detection_score: 4,
        rpn: 112
    },
    {
        dfmea_id: "DF-003",
        project_id: "PROJ-003",
        structure_element_id: "STR-003",
        item_function: "Transfer steering torque to wheel",
        requirement: "Withstand 5kN cornering force without yielding",
        failure_mode: "Steering arm fracture",
        effect_of_failure: "Loss of steering control, accident",
        severity_score: 10,
        classification: "CC",
        potential_cause: "Fillet radius undersized causing stress concentration",
        occurrence_score: 2,
        design_control_prevention: "Topology Optimization",
        design_control_detection: "Fatigue bench test",
        detection_score: 3,
        rpn: 60
    },
    {
        dfmea_id: "DF-004",
        project_id: "PROJ-003",
        structure_element_id: "STR-004",
        item_function: "Retain wheel bearing",
        requirement: "Interference fit press force > 10kN",
        failure_mode: "Bearing loose in bore",
        effect_of_failure: "Wheel vibration, noise, eventual hub separation",
        severity_score: 8,
        classification: "SC",
        potential_cause: "Bore diameter tolerance too loose in design",
        occurrence_score: 3,
        design_control_prevention: "Tolerance stack-up analysis",
        design_control_detection: "Press-out force test",
        detection_score: 4,
        rpn: 96
    },
    {
        dfmea_id: "DF-010",
        project_id: "PROJ-004",
        structure_element_id: "STR-010",
        item_function: "Resist suspension loads",
        requirement: "No plastic deformation at 30kN bump load",
        failure_mode: "Knuckle arm deformation",
        effect_of_failure: "Loss of wheel alignment, tire wear, poor handling",
        severity_score: 8,
        classification: "SC",
        potential_cause: "Cross-section area insufficient",
        occurrence_score: 2,
        design_control_prevention: "Structural Optimization",
        design_control_detection: "Static load test",
        detection_score: 3,
        rpn: 48
    },
    {
        dfmea_id: "DF-011",
        project_id: "PROJ-004",
        structure_element_id: "STR-011",
        item_function: "Connect control arms",
        requirement: "Taper fit contact > 90%",
        failure_mode: "Ball joint stud loosens",
        effect_of_failure: "Clunking noise, potential joint separation",
        severity_score: 10,
        classification: "CC",
        potential_cause: "Taper angle mismatch in design",
        occurrence_score: 2,
        design_control_prevention: "GD&T Stack-up",
        design_control_detection: "Contact pattern check (blueing)",
        detection_score: 4,
        rpn: 80
    },
    {
        dfmea_id: "DF-012",
        project_id: "PROJ-004",
        structure_element_id: "STR-012",
        item_function: "Support wheel bearing",
        requirement: "Press fit interference 0.02-0.05mm",
        failure_mode: "Bearing migration",
        effect_of_failure: "ABS sensor fault, noise",
        severity_score: 7,
        classification: "SC",
        potential_cause: "Thermal expansion mismatch calculation error",
        occurrence_score: 3,
        design_control_prevention: "Thermal expansion analysis",
        design_control_detection: "Environmental chamber test",
        detection_score: 3,
        rpn: 63
    }
];

const MOCK_PFMEA = [
    {
        pfmea_id: "PF-001",
        project_id: "PROJ-001",
        linked_dfmea_id: "DF-001",
        process_step_number: 20,
        process_function: "Casting Operation",
        process_requirement: "No porosity in critical wall areas",
        failure_mode: "Porosity in housing wall",
        failure_cause: "Mold temp too low",
        prevention_control: "Automated mold temp controller",
        detection_control: "X-Ray Inspection",
        occurrence_score: 3,
        detection_score: 2
    },
    {
        pfmea_id: "PF-002",
        project_id: "PROJ-001",
        linked_dfmea_id: "DF-002",
        process_step_number: 40,
        process_function: "CNC Machining - Face Milling",
        process_requirement: "Maintain flatness 0.05mm",
        failure_mode: "Face not flat",
        failure_cause: "Debris in fixture clamping",
        prevention_control: "Fixture flush system",
        detection_control: "In-line probing",
        occurrence_score: 4,
        detection_score: 3
    },
    {
        pfmea_id: "PF-003",
        project_id: "PROJ-003",
        linked_dfmea_id: "DF-003",
        process_step_number: 30,
        process_function: "Casting / Pouring",
        process_requirement: "Fill steering arm mold cavity completely",
        failure_mode: "Cold shut / Incomplete fill",
        failure_cause: "Pouring temperature too low",
        prevention_control: "Auto-ladle with temp feedback",
        detection_control: "Visual Inspection",
        occurrence_score: 3,
        detection_score: 4
    },
    {
        pfmea_id: "PF-004",
        project_id: "PROJ-003",
        linked_dfmea_id: "DF-004",
        process_step_number: 60,
        process_function: "CNC Boring Operation",
        process_requirement: "Bore Diameter 75.00 - 75.03mm",
        failure_mode: "Bore Oversize",
        failure_cause: "Tool wear offset incorrect",
        prevention_control: "Tool life management macro",
        detection_control: "Post-process air gauge",
        occurrence_score: 4,
        detection_score: 2
    },
    {
        pfmea_id: "PF-010",
        project_id: "PROJ-004",
        linked_dfmea_id: "DF-010",
        process_step_number: 10,
        process_function: "Forging",
        process_requirement: "Grain flow alignment",
        failure_mode: "Grain flow rupture",
        failure_cause: "Billet temperature too low",
        prevention_control: "Induction heater monitoring",
        detection_control: "Magnetic Particle Inspection",
        occurrence_score: 3,
        detection_score: 3
    },
    {
        pfmea_id: "PF-011",
        project_id: "PROJ-004",
        linked_dfmea_id: "DF-011",
        process_step_number: 30,
        process_function: "Taper Reaming",
        process_requirement: "Taper Angle 7.125 deg",
        failure_mode: "Chatter marks on taper",
        failure_cause: "Reamer dull or speed too high",
        prevention_control: "Tool usage counter",
        detection_control: "Visual check / Taper gauge",
        occurrence_score: 4,
        detection_score: 3
    },
    {
        pfmea_id: "PF-012",
        project_id: "PROJ-004",
        linked_dfmea_id: "DF-012",
        process_step_number: 40,
        process_function: "Finish Boring",
        process_requirement: "Bore Dia 80.00-80.02mm",
        failure_mode: "Bore undersize",
        failure_cause: "Tool wear compensation failure",
        prevention_control: "In-process probing",
        detection_control: "Bore gauge 100%",
        occurrence_score: 2,
        detection_score: 2
    }
];

const MOCK_CONTROL_PLAN = [
    {
        cp_id: "CP-001",
        pfmea_link_id: "PF-001",
        part_process_number: "20",
        product_characteristic: "Housing Wall Porosity",
        process_characteristic: "Mold Temperature",
        special_char_class: "CC",
        specification_tolerance: "Max pore size 0.5mm",
        evaluation_technique: "X-Ray Inspection",
        sample_size: "100%",
        sample_freq: "Continuous",
        control_method: "Automated Reject System",
        reaction_plan: "Quarantine product, alarm maintenance"
    },
    {
        cp_id: "CP-002",
        pfmea_link_id: "PF-002",
        part_process_number: "40",
        product_characteristic: "Mounting Face Flatness",
        process_characteristic: "Fixture Clamping Pressure",
        special_char_class: "SC",
        specification_tolerance: "Flatness < 0.05mm",
        evaluation_technique: "In-line Probe",
        sample_size: "1 pc",
        sample_freq: "Every 10 parts",
        control_method: "SPC X-Bar Chart",
        reaction_plan: "Stop process, adjust fixture"
    },
    {
        cp_id: "CP-003",
        pfmea_link_id: "PF-004",
        part_process_number: "60",
        product_characteristic: "Bore Diameter",
        process_characteristic: "Cutting Tool Offset",
        special_char_class: "SC",
        specification_tolerance: "75.00 - 75.03mm",
        evaluation_technique: "Air Gauge",
        sample_size: "100%",
        sample_freq: "Continuous",
        control_method: "Auto-compensation logic",
        reaction_plan: "Stop if 3 consecutive parts trend out"
    }
];

const MOCK_WORK_INSTRUCTIONS = [
    {
        wi_id: "WI-001",
        linked_cp_id: "CP-002", // Linked to Mounting Face Flatness for demo
        doc_id: "EWI-001",
        title: "Front Door Panel Installation",
        model_variant: "Model X",
        steps: [
            {
                step_number: 1,
                title: "PREPARATION & ALIGNMENT",
                image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Tesla_Model_S_door_handles.jpg/640px-Tesla_Model_S_door_handles.jpg",
                overlays: [
                    { id: 'ov1', type: 'box', x: 20, y: 30, width: 60, height: 40, text: 'Inspect Area', color: '#3b82f6' },
                    { id: 'ov2', type: 'arrow', x: 10, y: 10, x2: 25, y2: 30, color: '#ef4444' }
                ],
                sub_steps: [
                    "1.1 Inspect panel clips.",
                    "1.2 Align panel clips with frame holes."
                ]
            },
            {
                step_number: 2,
                title: "WIRING HARNESS CONNECTION",
                image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/OBD-II-Stecker-Belegung.jpg/640px-OBD-II-Stecker-Belegung.jpg",
                overlays: [
                    { id: 'ov3', type: 'circle', x: 35, y: 25, width: 30, height: 50, color: '#eab308' },
                    { id: 'ov4', type: 'label', x: 80, y: 20, text: 'Pin Check', color: '#10b981' }
                ],
                sub_steps: [
                    "2.1 Connect main wiring harness until it clicks.",
                    "2.2 Secure harness in clip."
                ],
                warning_alert: {
                    type: "warning",
                    message: "Ensure secure connection."
                }
            },
            {
                step_number: 3,
                title: "FASTENING & TORQUE",
                image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Cordless_Impact_Driver.jpg/640px-Cordless_Impact_Driver.jpg",
                sub_steps: [
                    "3.1 Apply 3 fasteners to designated locations.",
                    "3.2 Torque all fasteners to 5 Nm."
                ],
                tool_specs: [
                    { value: 5, unit: "Nm", tool_type: "Torque Wrench" }
                ]
            }
        ]
    }
];

async function main() {
    console.time('Seeding');

    // 1. Projects
    for (const project of MOCK_PROJECTS) {
        await prisma.project.create({
            data: {
                ...project,
                core_team_members: JSON.stringify(project.core_team_members)
            }
        });
    }

    // 2. Structure Elements
    for (const el of MOCK_STRUCTURE_ELEMENTS) {
        await prisma.structureElement.create({
            data: el
        });
    }

    // 3. DFMEA Items
    for (const item of MOCK_DFMEA) {
        await prisma.dfmeaItem.create({
            data: item
        });
    }

    // 4. PFMEA Items
    for (const item of MOCK_PFMEA) {
        await prisma.pfmeaItem.create({
            data: {
                ...item,
                process_specifications: JSON.stringify([]) // Default empty array
            }
        });
    }

    // 5. Control Plan Items
    for (const item of MOCK_CONTROL_PLAN) {
        await prisma.controlPlanItem.create({
            data: item
        });
    }

    // 6. Work Instructions
    for (const wi of MOCK_WORK_INSTRUCTIONS) {
        await prisma.workInstruction.create({
            data: {
                wi_id: wi.wi_id,
                linked_cp_id: wi.linked_cp_id,
                doc_id: wi.doc_id,
                title: wi.title,
                model_variant: wi.model_variant,
                steps: JSON.stringify(wi.steps)
            }
        });
    }

    console.timeEnd('Seeding');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
