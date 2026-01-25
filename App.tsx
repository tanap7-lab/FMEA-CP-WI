
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

import {
    ProjectMaster, DfmeaItem, PfmeaItem, ControlPlanItem, StructureElement,
    RiskSettings, WorkInstruction, ViewMode, ProjectDiagram, ExplodedViewBox
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
            }
        };

        loadData();
    }, []);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'STRUCTURE' | 'DFMEA' | 'PFMEA' | 'PROCESS_STEP' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
    const [selectedDfmeaId, setSelectedDfmeaId] = useState<string | null>(null);
    const [selectedProcessStep, setSelectedProcessStep] = useState<number | null>(null);
    const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
    const [pendingDiagramDrop, setPendingDiagramDrop] = useState<{ diagramId: string, x: number, y: number } | null>(null);

    // Work Instruction UI
    const [showWiEditor, setShowWiEditor] = useState(false);
    const [viewingWorkInstruction, setViewingWorkInstruction] = useState<WorkInstruction | null>(null);

    const activeProject = state.selectedProjectId ? state.projects.find(p => p.project_id === state.selectedProjectId) : null;
    const projectStructureElements = state.structureElements.filter(e => e.project_id === state.selectedProjectId);
    const projectDiagrams = state.selectedProjectId ? (state.projectDiagrams[state.selectedProjectId] || []) : [];
    const currentDiagrams = projectDiagrams;
    const activeDiagram = currentDiagrams.find(d => d.id === selectedDiagramId) || null;
    const filteredDfmea = state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId && (!selectedStructureId || i.structure_element_id === selectedStructureId));
    const filteredPfmea = state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId && (selectedProcessStep === null || i.process_step_number === selectedProcessStep));
    const projectPfmeaItems = state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId);
    const projectControlPlanItems = state.controlPlanItems.filter(cp =>
        projectPfmeaItems.some(pf => pf.pfmea_id === cp.pfmea_link_id)
    );

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

    const handleDeleteItem = async (type: 'STRUCTURE' | 'DFMEA' | 'PFMEA', id: string) => {
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
            }
        } catch (error) {
            console.error("Failed to delete item", error);
            alert("Failed to delete item");
        }
    };

    // ... (Helper functions remain unchanged) ...

    const handleSaveWorkInstruction = async (wi: WorkInstruction) => {
        try {
            const saved = await api.updateWorkInstruction(wi.wi_id, wi);
            setState(prev => {
                const exists = prev.workInstructions.find(w => w.wi_id === wi.wi_id);
                return {
                    ...prev,
                    workInstructions: exists
                        ? prev.workInstructions.map(w => w.wi_id === wi.wi_id ? saved : w)
                        : [...prev.workInstructions, saved]
                };
            });
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
            console.log("App: Adding suggested elements", elements);
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
            console.log("App: Successfully added suggested elements");
        } catch (error) {
            console.error("App: Failed to add suggested elements", error);
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

    const handleDeleteWorkInstruction = (id: string) => {
        if (window.confirm("Delete this Work Instruction?")) {
            setState(prev => ({ ...prev, workInstructions: prev.workInstructions.filter(w => w.wi_id !== id) }));
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

    // Highlights calculation for FMEA Table
    const dfmeaHighlights: Record<string, 'focus' | 'parent' | 'child'> = {};
    if (selectedDfmeaId) {
        dfmeaHighlights[selectedDfmeaId] = 'focus';
        const selectedItem = state.dfmeaItems.find(i => i.dfmea_id === selectedDfmeaId);
        if (selectedItem) {
            if (selectedItem.linked_parent_failure_id) dfmeaHighlights[selectedItem.linked_parent_failure_id] = 'parent';
            if (selectedItem.linked_child_failure_id) dfmeaHighlights[selectedItem.linked_child_failure_id] = 'child';

            // Also check reverse links (if other items point to this one)
            state.dfmeaItems.forEach(i => {
                if (i.linked_child_failure_id === selectedItem.dfmea_id) dfmeaHighlights[i.dfmea_id] = 'parent'; // They are parent to me
                if (i.linked_parent_failure_id === selectedItem.dfmea_id) dfmeaHighlights[i.dfmea_id] = 'child'; // They are child to me
            });
        }
    }

    const handleAiSuggest = async (key: string, context: any) => {
        try {
            const apiKey = process.env.GEMINI_API_KEY || (window as any).GEMINI_API_KEY;
            console.log("AI Suggest: Using API Key (start):", apiKey ? `${apiKey.substring(0, 5)}...` : "NOT FOUND");

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

    const GenericModal = ({ title, fields, onSubmit, initialData, onAiSuggest }: any) => {
        const [formData, setFormData] = useState(initialData || {});
        const [isAiLoading, setIsAiLoading] = useState<string | null>(null);

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

        // Handle updates, including side effects for linked fields
        const handleChange = (key: string, value: any, extraData?: any) => {
            let updates: any = { [key]: value };

            // If updating a "Link" dropdown, also update the text description field
            if (extraData?.textField) {
                updates[extraData.textField] = extraData.textValue;
            }

            // Side effect handler
            const fieldConfig = fields.find((f: any) => f.key === key || f.linkKey === key);
            if (fieldConfig && fieldConfig.onChangeEffect) {
                const sideEffects = fieldConfig.onChangeEffect(value);
                updates = { ...updates, ...sideEffects };
            }

            setFormData((prev: any) => ({ ...prev, ...updates }));
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-bold">{title}</h3>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="p-6 grid grid-cols-2 gap-4">
                        {fields.map((field: any) => {
                            const LabelWithAi = () => (
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                                    {field.aiSuggest && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiClick(field)}
                                            disabled={isAiLoading === field.key}
                                            className={`flex items-center text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isAiLoading === field.key
                                                ? 'bg-indigo-50 text-indigo-400 border-indigo-100'
                                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                                                }`}
                                            title="AI: Propose parameters"
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
                            );

                            // Render Datalist for fields with suggestions
                            if (field.type === 'text' && field.suggestions) {
                                return (
                                    <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                                        <LabelWithAi />
                                        <input
                                            list={`${field.key}-list`}
                                            type="text"
                                            className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                            value={formData[field.key] || ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            required={field.required}
                                            placeholder={field.placeholder}
                                        />
                                        <datalist id={`${field.key}-list`}>
                                            {field.suggestions.map((s: string) => <option key={s} value={s} />)}
                                        </datalist>
                                    </div>
                                )
                            }

                            // Special Link Selector + Text Input Combination
                            if (field.type === 'link_selector') {
                                return (
                                    <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                                        <LabelWithAi />
                                        <div className="flex space-x-2">
                                            <select
                                                className="w-1/3 border-slate-300 rounded-md shadow-sm border p-2 text-xs"
                                                value={formData[field.linkKey] || ''}
                                                onChange={(e) => {
                                                    const selectedOption = field.options.find((o: any) => o.value === e.target.value);
                                                    handleChange(field.linkKey, e.target.value, {
                                                        textField: field.textKey,
                                                        textValue: selectedOption ? selectedOption.text : ''
                                                    });
                                                }}
                                            >
                                                <option value="">Select Existing...</option>
                                                {field.options.map((o: any) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                className="flex-1 border-slate-300 rounded-md shadow-sm border p-2"
                                                value={formData[field.textKey] || ''}
                                                onChange={e => handleChange(field.textKey, e.target.value)}
                                                placeholder="Or type description..."
                                                required={field.required}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">{field.helpText}</p>
                                    </div>
                                );
                            }

                            // Text List (Array of strings)
                            if (field.type === 'text_list') {
                                return (
                                    <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                                        <LabelWithAi />
                                        <div className="space-y-2 border rounded-md p-3 bg-slate-50 border-slate-200">
                                            {(formData[field.key] || []).map((item: string, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 shadow-sm text-sm">
                                                    <span className="text-slate-700 font-mono">{item}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newList = [...(formData[field.key] || [])];
                                                            newList.splice(idx, 1);
                                                            handleChange(field.key, newList);
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 font-bold px-1 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex space-x-2 pt-1">
                                                <input
                                                    id={`input-${field.key}`}
                                                    type="text"
                                                    className="flex-1 border-slate-300 rounded-md shadow-sm border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder={field.placeholder || "Add parameter..."}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) {
                                                                const newList = [...(formData[field.key] || []), val];
                                                                handleChange(field.key, newList);
                                                                e.currentTarget.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById(`input-${field.key}`) as HTMLInputElement;
                                                        const val = input?.value.trim();
                                                        if (val) {
                                                            const newList = [...(formData[field.key] || []), val];
                                                            handleChange(field.key, newList);
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Press Enter to add items.</p>
                                    </div>
                                );
                            }

                            return (
                                <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                                    <LabelWithAi />
                                    {field.type === 'select' ? (
                                        <select
                                            className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                            value={formData[field.key] || ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            required={field.required}
                                        >
                                            <option value="">{field.placeholder || "Select..."}</option>
                                            {field.options.map((o: any) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    ) : field.type === 'textarea' ? (
                                        <textarea
                                            className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                            rows={3}
                                            value={formData[field.key] || ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            required={field.required}
                                        />
                                    ) : field.type === 'number' ? (
                                        <input
                                            type="number"
                                            className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                            value={formData[field.key] || ''}
                                            onChange={e => handleChange(field.key, parseInt(e.target.value))}
                                            required={field.required}
                                            min={field.min} max={field.max}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                            value={formData[field.key] || ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            required={field.required}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div className="col-span-2 flex justify-end space-x-3 mt-4 pt-4 border-t">
                            <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); setModalType(null); setPendingDiagramDrop(null); }} className="px-4 py-2 text-slate-600">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
                        </div>
                    </form>
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
                        console.log("App: onUpdateProject started", updated);
                        try {
                            const saved = await api.updateProject(updated.project_id, updated);
                            console.log("App: onUpdateProject saved response", saved);
                            setState(prev => {
                                const newProjects = prev.projects.map(p => p.project_id === saved.project_id ? saved : p);
                                console.log("App: updating state with new projects list", newProjects);
                                return {
                                    ...prev,
                                    projects: newProjects
                                };
                            });
                        } catch (e) {
                            console.error("App: Failed to update project", e);
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

                        {showWiEditor && (
                            <WorkInstructionEditor
                                isOpen={showWiEditor}
                                onClose={() => setShowWiEditor(false)}
                                onSave={handleSaveWorkInstruction}
                                initialData={editingItem}
                                controlPlanItems={projectControlPlanItems}
                                pfmeaItems={projectPfmeaItems}
                            />
                        )}
                    </div>
                );

            case 'DFMEA':
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
                                { key: 'requirement', label: 'Requirement', width: '15%' },
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
                                { key: 'severity_score', label: 'S', render: (i) => <span className="font-bold text-slate-600" title={state.riskSettings.definitions.severity[i.severity_score]}>{i.severity_score}</span> },
                                { key: 'occurrence_score', label: 'O', render: (i) => <span title={state.riskSettings.definitions.occurrence[i.occurrence_score]}>{i.occurrence_score}</span> },
                                { key: 'detection_score', label: 'D', render: (i) => <span title={state.riskSettings.definitions.detection[i.detection_score]}>{i.detection_score}</span> },
                                {
                                    key: 'rpn',
                                    label: state.riskSettings.method === 'RPN' ? 'RPN' : 'AP',
                                    render: (i) => state.riskSettings.method === 'RPN'
                                        ? <RpnBadge value={i.rpn} thresholds={state.riskSettings.rpnThresholds} />
                                        : <ApBadge value={getActionPriority(i.severity_score, i.occurrence_score, i.detection_score)} />
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
                                    const newItemData = {
                                        ...data,
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
                                fields={[
                                    {
                                        key: 'structure_element_id',
                                        label: 'Parent Structure Element',
                                        type: 'select',
                                        fullWidth: true,
                                        options: projectStructureElements.map(e => ({ value: e.element_id, label: e.element_title })),
                                        required: true
                                    },
                                    {
                                        key: 'item_function',
                                        label: 'Item Function',
                                        required: true,
                                        fullWidth: true,
                                        type: 'text',
                                        suggestions: existingFunctions,
                                        placeholder: "What does this item do? (Type or Select existing)"
                                    },
                                    { key: 'requirement', label: 'Requirement', required: true, fullWidth: true },
                                    { key: 'failure_mode', label: 'Failure Mode', required: true },
                                    { key: 'classification', label: 'Classification', options: [{ value: 'CC', label: 'Critical' }, { value: 'SC', label: 'Significant' }, { value: 'None', label: 'None' }], type: 'select' },

                                    // FAILURE CHAIN: EFFECT
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

                                    // FAILURE CHAIN: CAUSE
                                    {
                                        key: 'cause_chain',
                                        type: 'link_selector',
                                        label: 'Potential Cause (Link to Lower Level)',
                                        linkKey: 'linked_child_failure_id',
                                        textKey: 'potential_cause',
                                        options: lowerLevelFailures,
                                        helpText: "Select a failure mode from a child element if available.",
                                        fullWidth: true
                                    },

                                    { key: 'severity_score', label: 'Severity (1-10)', type: 'number', min: 1, max: 10, required: true },
                                    { key: 'occurrence_score', label: 'Occurrence (1-10)', type: 'number', min: 1, max: 10, required: true },
                                    { key: 'design_control_prevention', label: 'Prevention Control' },
                                    { key: 'design_control_detection', label: 'Detection Control' },
                                    { key: 'detection_score', label: 'Detection (1-10)', type: 'number', min: 1, max: 10, required: true }
                                ]}
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
                                { key: 'process_function', label: 'Function' },
                                { key: 'process_requirement', label: 'Requirement' },
                                { key: 'failure_mode', label: 'Failure Mode' },
                                { key: 'failure_cause', label: 'Cause' },
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
                                { key: 'actions', label: '' }
                            ]}
                        />
                        {isModalOpen && modalType === 'PFMEA' && (
                            <GenericModal
                                title={editingItem.pfmea_id ? "Edit PFMEA Item" : "New PFMEA Item"}
                                initialData={editingItem}
                                onSubmit={async (data: any) => {
                                    const newItemData = {
                                        ...data,
                                        project_id: state.selectedProjectId,
                                        pfmea_id: data.pfmea_id || `PF-${Date.now()}`
                                    };

                                    try {
                                        if (editingItem.pfmea_id) {
                                            const saved = await api.updatePfmeaItem(newItemData.pfmea_id, newItemData);
                                            setState(prev => ({
                                                ...prev,
                                                pfmeaItems: prev.pfmeaItems.map(i => i.pfmea_id === saved.pfmea_id ? saved : i)
                                            }));
                                        } else {
                                            const saved = await api.createPfmeaItem(newItemData);
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
                                fields={[
                                    { key: 'linked_dfmea_id', label: 'Link to DFMEA Requirement (Golden Thread)', type: 'select', fullWidth: true, options: state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId).map(d => ({ value: d.dfmea_id, label: `${d.requirement} (${d.classification})` })) },
                                    { key: 'process_step_number', label: 'Step Number', type: 'number', required: true },
                                    { key: 'process_function', label: 'Process Function', required: true },
                                    { key: 'process_requirement', label: 'Process Requirement', required: true },
                                    { key: 'failure_mode', label: 'Failure Mode', required: true },
                                    { key: 'failure_cause', label: 'Failure Cause', required: true },
                                    { key: 'prevention_control', label: 'Prevention Control' },
                                    { key: 'detection_control', label: 'Detection Control' },
                                    { key: 'occurrence_score', label: 'Occurrence', type: 'number', min: 1, max: 10 },
                                    { key: 'detection_score', label: 'Detection', type: 'number', min: 1, max: 10 }
                                ]}
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
                                                        process_function: data.process_function,
                                                        process_requirement: data.process_requirement,
                                                        process_specifications: data.process_specifications
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
                                    { key: 'process_specifications', label: 'Process Specifications / Parameters', type: 'text_list', fullWidth: true, placeholder: "e.g. Temp: 200°C", aiSuggest: true }
                                ]}
                                onAiSuggest={handleAiSuggest}
                            />
                        )}
                    </>
                );

            case 'CONTROL_PLAN':
                return (
                    <FmeaTable<ControlPlanItem>
                        title="Control Plan"
                        colorTheme="indigo"
                        idKey="cp_id"
                        data={projectControlPlanItems}
                        customActions={<SearchBar />}
                        onAdd={() => { alert("Control Plans are typically generated from PFMEA. Add one there!"); }}
                        onEdit={(item) => alert("Edit not implemented in demo")}
                        onDelete={(id) => alert("Delete not implemented in demo")}
                        columns={[
                            { key: 'part_process_number', label: 'Step', width: '50px' },
                            { key: 'product_characteristic', label: 'Product Char.' },
                            { key: 'process_characteristic', label: 'Process Char.' },
                            { key: 'specification_tolerance', label: 'Spec / Tolerance' },
                            { key: 'evaluation_technique', label: 'Eval Technique' },
                            { key: 'sample_size', label: 'Size' },
                            { key: 'sample_freq', label: 'Freq' },
                            { key: 'control_method', label: 'Control Method' },
                            { key: 'reaction_plan', label: 'Reaction Plan', render: i => <span className="text-red-600 font-medium">{i.reaction_plan}</span> },
                            { key: 'actions', label: '' }
                        ]}
                    />
                );

            case 'TRACEABILITY':
                return (
                    <TraceabilityMatrix
                        dfmeaItems={state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                        pfmeaItems={state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId)}
                        controlPlanItems={projectControlPlanItems}
                    />
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
