
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectSettings } from './components/ProjectSettings';
import { AdminSettings } from './components/AdminSettings';
import { FmeaTable, RpnBadge, ApBadge } from './components/FmeaTable';
import { ProcessFlowVisualizer } from './components/ProcessFlowVisualizer';
import { StructureVisualizer } from './components/StructureVisualizer';
import { ExplodedView } from './components/ExplodedView';
import { TraceabilityMatrix } from './components/TraceabilityMatrix';
import { DigitalWorkInstruction } from './components/DigitalWorkInstruction';
import { WorkInstructionEditor } from './components/WorkInstructionEditor';
import { OptimizationActionModal } from './components/OptimizationActionModal';
import { SpecialCharacteristics } from './components/SpecialCharacteristics';

import {
    ProjectMaster, DfmeaItem, PfmeaItem, ControlPlanItem, StructureElement,
    RiskSettings, WorkInstruction, ViewMode, ProjectDiagram, ExplodedViewBox,
    OptimizationAction
} from './types';
import { api } from './api';
import {
    MOCK_PROJECTS, MOCK_DFMEA, MOCK_PFMEA, MOCK_CONTROL_PLAN,
    MOCK_STRUCTURE_ELEMENTS, MOCK_WORK_INSTRUCTIONS, DEFAULT_RISK_SETTINGS,
    MOCK_BUSINESS_AREAS, MOCK_LOCATIONS, MOCK_BUSINESS_AREA_LOCATION_MAP
} from './constants';
import { GoogleGenAI, Type } from "@google/genai";

interface AppState {
    currentView: ViewMode;
    selectedProjectId: string | null;
    projects: ProjectMaster[];
    structureElements: StructureElement[];
    dfmeaItems: DfmeaItem[];
    pfmeaItems: PfmeaItem[];
    controlPlanItems: ControlPlanItem[];
    workInstructions: WorkInstruction[];
    projectDiagrams: Record<string, ProjectDiagram[]>;
    riskSettings: RiskSettings;
    businessAreas: string[];
    locations: string[];
    businessAreaLocationMap: Record<string, string[]>;
}

const initialState: AppState = {
    currentView: 'DASHBOARD',
    selectedProjectId: null,
    projects: MOCK_PROJECTS,
    structureElements: MOCK_STRUCTURE_ELEMENTS,
    dfmeaItems: MOCK_DFMEA,
    pfmeaItems: MOCK_PFMEA,
    controlPlanItems: MOCK_CONTROL_PLAN,
    workInstructions: MOCK_WORK_INSTRUCTIONS,
    projectDiagrams: {},
    riskSettings: DEFAULT_RISK_SETTINGS,
    businessAreas: MOCK_BUSINESS_AREAS,
    locations: MOCK_LOCATIONS,
    businessAreaLocationMap: MOCK_BUSINESS_AREA_LOCATION_MAP
};

function App() {
    const [state, setState] = useState<AppState>({
        ...initialState,
        projects: [],
        structureElements: [],
        dfmeaItems: [],
        pfmeaItems: [],
        controlPlanItems: [],
        workInstructions: [],
        riskSettings: DEFAULT_RISK_SETTINGS // Keep risk settings local for now
    });

    // Fetch Initial Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [
                    projects,
                    structureElements,
                    dfmeaItems,
                    pfmeaItems,
                    controlPlanItems,
                    workInstructions,
                    allDiagrams
                ] = await Promise.all([
                    api.getProjects(),
                    api.getStructureElements(),
                    api.getDfmeaItems(),
                    api.getPfmeaItems(),
                    api.getControlPlanItems(),
                    api.getWorkInstructions(),
                    api.getDiagrams()
                ]);

                // Transform diagrams to record
                const projectDiagrams: Record<string, ProjectDiagram[]> = {};
                allDiagrams.forEach((d: any) => {
                    if (!projectDiagrams[d.project_id]) projectDiagrams[d.project_id] = [];
                    projectDiagrams[d.project_id].push({
                        id: d.id,
                        projectId: d.project_id,
                        title: d.title,
                        imageUrl: d.imageUrl,
                        boxes: d.boxes.map((b: any) => ({
                            id: b.id,
                            structure_element_id: b.structure_element_id,
                            x: b.x,
                            y: b.y
                        }))
                    });
                });

                setState(prev => ({
                    ...prev,
                    projects,
                    structureElements,
                    dfmeaItems,
                    pfmeaItems,
                    controlPlanItems,
                    workInstructions,
                    projectDiagrams
                }));
            } catch (err) {
                console.error("Failed to load initial data", err);
                alert("Failed to load data from server. Please check if the backend is running on port 3001.");
            }
        };

        loadData();
    }, []);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'STRUCTURE' | 'DFMEA' | 'PFMEA' | 'PROCESS_STEP' | 'CONTROL_PLAN' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
    const [selectedDfmeaId, setSelectedDfmeaId] = useState<string | null>(null);
    const [selectedProcessStep, setSelectedProcessStep] = useState<number | null>(null);
    const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
    const [pendingDiagramDrop, setPendingDiagramDrop] = useState<{ diagramId: string, x: number, y: number } | null>(null);

    // Work Instruction UI
    const [showWiEditor, setShowWiEditor] = useState(false);
    const [wiEditorData, setWiEditorData] = useState<WorkInstruction | null>(null);
    const [viewingWorkInstruction, setViewingWorkInstruction] = useState<WorkInstruction | null>(null);

    // Optimization Actions
    const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
    const [currentOptimizationItem, setCurrentOptimizationItem] = useState<Partial<OptimizationAction> | null>(null);
    const [activeDfmeaIdForAction, setActiveDfmeaIdForAction] = useState<string | null>(null);

    const activeProject = state.selectedProjectId ? state.projects.find(p => p.project_id === state.selectedProjectId) : null;
    const projectStructureElements = state.structureElements.filter(e => e.project_id === state.selectedProjectId);

    const projectDiagrams = state.selectedProjectId ? (state.projectDiagrams[state.selectedProjectId] || []) : [];
    const currentDiagrams = projectDiagrams;
    const activeDiagram = currentDiagrams.find(d => d.id === selectedDiagramId) || null;
    const filteredDfmea = state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId && (!selectedStructureId || i.structure_element_id === selectedStructureId));
    const projectPfmeaItems = state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId);
    const filteredPfmea = projectPfmeaItems.filter(i => (selectedProcessStep === null || i.process_step_number === selectedProcessStep));

    const projectControlPlanItems = state.controlPlanItems.filter(cp =>
        projectPfmeaItems.some(pf => pf.pfmea_id === cp.pfmea_link_id)
    );
    const filteredControlPlan = projectControlPlanItems.filter(cp => {
        const pf = projectPfmeaItems.find(p => p.pfmea_id === cp.pfmea_link_id);
        return selectedProcessStep === null || (pf && pf.process_step_number === selectedProcessStep);
    });

    const getActionPriority = (s: number, o: number, d: number): 'H' | 'M' | 'L' => {
        for (const rule of state.riskSettings.apLogic) {
            if (s >= rule.sMin && s <= rule.sMax &&
                o >= rule.oMin && o <= rule.oMax &&
                d >= rule.dMin && d <= rule.dMax) {
                return rule.result;
            }
        }
        return 'L';
    };

    const SearchBar = () => (
        <div className="relative">
            <input type="text" placeholder="Search..." className="pl-8 pr-3 py-1.5 text-sm border rounded-full bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all w-48 focus:w-64" />
            <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
    );

    const handleNavigate = (view: ViewMode) => {
        setState(prev => ({ ...prev, currentView: view }));
    };

    const handleSelectProject = (id: string) => {
        setState(prev => ({ ...prev, selectedProjectId: id, currentView: 'DFMEA' }));
    };

    const handleAddProject = async (project: ProjectMaster) => {
        try {
            const newProject = await api.createProject(project);
            setState(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
        } catch (e) {
            console.error("Failed to create project", e);
            alert("Failed to create project");
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (window.confirm("Are you sure? This will delete all project data.")) {
            try {
                await api.deleteProject(id);
                setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.project_id !== id) }));
            } catch (e) {
                console.error("Failed to delete project", e);
                alert("Failed to delete project");
            }
        }
    };

    const handleDeleteItem = async (type: 'STRUCTURE' | 'DFMEA' | 'PFMEA' | 'CONTROL_PLAN', id: string) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            if (type === 'STRUCTURE') {
                await api.deleteStructureElement(id);
                setState(prev => ({ ...prev, structureElements: prev.structureElements.filter(e => e.element_id !== id) }));
            } else if (type === 'DFMEA') {
                await api.deleteDfmeaItem(id);
                setState(prev => ({ ...prev, dfmeaItems: prev.dfmeaItems.filter(e => e.dfmea_id !== id) }));
            } else if (type === 'PFMEA') {
                await api.deletePfmeaItem(id);
                setState(prev => ({ ...prev, pfmeaItems: prev.pfmeaItems.filter(e => e.pfmea_id !== id) }));
            } else if (type === 'CONTROL_PLAN') {
                await api.deleteControlPlanItem(id);
                setState(prev => ({ ...prev, controlPlanItems: prev.controlPlanItems.filter(e => e.cp_id !== id) }));
            }
        } catch (error) {
            console.error("Failed to delete item", error);
            alert("Failed to delete item");
        }
    };

    // ... (Helper functions remain unchanged) ...

    const handleSaveWorkInstruction = async (wi: WorkInstruction) => {
        try {
            const exists = state.workInstructions.some(w => w.wi_id === wi.wi_id);
            let saved;

            if (exists) {
                saved = await api.updateWorkInstruction(wi.wi_id, wi);
            } else {
                saved = await api.createWorkInstruction(wi);
            }

            // Defensive parsing for steps if API returns stringified JSON
            if (typeof saved.steps === 'string') {
                try { saved.steps = JSON.parse(saved.steps); } catch { saved.steps = []; }
            }

            setState(prev => ({
                ...prev,
                workInstructions: exists
                    ? prev.workInstructions.map(w => w.wi_id === wi.wi_id ? saved : w)
                    : [...prev.workInstructions, saved]
            }));
        } catch (error) {
            console.error("Failed to save work instruction", error);
            alert("Failed to save work instruction");
        }
    };

    // --- Helper Functions used in renderContent ---
    const getHigherLevelFailures = (structureId: string | null) => {
        if (!structureId) return [];
        const currentElement = state.structureElements.find(e => e.element_id === structureId);
        if (!currentElement || !currentElement.parent_element_id) return [];

        // Get failures from parent element
        return state.dfmeaItems
            .filter(i => i.structure_element_id === currentElement.parent_element_id)
            .map(i => ({ value: i.failure_mode_id || i.dfmea_id, label: `${i.failure_mode} (Parent)`, text: i.failure_mode }));
    };

    const getLowerLevelFailures = (structureId: string | null) => {
        if (!structureId) return [];
        // Get children elements
        const childElements = state.structureElements.filter(e => e.parent_element_id === structureId);
        const childIds = childElements.map(e => e.element_id);

        return state.dfmeaItems
            .filter(i => childIds.includes(i.structure_element_id))
            .map(i => ({ value: i.failure_mode_id || i.dfmea_id, label: `${i.failure_mode} (Child: ${state.structureElements.find(e => e.element_id === i.structure_element_id)?.element_title})`, text: i.failure_mode }));
    };

    const getExistingFunctions = (structureId: string | null) => {
        // Suggest functions from same category
        return Array.from(new Set(state.dfmeaItems.map(d => d.item_function)));
    };

    const handleUpdateStructureElement = async (updated: StructureElement) => {
        try {
            const saved = await api.updateStructureElement(updated.element_id, updated);
            setState(prev => ({
                ...prev,
                structureElements: prev.structureElements.map(e => e.element_id === saved.element_id ? saved : e)
            }));
        } catch (error) {
            console.error("Failed to update structure element", error);
            // alert("Failed to save structure element"); // Optional
        }
    };

    // Diagram Handlers
    const handleAddDiagram = async () => {
        if (!state.selectedProjectId) return;
        const tempDiagram: ProjectDiagram = { id: `DIAG-${Date.now()}`, projectId: state.selectedProjectId, title: 'New Diagram', boxes: [] };

        try {
            const saved = await api.createDiagram({
                id: tempDiagram.id,
                project_id: state.selectedProjectId,
                title: tempDiagram.title
            });

            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: [...(prev.projectDiagrams[state.selectedProjectId!] || []), {
                        ...tempDiagram,
                        id: saved.id,
                        boxes: []
                    }]
                }
            }));
            setSelectedDiagramId(saved.id);
        } catch (e) {
            console.error("Failed to create diagram", e);
            alert("Failed to create diagram record.");
        }
    };

    const handleDeleteDiagram = async (id: string) => {
        if (!state.selectedProjectId) return;
        try {
            await api.deleteDiagram(id);
            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: (prev.projectDiagrams[state.selectedProjectId!] || []).filter(d => d.id !== id)
                }
            }));
            if (selectedDiagramId === id) setSelectedDiagramId(null);
        } catch (e) {
            console.error("Failed to delete diagram", e);
        }
    };

    const handleRenameDiagram = async (id: string, newTitle: string) => {
        if (!state.selectedProjectId) return;
        try {
            await api.updateDiagram(id, { title: newTitle });
            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: (prev.projectDiagrams[state.selectedProjectId!] || []).map(d => d.id === id ? { ...d, title: newTitle } : d)
                }
            }));
        } catch (e) {
            console.error("Failed to rename diagram", e);
        }
    };

    const handleUploadImage = async (diagramId: string, dataUrl: string) => {
        if (!state.selectedProjectId) return;
        try {
            // Check dataUrl size
            if (dataUrl.length > 5 * 1024 * 1024) { // 5MB limit check for SQLite/Lite servers
                console.warn("Large image detected");
            }

            await api.updateDiagram(diagramId, { imageUrl: dataUrl });
            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: (prev.projectDiagrams[state.selectedProjectId!] || []).map(d => d.id === diagramId ? { ...d, imageUrl: dataUrl } : d)
                }
            }));
        } catch (e) {
            console.error("Failed to upload image", e);
            alert("Failed to save image to server.");
        }
    };

    const handleAddBox = async (diagramId: string, box: ExplodedViewBox) => {
        if (!state.selectedProjectId) return;
        try {
            const savedBox = await api.createDiagramBox(diagramId, {
                id: box.id,
                structure_element_id: box.structure_element_id,
                x: box.x,
                y: box.y
            });

            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: (prev.projectDiagrams[state.selectedProjectId!] || []).map(d =>
                        d.id === diagramId ? {
                            ...d, boxes: [...d.boxes, {
                                id: savedBox.id,
                                structure_element_id: savedBox.structure_element_id,
                                x: savedBox.x,
                                y: savedBox.y
                            }]
                        } : d
                    )
                }
            }));
        } catch (e) {
            console.error("Failed to add box", e);
        }
    };

    const handleRemoveBox = async (diagramId: string, boxId: string) => {
        if (!state.selectedProjectId) return;
        try {
            await api.deleteDiagramBox(boxId);
            setState(prev => ({
                ...prev,
                projectDiagrams: {
                    ...prev.projectDiagrams,
                    [state.selectedProjectId!]: (prev.projectDiagrams[state.selectedProjectId!] || []).map(d =>
                        d.id === diagramId ? { ...d, boxes: d.boxes.filter(b => b.id !== boxId) } : d
                    )
                }
            }));
        } catch (e) {
            console.error("Failed to remove box", e);
        }
    };

    const handleBoxDropNew = (diagramId: string, x: number, y: number) => {
        setPendingDiagramDrop({ diagramId, x, y });
        setEditingItem({});
        setModalType('STRUCTURE');
        setIsModalOpen(true);
    };

    const handleAddNewStructureElement = () => {
        setPendingDiagramDrop(null);
        setEditingItem({});
        setModalType('STRUCTURE');
        setIsModalOpen(true);
    };

    const handleAddSuggestedElements = async (elements: Partial<StructureElement>[]) => {
        if (!state.selectedProjectId) return;

        try {
            const createdElements = [];
            for (const e of elements) {
                const elementData = {
                    element_id: `STR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    project_id: state.selectedProjectId!,
                    element_title: e.element_title || 'New Element',
                    category: e.category || 'Component',
                    description: e.description || '',
                    specification: e.specification || '',
                    parent_element_id: null
                };
                const saved = await api.createStructureElement(elementData);
                createdElements.push(saved);
            }

            setState(prev => ({
                ...prev,
                structureElements: [...prev.structureElements, ...createdElements]
            }));
        } catch (error) {
            console.error("Failed to add suggested elements", error);
            alert("Failed to save AI suggestions. Please check if the project is still valid.");
        }
    };

    const handleAddFailureModeFromItem = (item: DfmeaItem) => {
        setEditingItem({
            structure_element_id: item.structure_element_id,
            item_function: item.item_function,
            requirement: item.requirement
        });
        setModalType('DFMEA');
        setIsModalOpen(true);
    };

    // PFMEA Handlers
    const handleAddProcessStep = () => {
        setEditingItem({});
        setModalType('PROCESS_STEP');
        setIsModalOpen(true);
    };

    const handleEditProcessStep = (stepNumber: number) => {
        const stepItems = state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId && i.process_step_number === stepNumber);
        if (stepItems.length > 0) {
            setEditingItem(stepItems[0]); // Use first item to edit shared step props
            setModalType('PROCESS_STEP');
            setIsModalOpen(true);
        }
    };

    const handleDeleteProcessStep = (stepNumber: number) => {
        if (window.confirm(`Delete Step ${stepNumber} and all its failure modes?`)) {
            setState(prev => ({
                ...prev,
                pfmeaItems: prev.pfmeaItems.filter(i => !(i.project_id === state.selectedProjectId && i.process_step_number === stepNumber))
            }));
        }
    };

    const handleDeleteWorkInstruction = async (id: string) => {
        if (window.confirm("Delete this Work Instruction?")) {
            try {
                await api.deleteWorkInstruction(id);
                setState(prev => ({ ...prev, workInstructions: prev.workInstructions.filter(w => w.wi_id !== id) }));
            } catch (e) {
                console.error("Failed to delete work instruction", e);
                alert("Failed to delete work instruction");
            }
        }
    };

    const handleNavToControlPlan = (cpId: string) => {
        // Find step related to this CP
        const cp = state.controlPlanItems.find(c => c.cp_id === cpId);
        if (cp) {
            const pf = state.pfmeaItems.find(p => p.pfmea_id === cp.pfmea_link_id);
            if (pf) {
                setSelectedProcessStep(pf.process_step_number);
            }
        }
        handleNavigate('CONTROL_PLAN');
    };



    // Highlights Logic
    const dfmeaHighlights: Record<string, 'focus' | 'parent' | 'child' | 'error' | 'warning'> = {};

    // Focus Logic
    if (selectedDfmeaId) {
        dfmeaHighlights[selectedDfmeaId] = 'focus';
        const selectedItem = state.dfmeaItems.find(i => i.dfmea_id === selectedDfmeaId);
        if (selectedItem) {
            if (selectedItem.linked_parent_failure_id) dfmeaHighlights[selectedItem.linked_parent_failure_id] = 'parent';
            if (selectedItem.linked_child_failure_id) dfmeaHighlights[selectedItem.linked_child_failure_id] = 'child';

            // Reverse checks
            state.dfmeaItems.forEach(i => {
                if (i.linked_child_failure_id === selectedItem.dfmea_id) dfmeaHighlights[i.dfmea_id] = 'parent';
                if (i.linked_parent_failure_id === selectedItem.dfmea_id) dfmeaHighlights[i.dfmea_id] = 'child';
            });
        }
    }

    // Optimization Alert Logic
    if (state.currentView === 'DFMEA') {
        filteredDfmea.forEach(item => {
            const s = item.severity_score;
            const o = item.occurrence_score;
            const d = item.detection_score;
            const ap = getActionPriority(s, o, d); // Using existing function

            const hasOpenOrClosed = item.optimizationActions?.some(a => a.status === 'Open' || a.status === 'Closed');
            const hasCancelled = item.optimizationActions?.some(a => a.status === 'Cancelled');

            if (ap === 'H' && !hasOpenOrClosed) {
                dfmeaHighlights[item.dfmea_id] = 'error';
            } else if (ap === 'M' && !hasOpenOrClosed && !hasCancelled) {
                // Only warn if not already focused/highlighted? Or override?
                // Let's allow warning to coexist or prioritize error > focus > warning?
                // The styling in FmeaTable handles one type.
                if (!dfmeaHighlights[item.dfmea_id]) {
                    dfmeaHighlights[item.dfmea_id] = 'warning';
                }
            }
        });
    }
    const handleOptimizationSave = async (action: Partial<OptimizationAction>) => {
        if (!activeDfmeaIdForAction) return;

        try {
            const isPfmea = state.pfmeaItems.some(i => i.pfmea_id === activeDfmeaIdForAction);

            if (action.id) {
                // Update
                // Sanitize payload to remove UI-only fields (like failure_mode) that Prisma rejects
                const cleanPayload = {
                    preventive_measure: action.preventive_measure,
                    detection_measure: action.detection_measure,
                    responsible_owner: action.responsible_owner,
                    due_date: action.due_date,
                    status: action.status,
                    new_severity: action.new_severity,
                    new_occurrence: action.new_occurrence,
                    new_detection: action.new_detection,
                    comment: action.comment,
                    history: action.history,
                    dfmea_id: isPfmea ? undefined : activeDfmeaIdForAction,
                    pfmea_id: isPfmea ? activeDfmeaIdForAction : undefined
                };

                const saved = await api.updateOptimizationAction(action.id, cleanPayload);
                setState(prev => ({
                    ...prev,
                    dfmeaItems: prev.dfmeaItems.map(i => i.dfmea_id === activeDfmeaIdForAction ? { ...i, optimizationActions: i.optimizationActions?.map(a => a.id === saved.id ? saved : a) } : i),
                    pfmeaItems: prev.pfmeaItems.map(i => i.pfmea_id === activeDfmeaIdForAction ? { ...i, optimizationActions: i.optimizationActions?.map(a => a.id === saved.id ? saved : a) } : i)
                }));
            } else {
                // Create
                const newActionData = {
                    ...action,
                    history: action.history,
                    dfmea_id: isPfmea ? undefined : activeDfmeaIdForAction,
                    pfmea_id: isPfmea ? activeDfmeaIdForAction : undefined,
                    id: `OPT-${Date.now()}`,
                    status: action.status || 'Open'
                };

                const saved = await api.createOptimizationAction(newActionData);
                setState(prev => ({
                    ...prev,
                    dfmeaItems: prev.dfmeaItems.map(i => i.dfmea_id === activeDfmeaIdForAction ? { ...i, optimizationActions: [...(i.optimizationActions || []), saved] } : i),
                    pfmeaItems: prev.pfmeaItems.map(i => i.pfmea_id === activeDfmeaIdForAction ? { ...i, optimizationActions: [...(i.optimizationActions || []), saved] } : i)
                }));
            }
            setOptimizationModalOpen(false);
            setCurrentOptimizationItem(null);
        } catch (e: any) {
            console.error("Failed to save optimization action", e);
            alert("Failed to save optimization action");
        }
    };

    const handleEditOptimization = (action: OptimizationAction, dfmeaId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveDfmeaIdForAction(dfmeaId);
        setCurrentOptimizationItem(action);
        setOptimizationModalOpen(true);
    };

    const handleAddOptimization = (dfmeaId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveDfmeaIdForAction(dfmeaId);
        setCurrentOptimizationItem(null);
        setOptimizationModalOpen(true);
    };

    const handleAiSuggest = async (key: string, context: any) => {
        try {
            const apiKey = process.env.GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
            if (!apiKey) {
                alert("Gemini API Key not found. Please set GEMINI_API_KEY in your .env file.");
                return [];
            }

            const ai = new GoogleGenAI({ apiKey });

            let prompt = "";
            if (key === 'process_specifications') {
                prompt = `As an engineering expert, suggest 3-5 specific process parameters or specifications (with realistic values/units) for a process step with the following details:
            Process Function: ${context.process_function || 'N/A'}
            Process Requirement: ${context.process_requirement || 'N/A'}
            
            Return ONLY a JSON array of strings, for example: ["Injection Pressure: 800-1200 bar", "Melt Temperature: 240°C", "Cooling Time: 15s"].`;
            } else {
                return [];
            }

            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    response_mime_type: "application/json",
                    response_schema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                } as any
            });

            if (result.text) {
                const cleanedText = result.text.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleanedText);
            }
        } catch (e: any) {
            console.error("AI Suggestion failed", e);
            alert(`AI Suggestion failed: ${e.message || "Check your API key and connection."}`);
        }
        return [];
    };

    const GenericModal = ({ title, fields, onSubmit, initialData, onAiSuggest, optimizationActions, onAddOptimization, sections }: any) => {
        const [formData, setFormData] = useState(initialData || {});
        const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
        const [activeTab, setActiveTab] = useState(0);

        const overdueCount = optimizationActions?.filter((a: any) => {
            if (a.status === 'Closed') return false;
            if (!a.due_date) return false;
            return new Date(a.due_date) < new Date();
        }).length || 0;

        const handleAiClick = async (field: any) => {
            if (!onAiSuggest) return;
            setIsAiLoading(field.key);
            try {
                const suggestions = await onAiSuggest(field.key, formData);
                if (suggestions && suggestions.length > 0) {
                    if (field.type === 'text_list') {
                        const currentList = formData[field.key] || [];
                        const newList = Array.from(new Set([...currentList, ...suggestions]));
                        handleChange(field.key, newList);
                    } else {
                        handleChange(field.key, suggestions[0]);
                    }
                }
            } finally {
                setIsAiLoading(null);
            }
        };

        const handleChange = (key: string, value: any, extraData?: any) => {
            let updates: any = { [key]: value };
            if (extraData?.textField) {
                updates[extraData.textField] = extraData.textValue;
            }
            const allFields = sections ? sections.flatMap((s: any) => s.fields) : (fields || []);
            const fieldConfig = allFields.find((f: any) => f.key === key || f.linkKey === key);
            if (fieldConfig && fieldConfig.onChangeEffect) {
                const sideEffects = fieldConfig.onChangeEffect(value);
                updates = { ...updates, ...sideEffects };
            }
            setFormData((prev: any) => ({ ...prev, ...updates }));
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="text-xl font-bold">{title}</h3>
                        <button onClick={() => { setIsModalOpen(false); setEditingItem(null); setModalType(null); }} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {optimizationActions && (
                        <div className="flex px-6 border-b bg-slate-50">
                            <button
                                onClick={() => setActiveTab(0)}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                1. Basic Info
                            </button>
                            <button
                                onClick={() => setActiveTab(1)}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                2. Optimization Actions
                                {optimizationActions.length > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${overdueCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                                        {optimizationActions.length}
                                    </span>
                                )}
                                {overdueCount > 0 && (
                                    <span className="ml-1 text-red-500" title="Overdue Actions Found!">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 0 ? (
                            <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="p-6 grid grid-cols-2 gap-4">
                                {(sections || [{ fields }]).map((section: any, sIdx: number) => (
                                    <React.Fragment key={sIdx}>
                                        {section.title && (
                                            <div className="col-span-2 mt-4 first:mt-0 pt-4 first:pt-0 border-t first:border-0 border-slate-100">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-500 mr-2">{sIdx + 1}</span>
                                                    {section.title}
                                                </h4>
                                            </div>
                                        )}
                                        {/* Helper for rendering fields, supporting custom layouts */}
                                        <div className={section.layout === 'row-custom' ? 'col-span-2 flex flex-wrap gap-4 items-start' : 'contents'}>
                                            {section.fields.map((field: any) => (
                                                <div
                                                    key={field.key}
                                                    className={section.layout === 'row-custom' ? '' : (field.fullWidth ? 'col-span-2' : '')}
                                                    style={section.layout === 'row-custom' ? {
                                                        width: field.width || (field.fullWidth ? '100%' : 'auto'),
                                                        flexGrow: field.flexGrow ? 1 : 0
                                                    } : {}}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center space-x-2">
                                                            <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                                                            {field.helpText && <span className="text-[10px] text-slate-400 italic">({field.helpText})</span>}
                                                        </div>
                                                        {field.aiSuggest && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAiClick(field)}
                                                                disabled={isAiLoading === field.key}
                                                                className={`flex items-center text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isAiLoading === field.key
                                                                    ? 'bg-indigo-50 text-indigo-400 border-indigo-100'
                                                                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                                                                    }`}
                                                            >
                                                                {isAiLoading === field.key ? (
                                                                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                ) : (
                                                                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                )}
                                                                AI Propose
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Field Rendering */}
                                                    {field.type === 'link_selector' ? (
                                                        <div className="flex space-x-2">
                                                            <select
                                                                className="w-1/3 border-slate-300 rounded-md shadow-sm border p-2 text-xs"
                                                                value={formData[field.linkKey] || ''}
                                                                onChange={(e) => {
                                                                    const selectedOption = field.options.find((o: any) => o.value === e.target.value);
                                                                    handleChange(field.linkKey, e.target.value, { textField: field.textKey, textValue: selectedOption ? selectedOption.text : '' });
                                                                }}
                                                            >
                                                                <option value="">Select Existing...</option>
                                                                {field.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                className="flex-1 border-slate-300 rounded-md shadow-sm border p-2 text-sm"
                                                                value={formData[field.textKey] || ''}
                                                                onChange={e => handleChange(field.textKey, e.target.value)}
                                                                placeholder="Or type description..."
                                                                required={field.required}
                                                            />
                                                        </div>
                                                    ) : field.type === 'text_list' ? (
                                                        <div className="space-y-2 border rounded-md p-3 bg-slate-50 border-slate-200">
                                                            {(formData[field.key] || []).map((item: string, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 shadow-sm text-sm">
                                                                    <span className="text-slate-700 font-mono">{item}</span>
                                                                    <button type="button" onClick={() => { const newList = [...(formData[field.key] || [])]; newList.splice(idx, 1); handleChange(field.key, newList); }} className="text-slate-400 hover:text-red-500 font-bold px-1 transition-colors">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <div className="flex space-x-2 pt-1">
                                                                <input
                                                                    id={`input-${field.key}`}
                                                                    type="text"
                                                                    className="flex-1 border-slate-300 rounded-md shadow-sm border p-2 text-sm"
                                                                    placeholder={field.placeholder || "Add parameter..."}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = e.currentTarget.value.trim(); if (val) { handleChange(field.key, [...(formData[field.key] || []), val]); e.currentTarget.value = ''; } } }}
                                                                />
                                                                <button type="button" onClick={() => { const input = document.getElementById(`input-${field.key}`) as HTMLInputElement; const val = input?.value.trim(); if (val) { handleChange(field.key, [...(formData[field.key] || []), val]); input.value = ''; } }} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm font-medium">Add</button>
                                                            </div>
                                                        </div>
                                                    ) : field.type === 'image_upload' ? (
                                                        <div className="mt-1 flex items-center space-x-4">
                                                            {formData[field.key] ? (
                                                                <div className="relative group w-24 h-24 border rounded overflow-hidden shadow-sm">
                                                                    <img src={formData[field.key]} className="w-full h-full object-cover" />
                                                                    <button type="button" onClick={() => handleChange(field.key, '')} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">Remove</button>
                                                                </div>
                                                            ) : (
                                                                <button type="button" onClick={() => document.getElementById(`modal-file-${field.key}`)?.click()} className="w-24 h-24 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 bg-slate-50">
                                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                    <span className="text-[10px] mt-1 font-medium">Upload</span>
                                                                </button>
                                                            )}
                                                            <input id={`modal-file-${field.key}`} type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { if (event.target?.result) handleChange(field.key, event.target.result as string); }; reader.readAsDataURL(file); } }} />
                                                        </div>
                                                    ) : field.type === 'select' ? (
                                                        <select className="w-full border-slate-300 rounded-md shadow-sm border p-2 text-sm" value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} required={field.required}>
                                                            <option value="">{field.placeholder || "Select..."}</option>
                                                            {field.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                    ) : field.type === 'textarea' ? (
                                                        <textarea className="w-full border-slate-300 rounded-md shadow-sm border p-2 text-sm" rows={3} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} required={field.required} />
                                                    ) : (
                                                        <input type={field.type || 'text'} className="w-full border-slate-300 rounded-md shadow-sm border p-2 text-sm" value={formData[field.key] || ''} onChange={e => handleChange(field.key, field.type === 'number' ? parseInt(e.target.value) : e.target.value)} required={field.required} min={field.min} max={field.max} />
                                                    )}

                                                    {/* Structure Element Attributes Display */}
                                                    {field.key === 'structure_element_id' && formData[field.key] && (
                                                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-2 anim-fade-in">
                                                            {(() => {
                                                                const el = state.structureElements.find(e => e.element_id === formData[field.key]);
                                                                if (!el) return null;
                                                                return (
                                                                    <>
                                                                        <div className="col-span-2 flex items-center space-x-2 pb-1 border-b border-slate-200">
                                                                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold uppercase">{el.category || 'Element'}</span>
                                                                            <span className="text-xs font-bold text-slate-700">{el.element_title}</span>
                                                                        </div>
                                                                        <div className="text-[10px]">
                                                                            <span className="text-slate-400 block uppercase font-bold">Description</span>
                                                                            <span className="text-slate-600 italic">{el.description || 'No description provided'}</span>
                                                                        </div>
                                                                        <div className="text-[10px]">
                                                                            <span className="text-slate-400 block uppercase font-bold">Specification</span>
                                                                            <span className="text-slate-600">{el.specification || 'N/A'}</span>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* DFMEA Link Attributes Display for PFMEA */}
                                                    {field.key === 'linked_dfmea_id' && formData[field.key] && (
                                                        <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 anim-fade-in">
                                                            {(() => {
                                                                const dfmea = state.dfmeaItems.find(i => i.dfmea_id === formData[field.key]);
                                                                if (!dfmea) return null;
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Linked DFMEA Requirement</span>
                                                                            {dfmea.classification !== 'None' && (
                                                                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200 uppercase">{dfmea.classification} CHARACTERISTIC</span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] text-indigo-400 block font-bold uppercase">Function</span>
                                                                            <span className="text-xs text-indigo-900 font-medium">{dfmea.item_function}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] text-indigo-400 block font-bold uppercase">Requirement</span>
                                                                            <span className="text-xs text-indigo-900 font-medium">{dfmea.requirement}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </React.Fragment>
                                ))}
                                <div className="col-span-2 flex justify-end space-x-3 mt-4 pt-4 border-t">
                                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); setModalType(null); }} className="px-4 py-2 text-slate-600">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold shadow-lg hover:bg-blue-700 transition-colors">Save Changes</button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-slate-800">Linked Optimization Actions</h4>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            const id = formData.dfmea_id || formData.pfmea_id;
                                            if (id) onAddOptimization(id, e);
                                        }}
                                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
                                    >
                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add New Action
                                    </button>
                                </div>

                                {optimizationActions.length > 0 ? (
                                    <div className="space-y-3">
                                        {optimizationActions.map((action: any) => {
                                            const isOverdue = action.status !== 'Closed' && action.due_date && new Date(action.due_date) < new Date();
                                            return (
                                                <div key={action.id} className={`p-4 rounded-lg border-l-4 shadow-sm bg-white border ${isOverdue ? 'border-red-200 border-l-red-500 bg-red-50/30' : 'border-slate-200 border-l-indigo-500'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-800 text-sm">{action.preventive_measure}</div>
                                                            <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                                                                <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{action.responsible_owner}</span>
                                                                <span className={`flex items-center ${isOverdue ? 'text-red-600 font-bold' : ''}`}><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{action.due_date}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end space-y-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${action.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{action.status}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    const id = formData.dfmea_id || formData.pfmea_id;
                                                                    handleEditOptimization(action, id, e);
                                                                }}
                                                                className={`text-[10px] font-bold flex items-center ${isOverdue ? 'text-red-600 hover:text-red-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                                                            >
                                                                {isOverdue && (
                                                                    <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                                )}
                                                                Edit Action →
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                                        <p className="text-sm">No optimization actions linked to this item yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    const renderContent = () => {
        switch (state.currentView) {
            case 'DASHBOARD':
                return <ProjectDashboard
                    projects={state.projects}
                    onSelectProject={handleSelectProject}
                    onAddProject={handleAddProject}
                    onDeleteProject={handleDeleteProject}
                />;

            case 'ADMIN':
                return <AdminSettings
                    businessAreas={state.businessAreas}
                    locations={state.locations}
                    businessAreaLocationMap={state.businessAreaLocationMap}
                    onUpdateBusinessAreas={(areas) => setState(prev => ({ ...prev, businessAreas: areas }))}
                    onUpdateLocations={(locs) => setState(prev => ({ ...prev, locations: locs }))}
                    onUpdateAssociations={(updatedMap) => setState(prev => ({ ...prev, businessAreaLocationMap: updatedMap }))}
                />;

            case 'PROJECT_SETTINGS':
                if (!activeProject) return <div>No project selected</div>;
                return <ProjectSettings
                    project={activeProject}
                    riskSettings={state.riskSettings}
                    businessAreas={state.businessAreas}
                    locations={state.locations}
                    businessAreaLocationMap={state.businessAreaLocationMap}
                    onUpdateProject={async (updated) => {
                        try {
                            const saved = await api.updateProject(updated.project_id, updated);
                            setState(prev => {
                                const newProjects = prev.projects.map(p => p.project_id === saved.project_id ? saved : p);
                                return {
                                    ...prev,
                                    projects: newProjects
                                };
                            });
                        } catch (e) {
                            console.error("Failed to update project", e);
                            alert("Failed to update project");
                        }
                    }}
                    onUpdateRiskSettings={(settings) => {
                        setState(prev => ({ ...prev, riskSettings: settings }));
                    }}
                />;

            case 'WORK_INSTRUCTIONS':
                return (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Digital Work Instructions</h2>
                                <p className="text-slate-500">Standard Operating Procedures & Visual Aids</p>
                            </div>
                            <button
                                onClick={() => { setEditingItem(null); setShowWiEditor(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm flex items-center font-medium"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Create New
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.workInstructions.map(wi => (
                                <div key={wi.wi_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
                                    <div className="h-40 bg-slate-100 relative shrink-0">
                                        {wi.steps[0]?.image_url ? (
                                            <img src={wi.steps[0].image_url} alt={wi.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                            {wi.model_variant}
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="text-xs text-slate-500 font-mono mb-1">{wi.doc_id}</div>
                                        <h3 className="font-bold text-lg text-slate-800 mb-2">{wi.title}</h3>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                            <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                {wi.steps.length} Steps
                                            </span>
                                            <button
                                                onClick={() => setViewingWorkInstruction(wi)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                                            >
                                                Launch Viewer
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center text-xs">
                                        <div className="flex space-x-2">
                                            <button onClick={() => { setEditingItem(wi); setShowWiEditor(true); }} className="text-slate-600 hover:text-blue-600 font-medium">Edit</button>
                                            <span className="text-slate-300">|</span>
                                            <button onClick={() => handleDeleteWorkInstruction(wi.wi_id)} className="text-slate-600 hover:text-red-600 font-medium">Delete</button>
                                        </div>
                                        {wi.linked_cp_id && (
                                            <button
                                                onClick={() => handleNavToControlPlan(wi.linked_cp_id)}
                                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center"
                                            >
                                                Go to CP
                                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {state.workInstructions.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-500">No Work Instructions available.</p>
                                    <p className="text-xs text-slate-400 mt-1">Create one to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'DFMEA':
                if (!activeProject) {
                    return <div className="p-8 text-center">
                        <p className="text-slate-600">Loading project data...</p>
                        <p className="text-sm text-slate-400 mt-2">If this persists, please return to the dashboard and try again.</p>
                    </div>;
                }

                // Prepare Failure Chain Options for the currently selected structure
                const higherLevelFailures = getHigherLevelFailures(selectedStructureId);
                const lowerLevelFailures = getLowerLevelFailures(selectedStructureId);
                const existingFunctions = getExistingFunctions(selectedStructureId);

                return (
                    <div className="space-y-6">
                        <div id="exploded-view-section" className="scroll-mt-20">
                            <ExplodedView
                                diagrams={currentDiagrams}
                                activeDiagramId={selectedDiagramId}
                                structureElements={projectStructureElements}
                                selectedElementId={selectedStructureId}
                                onSelectDiagram={setSelectedDiagramId}
                                onAddDiagram={handleAddDiagram}
                                onDeleteDiagram={handleDeleteDiagram}
                                onRenameDiagram={handleRenameDiagram}
                                onUploadImage={handleUploadImage}
                                onAddBox={handleAddBox}
                                onRemoveBox={handleRemoveBox}
                                onBoxDropNew={handleBoxDropNew}
                                onAddNewElement={handleAddNewStructureElement}
                                onAddSuggestedElements={handleAddSuggestedElements}
                                onSelectElement={setSelectedStructureId}
                            />
                        </div>

                        <StructureVisualizer
                            projectName={activeProject?.part_name || "Project"}
                            elements={projectStructureElements}
                            dfmeaItems={state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                            selectedElementId={selectedStructureId}
                            activeDiagram={activeDiagram}
                            onSelectElement={setSelectedStructureId}
                            onAddElement={() => { setEditingItem({}); setModalType('STRUCTURE'); setIsModalOpen(true); }}
                            onEditElement={(el) => { setEditingItem(el); setModalType('STRUCTURE'); setIsModalOpen(true); }}
                            onDeleteElement={(id) => handleDeleteItem('STRUCTURE', id)}
                            onUpdateElement={handleUpdateStructureElement}
                            onImagePreviewClick={() => {
                                const el = document.getElementById('exploded-view-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        />

                        <FmeaTable<DfmeaItem>
                            title={selectedStructureId
                                ? `Design FMEA for: ${projectStructureElements.find(e => e.element_id === selectedStructureId)?.element_title}`
                                : "Design FMEA (All Items)"}
                            colorTheme="blue"
                            idKey="dfmea_id"
                            data={filteredDfmea}
                            highlights={dfmeaHighlights}
                            onRowClick={(item) => setSelectedDfmeaId(item.dfmea_id === selectedDfmeaId ? null : item.dfmea_id)}
                            customActions={<SearchBar />}
                            renderRowActions={(item) => (
                                <button
                                    onClick={() => handleAddFailureModeFromItem(item)}
                                    className="flex items-center text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 text-xs font-semibold whitespace-nowrap transition-colors shadow-sm"
                                    title="Add new Failure Mode for this Function"
                                >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Add Failure Mode
                                </button>
                            )}
                            onAdd={() => {
                                setEditingItem({ structure_element_id: selectedStructureId });
                                setModalType('DFMEA');
                                setIsModalOpen(true);
                            }}
                            onEdit={(item) => { setEditingItem(item); setModalType('DFMEA'); setIsModalOpen(true); }}
                            onDelete={(id) => handleDeleteItem('DFMEA', id)}
                            onOpenSettings={() => handleNavigate('PROJECT_SETTINGS')}
                            columns={[
                                { key: 'item_function', label: 'Function', width: '15%' },
                                { key: 'requirement', label: 'Requirement', width: '20%' },
                                {
                                    key: 'classification',
                                    label: 'CL',
                                    width: '40px',
                                    render: (i) => {
                                        if (i.classification === 'CC' || i.classification === 'SC') {
                                            return (
                                                <div className="flex items-center justify-center" title={i.classification === 'CC' ? 'Critical Characteristic' : 'Significant Characteristic'}>
                                                    <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rotate-45 flex items-center justify-center">
                                                        <span className="text-[7px] -rotate-45 font-bold text-slate-900">{i.classification}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }
                                },
                                { key: 'failure_mode', label: 'Failure Mode' },
                                {
                                    key: 'effect_of_failure', label: 'Effect (Higher Level)', render: i => (
                                        <div>
                                            <div className="text-sm">{i.effect_of_failure}</div>
                                            {i.linked_parent_failure_id && <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">Linked</span>}
                                        </div>
                                    )
                                },
                                {
                                    key: 'potential_cause', label: 'Cause (Lower Level)', render: i => (
                                        <div>
                                            <div className="text-sm">{i.potential_cause}</div>
                                            {i.linked_child_failure_id && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded border border-emerald-200">Linked</span>}
                                        </div>
                                    )
                                },
                                {
                                    key: 'severity_score', label: 'S', render: (i) => {
                                        const closedAction = i.optimizationActions?.find(a => a.status === 'Closed');
                                        if (closedAction?.new_severity) {
                                            return (
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10px] text-slate-400 line-through">{i.severity_score}</span>
                                                    <span className="font-bold text-green-700">{closedAction.new_severity}</span>
                                                </div>
                                            );
                                        }
                                        return <span className="font-bold text-slate-600" title={state.riskSettings.definitions.severity[i.severity_score]}>{i.severity_score}</span>;
                                    }
                                },
                                {
                                    key: 'occurrence_score', label: 'O', render: (i) => {
                                        const closedAction = i.optimizationActions?.find(a => a.status === 'Closed');
                                        if (closedAction?.new_occurrence) {
                                            return (
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10px] text-slate-400 line-through">{i.occurrence_score}</span>
                                                    <span className="font-bold text-green-700">{closedAction.new_occurrence}</span>
                                                </div>
                                            );
                                        }
                                        return <span title={state.riskSettings.definitions.occurrence[i.occurrence_score]}>{i.occurrence_score}</span>;
                                    }
                                },
                                {
                                    key: 'detection_score', label: 'D', render: (i) => {
                                        const closedAction = i.optimizationActions?.find(a => a.status === 'Closed');
                                        if (closedAction?.new_detection) {
                                            return (
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10px] text-slate-400 line-through">{i.detection_score}</span>
                                                    <span className="font-bold text-green-700">{closedAction.new_detection}</span>
                                                </div>
                                            );
                                        }
                                        return <span title={state.riskSettings.definitions.detection[i.detection_score]}>{i.detection_score}</span>;
                                    }
                                },
                                {
                                    key: 'rpn', label: 'AP', render: (i) => {
                                        const closedAction = i.optimizationActions?.find(a => a.status === 'Closed');
                                        if (closedAction?.new_severity && closedAction?.new_occurrence && closedAction?.new_detection) {
                                            const newAp = getActionPriority(closedAction.new_severity, closedAction.new_occurrence, closedAction.new_detection);
                                            return (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="opacity-50 scale-75 origin-bottom"><ApBadge value={getActionPriority(i.severity_score, i.occurrence_score, i.detection_score)} /></span>
                                                    <ApBadge value={newAp} />
                                                </div>
                                            );
                                        }
                                        return <ApBadge value={getActionPriority(i.severity_score, i.occurrence_score, i.detection_score)} />;
                                    }
                                },
                                {
                                    key: 'optimization',
                                    label: 'Optimization',
                                    width: '20%',
                                    render: (i) => (
                                        <div className="flex flex-col space-y-2">
                                            {i.optimizationActions && i.optimizationActions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {i.optimizationActions.map(action => {
                                                        const isOverdue = action.status !== 'Closed' && action.due_date && new Date(action.due_date) < new Date();
                                                        return (
                                                            <button
                                                                key={action.id}
                                                                onClick={(e) => handleEditOptimization(action, i.dfmea_id, e)}
                                                                className={`text-[10px] px-2 py-1 rounded border overflow-hidden max-w-full truncate flex items-center
                                                                    ${isOverdue ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                                                                        action.status === 'Open' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                            action.status === 'Closed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                                'bg-slate-100 text-slate-800 border-slate-200 line-through opacity-70'}
                                                                `}
                                                                title={`${action.status}${isOverdue ? ' (OVERDUE)' : ''}: ${action.preventive_measure}`}
                                                            >
                                                                {isOverdue && (
                                                                    <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                                )}
                                                                {action.status === 'Cancelled' ? 'Cancelled (Reason)' : action.preventive_measure.substring(0, 15) + '...'}
                                                            </button>
                                                        );
                                                    })}
                                                    <button onClick={(e) => handleAddOptimization(i.dfmea_id, e)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1 rounded">+</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleAddOptimization(i.dfmea_id, e)}
                                                    className="text-xs bg-white border border-blue-500 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 shadow-sm transition-colors"
                                                >
                                                    + Add Action
                                                </button>
                                            )}
                                        </div>
                                    )
                                },
                                { key: 'actions', label: '' }
                            ]}
                        />



                        {isModalOpen && modalType === 'STRUCTURE' && (
                            <GenericModal
                                title={editingItem.element_id ? "Edit Structure Element" : "New Structure Element"}
                                initialData={editingItem}
                                onSubmit={async (data: any) => {
                                    const newItemData = {
                                        ...data,
                                        project_id: state.selectedProjectId,
                                        element_id: data.element_id || `STR-${Date.now()}`,
                                        parent_element_id: data.parent_element_id === '' ? null : data.parent_element_id
                                    };

                                    try {
                                        if (editingItem.element_id) {
                                            const saved = await api.updateStructureElement(newItemData.element_id, newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                structureElements: prev.structureElements.map(e => e.element_id === saved.element_id ? saved : e)
                                            }));
                                        } else {
                                            const saved = await api.createStructureElement(newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                structureElements: [...prev.structureElements, saved]
                                            }));

                                            // Handle diagram drop
                                            if (pendingDiagramDrop && state.selectedProjectId) {
                                                await handleAddBox(pendingDiagramDrop.diagramId, {
                                                    id: `BOX-${Date.now()}`,
                                                    structure_element_id: saved.element_id,
                                                    x: pendingDiagramDrop.x,
                                                    y: pendingDiagramDrop.y
                                                });
                                            }
                                        }
                                        setIsModalOpen(false);
                                        setPendingDiagramDrop(null);
                                    } catch (e) {
                                        console.error("Failed to save structure element", e);
                                        alert("Failed to save structure element");
                                    }
                                }}
                                fields={[
                                    { key: 'element_title', label: 'Element Title', required: true, fullWidth: true },
                                    {
                                        key: 'category',
                                        label: 'Category',
                                        type: 'select',
                                        options: [
                                            { value: 'Component', label: 'Component' },
                                            { value: 'Sub-system', label: 'Sub-system' },
                                            { value: 'Assembly', label: 'Assembly' }
                                        ]
                                    },
                                    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true },
                                    { key: 'specification', label: 'Specification / Context', fullWidth: true },
                                    {
                                        key: 'parent_element_id',
                                        label: 'Parent Element (Optional)',
                                        type: 'select',
                                        fullWidth: true,
                                        placeholder: "None (Root Level)",
                                        options: [
                                            { value: '', label: 'None (Root Level)' },
                                            ...projectStructureElements
                                                .filter(e => e.element_id !== editingItem.element_id)
                                                .map(e => ({ value: e.element_id, label: e.element_title }))
                                        ]
                                    }
                                ]}
                            />
                        )}

                        {isModalOpen && modalType === 'DFMEA' && (
                            <GenericModal
                                title={editingItem.dfmea_id ? "Edit DFMEA Item" : "New DFMEA Item"}
                                initialData={editingItem}
                                onSubmit={async (data: any) => {
                                    const s = Number(data.severity_score) || 1;
                                    const o = Number(data.occurrence_score) || 1;
                                    const d = Number(data.detection_score) || 1;
                                    const { optimizationActions, ...cleanData } = data;
                                    const newItemData = {
                                        ...cleanData,
                                        severity_score: s, occurrence_score: o, detection_score: d,
                                        rpn: s * o * d,
                                        project_id: state.selectedProjectId,
                                        dfmea_id: data.dfmea_id || `DF-${Date.now()}`,
                                        failure_mode_id: data.failure_mode_id || `FM-${Date.now()}`
                                    };

                                    try {
                                        if (editingItem.dfmea_id) {
                                            const saved = await api.updateDfmeaItem(newItemData.dfmea_id, newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                dfmeaItems: prev.dfmeaItems.map(i => i.dfmea_id === saved.dfmea_id ? saved : i)
                                            }));
                                        } else {
                                            const saved = await api.createDfmeaItem(newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                dfmeaItems: [...prev.dfmeaItems, saved]
                                            }));
                                        }
                                        setIsModalOpen(false);
                                    } catch (e) {
                                        console.error("Failed to save DFMEA item", e);
                                        alert("Failed to save DFMEA item");
                                    }
                                }}
                                sections={[
                                    {
                                        title: 'Structure Element',
                                        fields: [
                                            {
                                                key: 'structure_element_id',
                                                label: 'Parent Structure Element',
                                                type: 'select',
                                                fullWidth: true,
                                                options: projectStructureElements.map(e => ({ value: e.element_id, label: e.element_title })),
                                                required: true
                                            }
                                        ]
                                    },
                                    {
                                        title: 'Function',
                                        fields: [
                                            {
                                                key: 'item_function',
                                                label: 'Item Function',
                                                required: true,
                                                fullWidth: true,
                                                type: 'text',
                                                suggestions: existingFunctions,
                                                placeholder: "What does this item do? (Type or Select existing)"
                                            },
                                            { key: 'requirement', label: 'Requirement', required: true, fullWidth: true }
                                        ]
                                    },
                                    {
                                        title: 'Failure',
                                        fields: [
                                            { key: 'failure_mode', label: 'Failure Mode', required: true },
                                            { key: 'classification', label: 'Classification', options: [{ value: 'CC', label: 'Critical' }, { value: 'SC', label: 'Significant' }, { value: 'None', label: 'None' }], type: 'select' },
                                            {
                                                key: 'effect_chain',
                                                type: 'link_selector',
                                                label: 'Effect of Failure (Link to Higher Level)',
                                                linkKey: 'linked_parent_failure_id',
                                                textKey: 'effect_of_failure',
                                                options: higherLevelFailures,
                                                helpText: "Select a failure mode from the parent element to establish the chain.",
                                                fullWidth: true
                                            },
                                            {
                                                key: 'cause_chain',
                                                type: 'link_selector',
                                                label: 'Potential Cause (Link to Lower Level)',
                                                linkKey: 'linked_child_failure_id',
                                                textKey: 'potential_cause',
                                                options: lowerLevelFailures,
                                                helpText: "Select a failure mode from a child element if available.",
                                                fullWidth: true
                                            }
                                        ]
                                    },
                                    {
                                        title: 'Control measure',
                                        fields: [
                                            { key: 'design_control_prevention', label: 'Prevention Control' },
                                            { key: 'design_control_detection', label: 'Detection Control' }
                                        ]
                                    },
                                    {
                                        title: 'Risk',
                                        fields: [
                                            { key: 'severity_score', label: 'Severity (1-10)', type: 'number', min: 1, max: 10, required: true },
                                            { key: 'occurrence_score', label: 'Occurrence (1-10)', type: 'number', min: 1, max: 10, required: true },
                                            { key: 'detection_score', label: 'Detection (1-10)', type: 'number', min: 1, max: 10, required: true }
                                        ]
                                    }
                                ]}
                                optimizationActions={editingItem.optimizationActions}
                                onAddOptimization={handleAddOptimization}
                            />
                        )}
                    </div>
                );

            case 'PFMEA':
                return (
                    <>
                        <ProcessFlowVisualizer
                            items={state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                            selectedStepNumber={selectedProcessStep}
                            onSelectStep={setSelectedProcessStep}
                            onAddStep={handleAddProcessStep}
                            onEditStep={handleEditProcessStep}
                            onDeleteStep={handleDeleteProcessStep}
                        />

                        <FmeaTable<PfmeaItem>
                            title={selectedProcessStep !== null
                                ? `Process FMEA for Step ${selectedProcessStep}`
                                : "Process FMEA (All Steps)"}
                            colorTheme="green"
                            idKey="pfmea_id"
                            data={filteredPfmea}
                            customActions={<SearchBar />}
                            onAdd={() => { setEditingItem({}); setModalType('PFMEA'); setIsModalOpen(true); }}
                            onEdit={(item) => { setEditingItem(item); setModalType('PFMEA'); setIsModalOpen(true); }}
                            onDelete={(id) => handleDeleteItem('PFMEA', id)}
                            columns={[
                                { key: 'process_step_number', label: 'Step #', render: i => <span className="font-mono font-bold text-slate-500">{i.process_step_number}</span> },
                                {
                                    key: 'special_characteristic',
                                    label: 'CL',
                                    width: '40px',
                                    render: (i) => {
                                        if (i.special_characteristic === 'In-process' || i.special_characteristic === 'Component') {
                                            const label = i.special_characteristic === 'In-process' ? 'SC' : 'CC';
                                            return (
                                                <div className="flex items-center justify-center" title={i.special_characteristic}>
                                                    <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rotate-45 flex items-center justify-center">
                                                        <span className="text-[7px] -rotate-45 font-bold text-slate-900">{label}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }
                                },
                                { key: 'process_function', label: 'Function' },
                                { key: 'process_requirement', label: 'Requirement' },
                                { key: 'failure_mode', label: 'Failure Mode' },
                                {
                                    key: 'failure_cause',
                                    label: 'Cause',
                                    render: (i) => (
                                        <div className="flex flex-col space-y-1">
                                            {i.four_m_label && (
                                                <div className="flex items-center">
                                                    <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[8px] font-bold uppercase tracking-wider shadow-sm border border-slate-700">
                                                        {i.four_m_label}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-slate-700 leading-snug">{i.failure_cause}</div>
                                        </div>
                                    )
                                },
                                { key: 'prevention_control', label: 'Prevention' },
                                { key: 'detection_control', label: 'Detection' },
                                { key: 'occurrence_score', label: 'O' },
                                { key: 'detection_score', label: 'D' },
                                {
                                    key: 'linked_cp',
                                    label: 'CP',
                                    width: '60px',
                                    render: (i) => {
                                        const hasCP = state.controlPlanItems.some(cp => cp.pfmea_link_id === i.pfmea_id);
                                        if (!hasCP) return <span className="text-slate-300 text-xs text-center block">-</span>;
                                        return (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProcessStep(i.process_step_number);
                                                    handleNavigate('CONTROL_PLAN');
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center w-full"
                                                title={`Go to Control Plan for Step ${i.process_step_number}`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </button>
                                        );
                                    }
                                },
                                {
                                    key: 'optimization',
                                    label: 'Optimization',
                                    width: '20%',
                                    render: (i) => (
                                        <div className="flex flex-col space-y-2">
                                            {i.optimizationActions && i.optimizationActions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {i.optimizationActions.map(action => {
                                                        const isOverdue = action.status !== 'Closed' && action.due_date && new Date(action.due_date) < new Date();
                                                        return (
                                                            <button
                                                                key={action.id}
                                                                onClick={(e) => handleEditOptimization(action, i.pfmea_id, e)}
                                                                className={`text-[10px] px-2 py-1 rounded border overflow-hidden max-w-full truncate flex items-center
                                                                    ${isOverdue ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                                                                        action.status === 'Open' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                            action.status === 'Closed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                                'bg-slate-100 text-slate-800 border-slate-200 line-through opacity-70'}
                                                                `}
                                                                title={`${action.status}${isOverdue ? ' (OVERDUE)' : ''}: ${action.preventive_measure}`}
                                                            >
                                                                {isOverdue && (
                                                                    <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                                )}
                                                                {action.status === 'Cancelled' ? 'Cancelled (Reason)' : action.preventive_measure.substring(0, 15) + '...'}
                                                            </button>
                                                        );
                                                    })}
                                                    <button onClick={(e) => handleAddOptimization(i.pfmea_id, e)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1 rounded">+</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleAddOptimization(i.pfmea_id, e)}
                                                    className="text-xs bg-white border border-blue-500 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 shadow-sm transition-colors"
                                                >
                                                    + Add Action
                                                </button>
                                            )}
                                        </div>
                                    )
                                },
                                { key: 'actions', label: '' }
                            ]}
                        />
                        {isModalOpen && modalType === 'PFMEA' && (
                            <GenericModal
                                title={editingItem.pfmea_id ? "Edit PFMEA Item" : "New PFMEA Item"}
                                initialData={editingItem}
                                onSubmit={async (data: any) => {
                                    const { dfmeaItem, controlPlanItems, optimizationActions, ...cleanData } = data;
                                    const newItemData = {
                                        ...cleanData,
                                        project_id: state.selectedProjectId,
                                        pfmea_id: data.pfmea_id || `PF-${Date.now()}`
                                    };

                                    try {
                                        if (editingItem.pfmea_id) {
                                            const saved = await api.updatePfmeaItem(newItemData.pfmea_id, newItemData);
                                            // Defensive parsing for process_specifications
                                            if (typeof saved.process_specifications === 'string') {
                                                try { saved.process_specifications = JSON.parse(saved.process_specifications); } catch { saved.process_specifications = []; }
                                            }
                                            setState(prev => ({
                                                ...prev,
                                                pfmeaItems: prev.pfmeaItems.map(i => i.pfmea_id === saved.pfmea_id ? saved : i)
                                            }));
                                        } else {
                                            const saved = await api.createPfmeaItem(newItemData);
                                            // Defensive parsing for process_specifications
                                            if (typeof saved.process_specifications === 'string') {
                                                try { saved.process_specifications = JSON.parse(saved.process_specifications); } catch { saved.process_specifications = []; }
                                            }
                                            setState(prev => ({
                                                ...prev,
                                                pfmeaItems: [...prev.pfmeaItems, saved]
                                            }));
                                        }
                                        setIsModalOpen(false);
                                    } catch (e) {
                                        console.error("Failed to save PFMEA item", e);
                                        alert("Failed to save PFMEA item");
                                    }
                                }}
                                sections={[
                                    {
                                        title: 'Structure Element',
                                        fields: [
                                            {
                                                key: 'linked_dfmea_id',
                                                label: 'Link to DFMEA Requirement (Golden Thread)',
                                                type: 'select',
                                                fullWidth: true,
                                                options: state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId).map(d => ({ value: d.dfmea_id, label: `${d.requirement} (${d.classification})` })),
                                                onChangeEffect: (val: string) => {
                                                    const dfmea = state.dfmeaItems.find(d => d.dfmea_id === val);
                                                    if (dfmea && (dfmea.classification === 'CC' || dfmea.classification === 'SC')) {
                                                        return { special_characteristic: 'In-process' };
                                                    }
                                                    return {};
                                                }
                                            },
                                            {
                                                key: 'special_characteristic',
                                                label: 'Special Characteristic',
                                                type: 'select',
                                                options: [
                                                    { value: 'None', label: 'None (default)' },
                                                    { value: 'In-process', label: 'In-process Special Characteristic' },
                                                    { value: 'Component', label: 'Component Special Characteristic' }
                                                ]
                                            },
                                            { key: 'process_step_number', label: 'Step Number', type: 'number', required: true }
                                        ]
                                    },
                                    {
                                        title: 'Function',
                                        fields: [
                                            { key: 'process_function', label: 'Process Function', required: true },
                                            { key: 'process_requirement', label: 'Process Requirement', required: true }
                                        ]
                                    },
                                    {
                                        title: 'Failure',
                                        fields: [
                                            { key: 'failure_mode', label: 'Failure Mode', required: true, fullWidth: true },
                                            {
                                                key: 'four_m_label',
                                                label: '4M Category',
                                                type: 'select',
                                                options: [
                                                    { value: 'Man', label: 'Man' },
                                                    { value: 'Machine', label: 'Machine' },
                                                    { value: 'Material', label: 'Material' },
                                                    { value: 'Method', label: 'Method' }
                                                ],
                                                placeholder: "Select 4M...",
                                                width: '120px'
                                            },
                                            { key: 'failure_cause', label: 'Failure Cause', required: true, flexGrow: true }
                                        ],
                                        layout: 'row-custom'
                                    },
                                    {
                                        title: 'Control measure',
                                        fields: [
                                            { key: 'prevention_control', label: 'Prevention Control' },
                                            { key: 'detection_control', label: 'Detection Control' }
                                        ]
                                    },
                                    {
                                        title: 'Risk',
                                        fields: [
                                            { key: 'occurrence_score', label: 'Occurrence', type: 'number', min: 1, max: 10 },
                                            { key: 'detection_score', label: 'Detection', type: 'number', min: 1, max: 10 }
                                        ]
                                    }
                                ]}
                                optimizationActions={editingItem.optimizationActions}
                                onAddOptimization={handleAddOptimization}
                            />
                        )}
                        {isModalOpen && modalType === 'PROCESS_STEP' && (
                            <GenericModal
                                title={editingItem.pfmea_id ? "Edit Process Step Details" : "Add Process Step"}
                                initialData={editingItem}
                                onSubmit={(data: any) => {
                                    const isEdit = !!data.pfmea_id;

                                    setState(prev => {
                                        let newItems = [...prev.pfmeaItems];

                                        if (isEdit) {
                                            // Batch update all items with this step number in this project
                                            newItems = newItems.map(item => {
                                                if (item.project_id === state.selectedProjectId && item.process_step_number === editingItem.process_step_number) {
                                                    return {
                                                        ...item,
                                                        // If user changed step number, update it. If not, it remains.
                                                        process_step_number: data.process_step_number,
                                                        process_function: data.function || data.process_function,
                                                        process_requirement: data.requirement || data.process_requirement,
                                                        process_specifications: data.process_specifications,
                                                        image_url: data.image_url
                                                    };
                                                }
                                                return item;
                                            });
                                        } else {
                                            // Add new item (placeholder for failure mode)
                                            const newItem = {
                                                ...data,
                                                project_id: state.selectedProjectId,
                                                pfmea_id: `PF-${Date.now()}`,
                                                // Default/Empty values for failure analysis parts
                                                linked_dfmea_id: null,
                                                failure_mode: 'New Failure Mode',
                                                failure_cause: '',
                                                prevention_control: '',
                                                detection_control: '',
                                                occurrence_score: 1,
                                                detection_score: 1,
                                                process_specifications: data.process_specifications || []
                                            };
                                            newItems.push(newItem);
                                        }

                                        return { ...prev, pfmeaItems: newItems };
                                    });
                                    setIsModalOpen(false);
                                }}
                                fields={[
                                    { key: 'process_step_number', label: 'Step Number', type: 'number', required: true },
                                    { key: 'process_function', label: 'Process Function', required: true, fullWidth: true },
                                    { key: 'process_requirement', label: 'Process Requirement', fullWidth: true },
                                    { key: 'process_specifications', label: 'Process Specifications / Parameters', type: 'text_list', fullWidth: true, placeholder: "e.g. Temp: 200°C", aiSuggest: true },
                                    { key: 'image_url', label: 'Visual Aid / Process Image', type: 'image_upload', fullWidth: true }
                                ]}
                                onAiSuggest={handleAiSuggest}
                            />
                        )}
                    </>
                );

            case 'CONTROL_PLAN':
                return (
                    <>
                        <ProcessFlowVisualizer
                            items={state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                            selectedStepNumber={selectedProcessStep}
                            onSelectStep={setSelectedProcessStep}
                            onAddStep={handleAddProcessStep}
                            onEditStep={handleEditProcessStep}
                            onDeleteStep={handleDeleteProcessStep}
                        />

                        <FmeaTable<ControlPlanItem>
                            title={selectedProcessStep !== null
                                ? `Control Plan for Step ${selectedProcessStep}`
                                : "Control Plan (All Items)"}
                            colorTheme="indigo"
                            idKey="cp_id"
                            data={filteredControlPlan}
                            customActions={<SearchBar />}
                            onAdd={() => {
                                const initialLink = projectPfmeaItems.find(pf => pf.process_step_number === selectedProcessStep)?.pfmea_id || '';
                                setEditingItem({ pfmea_link_id: initialLink });
                                setModalType('CONTROL_PLAN');
                                setIsModalOpen(true);
                            }}
                            onEdit={(item) => { setEditingItem(item); setModalType('CONTROL_PLAN'); setIsModalOpen(true); }}
                            onDelete={(id) => handleDeleteItem('CONTROL_PLAN', id)}
                            columns={[
                                { key: 'part_process_number', label: 'Step', width: '50px' },
                                { key: 'product_characteristic', label: 'Product Char.' },
                                { key: 'process_characteristic', label: 'Process Char.' },
                                { key: 'specification_tolerance', label: 'Spec / Tolerance' },
                                { key: 'evaluation_technique', label: 'Eval Technique' },
                                { key: 'sample_size', label: 'Size' },
                                { key: 'sample_freq', label: 'Freq' },
                                { key: 'control_method', label: 'Control Method' },
                                {
                                    key: 'linked_wi_id',
                                    label: 'Instruction',
                                    render: (item) => {
                                        const wi = state.workInstructions.find(w => w.wi_id === item.linked_wi_id);
                                        if (!wi) return <span className="text-slate-400 italic">None</span>;
                                        return (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setViewingWorkInstruction(wi); }}
                                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                                            >
                                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                {wi.doc_id}
                                            </button>
                                        );
                                    }
                                },
                                { key: 'reaction_plan', label: 'Reaction Plan', render: i => <span className="text-red-600 font-medium">{i.reaction_plan}</span> },
                                { key: 'actions', label: '' }
                            ]}
                        />
                        {isModalOpen && modalType === 'CONTROL_PLAN' && (
                            <GenericModal
                                title={editingItem.cp_id ? "Edit Control Plan Item" : "New Control Plan Item"}
                                initialData={editingItem}
                                onSubmit={async (data: any) => {
                                    const pf = projectPfmeaItems.find(p => p.pfmea_id === data.pfmea_link_id);
                                    const { pfmeaItem, ...cleanData } = data;
                                    const newItemData = {
                                        ...cleanData,
                                        cp_id: data.cp_id || `CP-${Date.now()}`,
                                        part_process_number: data.part_process_number || (pf ? String(pf.process_step_number) : '')
                                    };

                                    try {
                                        if (editingItem.cp_id) {
                                            const saved = await api.updateControlPlanItem(newItemData.cp_id, newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                controlPlanItems: prev.controlPlanItems.map(i => i.cp_id === saved.cp_id ? saved : i)
                                            }));
                                        } else {
                                            const saved = await api.createControlPlanItem(newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                controlPlanItems: [...prev.controlPlanItems, saved]
                                            }));
                                        }
                                        setIsModalOpen(false);
                                    } catch (e) {
                                        console.error("Failed to save Control Plan item", e);
                                        alert("Failed to save Control Plan item");
                                    }
                                }}
                                fields={[
                                    {
                                        key: 'pfmea_link_id',
                                        label: 'Linked PFMEA Item',
                                        type: 'select',
                                        fullWidth: true,
                                        options: projectPfmeaItems.map(p => ({
                                            value: p.pfmea_id,
                                            label: `Step ${p.process_step_number}: ${p.process_function} - Failure: ${p.failure_mode}`
                                        })),
                                        required: true
                                    },
                                    { key: 'part_process_number', label: 'Process Step #', helpText: "Leave blank to use Step # from linked PFMEA" },
                                    { key: 'product_characteristic', label: 'Product Characteristic' },
                                    { key: 'process_characteristic', label: 'Process Characteristic' },
                                    { key: 'special_char_class', label: 'Spec Char Class' },
                                    { key: 'specification_tolerance', label: 'Spec / Tolerance' },
                                    { key: 'evaluation_technique', label: 'Evaluation Technique' },
                                    { key: 'sample_size', label: 'Sample Size' },
                                    { key: 'sample_freq', label: 'Sample Frequency' },
                                    { key: 'control_method', label: 'Control Method' },
                                    { key: 'reaction_plan', label: 'Reaction Plan', fullWidth: true },
                                    {
                                        key: 'linked_wi_id',
                                        label: 'Linked Work Instruction',
                                        type: 'instruction_link',
                                        fullWidth: true,
                                        options: state.workInstructions.map(wi => ({ value: wi.wi_id, label: `${wi.doc_id}: ${wi.title}` })),
                                        onAction: (formData: any) => {
                                            setWiEditorData({
                                                wi_id: `WI-${Date.now()}`,
                                                linked_cp_id: formData.cp_id,
                                                title: `${formData.product_characteristic || 'New Instruction'}`,
                                                doc_id: '',
                                                model_variant: '',
                                                steps: []
                                            } as WorkInstruction);
                                            setShowWiEditor(true);
                                        }
                                    }
                                ]}
                            />
                        )}
                    </>
                );

            case 'TRACEABILITY':
                return (
                    <TraceabilityMatrix
                        dfmeaItems={state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                        pfmeaItems={projectPfmeaItems}
                        controlPlanItems={projectControlPlanItems}
                    />
                );

            case 'SPECIAL_CHARACTERISTICS':
                return (
                    <SpecialCharacteristics
                        dfmeaItems={state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                        pfmeaItems={projectPfmeaItems}
                        controlPlanItems={projectControlPlanItems}
                        workInstructions={state.workInstructions}
                        onNavigateToDfmea={(id) => {
                            const item = state.dfmeaItems.find(i => i.dfmea_id === id);
                            if (item) {
                                setSelectedStructureId(item.structure_element_id);
                                handleNavigate('DFMEA');
                            }
                        }}
                        onNavigateToPfmea={(id) => {
                            const item = state.pfmeaItems.find(i => i.pfmea_id === id);
                            if (item) {
                                setSelectedProcessStep(item.process_step_number);
                                handleNavigate('PFMEA');
                            }
                        }}
                    />
                );

            case 'OPTIMIZATION':
                return (
                    <div className="p-8">
                        <h2 className="text-2xl font-bold mb-4 text-slate-800">Optimization Actions Overview</h2>
                        <p className="text-slate-600 mb-8">Summary of optimization actions across the project.</p>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Actions</h3>
                                <p className="text-4xl font-bold text-slate-800 mt-2">
                                    {state.dfmeaItems.reduce((acc, item) => acc + (item.optimizationActions?.length || 0), 0)}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending High Risk (AP=H)</h3>
                                <p className="text-4xl font-bold text-red-600 mt-2">
                                    {state.dfmeaItems.filter(item => {
                                        const ap = getActionPriority(item.severity_score, item.occurrence_score, item.detection_score);
                                        const hasAction = item.optimizationActions?.some(a => a.status === 'Open' || a.status === 'Closed');
                                        return ap === 'H' && !hasAction;
                                    }).length}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Open Actions</h3>
                                <p className="text-4xl font-bold text-blue-600 mt-2">
                                    {state.dfmeaItems.reduce((acc, item) => acc + (item.optimizationActions?.filter(a => a.status === 'Open').length || 0), 0)}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200 ring-4 ring-orange-50/50">
                                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider">Overdue Actions</h3>
                                <p className="text-4xl font-bold text-orange-700 mt-2">
                                    {[...state.dfmeaItems, ...state.pfmeaItems].reduce((acc, item) => acc + (item.optimizationActions?.filter(a => {
                                        if (a.status === 'Closed') return false;
                                        if (!a.due_date) return false;
                                        return new Date(a.due_date) < new Date();
                                    }).length || 0), 0)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Source</th>
                                        <th className="px-6 py-3">Failure Mode / Requirement</th>
                                        <th className="px-6 py-3">Action</th>
                                        <th className="px-6 py-3">Owner</th>
                                        <th className="px-6 py-3">Due Date</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        ...state.dfmeaItems.flatMap(item => (item.optimizationActions || []).map(action => ({ ...action, failure_mode: item.failure_mode, source_id: item.dfmea_id, source_type: 'DFMEA' as const }))),
                                        ...state.pfmeaItems.flatMap(item => (item.optimizationActions || []).map(action => ({ ...action, failure_mode: item.failure_mode, source_id: item.pfmea_id, source_type: 'PFMEA' as const })))
                                    ].map(action => (
                                        <tr key={action.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        if (action.source_type === 'DFMEA') {
                                                            const item = state.dfmeaItems.find(i => i.dfmea_id === action.source_id);
                                                            if (item) {
                                                                setSelectedStructureId(item.structure_element_id);
                                                                setEditingItem(item);
                                                                setModalType('DFMEA');
                                                                setIsModalOpen(true);
                                                                setState(prev => ({ ...prev, currentView: 'DFMEA' }));
                                                            }
                                                        } else {
                                                            const item = state.pfmeaItems.find(i => i.pfmea_id === action.source_id);
                                                            if (item) {
                                                                setSelectedProcessStep(item.process_step_number);
                                                                setEditingItem(item);
                                                                setModalType('PFMEA');
                                                                setIsModalOpen(true);
                                                                setState(prev => ({ ...prev, currentView: 'PFMEA' }));
                                                            }
                                                        }
                                                    }}
                                                    className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                                                >
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    {action.source_type}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{action.failure_mode}</td>
                                            <td className="px-6 py-4">{action.preventive_measure}</td>
                                            <td className="px-6 py-4">{action.responsible_owner}</td>
                                            <td className="px-6 py-4 font-mono text-xs">
                                                {action.due_date}
                                                {action.status !== 'Closed' && action.due_date && new Date(action.due_date) < new Date() && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">OVERDUE</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold
                                                ${action.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                                                        action.status === 'Closed' ? 'bg-green-100 text-green-800' :
                                                            'bg-slate-100 text-slate-800'}`}>
                                                    {action.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(() => {
                                                    const isOverdue = action.status !== 'Closed' && action.due_date && new Date(action.due_date) < new Date();
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log("Edit clicked for action:", action);
                                                                const sourceId = (action as any).source_id;
                                                                const sourceType = (action as any).source_type;
                                                                if (sourceType === 'DFMEA') {
                                                                    setActiveDfmeaIdForAction(sourceId);
                                                                } else {
                                                                    // For PFMEA, we might need a separate state or just pass the right context
                                                                    setActiveDfmeaIdForAction(sourceId); // Reusing this for simplicity or fix it if it causes issues
                                                                }
                                                                setCurrentOptimizationItem(action);
                                                                setOptimizationModalOpen(true);
                                                            }}
                                                            className={`inline-flex items-center font-medium text-xs border px-3 py-1 rounded transition-colors ${isOverdue
                                                                ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                                : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                                                }`}
                                                        >
                                                            {isOverdue && (
                                                                <svg className="w-3.5 h-3.5 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                            )}
                                                            Edit
                                                        </button>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                    {[...state.dfmeaItems, ...state.pfmeaItems].every(i => !i.optimizationActions?.length) && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No optimization actions found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <Layout
            currentView={state.currentView}
            onNavigate={handleNavigate}
            projectName={activeProject?.part_name}
        >
            <div className="p-6 h-full overflow-auto bg-slate-100/50">
                {renderContent()}

                {/* Global Modals */}
                {optimizationModalOpen && (
                    <OptimizationActionModal
                        isOpen={optimizationModalOpen}
                        onClose={() => setOptimizationModalOpen(false)}
                        onSave={handleOptimizationSave}
                        initialData={currentOptimizationItem || {}}
                        riskMethod={state.riskSettings.method}
                        teamMembers={activeProject?.core_team_members || []}
                        originalS={
                            state.dfmeaItems.find(i => i.dfmea_id === activeDfmeaIdForAction)?.severity_score ||
                            state.dfmeaItems.find(d => d.dfmea_id === state.pfmeaItems.find(p => p.pfmea_id === activeDfmeaIdForAction)?.linked_dfmea_id)?.severity_score
                        }
                        originalO={
                            state.dfmeaItems.find(i => i.dfmea_id === activeDfmeaIdForAction)?.occurrence_score ||
                            state.pfmeaItems.find(i => i.pfmea_id === activeDfmeaIdForAction)?.occurrence_score
                        }
                        originalD={
                            state.dfmeaItems.find(i => i.dfmea_id === activeDfmeaIdForAction)?.detection_score ||
                            state.pfmeaItems.find(i => i.pfmea_id === activeDfmeaIdForAction)?.detection_score
                        }
                    />
                )}

                {showWiEditor && (
                    <WorkInstructionEditor
                        isOpen={showWiEditor}
                        onClose={() => setShowWiEditor(false)}
                        onSave={handleSaveWorkInstruction}
                        initialData={wiEditorData}
                        controlPlanItems={projectControlPlanItems}
                        pfmeaItems={projectPfmeaItems}
                    />
                )}
            </div>

            {viewingWorkInstruction && (
                <DigitalWorkInstruction
                    instruction={viewingWorkInstruction}
                    onClose={() => setViewingWorkInstruction(null)}
                    onGoToControlPlan={handleNavToControlPlan}
                />
            )}
        </Layout>
    );
}

export default App;
