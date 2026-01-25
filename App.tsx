
import React, { useState, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ProjectDashboard } from './components/ProjectDashboard';
import { FmeaTable, RpnBadge, ApBadge } from './components/FmeaTable';
import { TraceabilityMatrix } from './components/TraceabilityMatrix';
import { StructureVisualizer } from './components/StructureVisualizer';
import { ExplodedView } from './components/ExplodedView';
import { ProcessFlowVisualizer } from './components/ProcessFlowVisualizer';
import { ProjectSettings } from './components/ProjectSettings';
import { AdminSettings } from './components/AdminSettings';
import { DigitalWorkInstruction } from './components/DigitalWorkInstruction';
import { 
  ProjectMaster, DfmeaItem, PfmeaItem, ControlPlanItem, StructureElement, ViewMode,
  AppState, ProjectDiagram, ExplodedViewBox, RiskSettings, WorkInstruction
} from './types';
import { 
    MOCK_PROJECTS, MOCK_DFMEA, MOCK_PFMEA, MOCK_CONTROL_PLAN, 
    MOCK_STRUCTURE_ELEMENTS, DEFAULT_RISK_SETTINGS, 
    MOCK_BUSINESS_AREAS, MOCK_LOCATIONS, MOCK_WORK_INSTRUCTIONS,
    MOCK_BUSINESS_AREA_LOCATION_MAP
} from './constants';

export default function App() {
  // --- State ---
  const [state, setState] = useState<AppState>({
    projects: MOCK_PROJECTS,
    structureElements: MOCK_STRUCTURE_ELEMENTS,
    dfmeaItems: MOCK_DFMEA,
    pfmeaItems: MOCK_PFMEA,
    controlPlanItems: MOCK_CONTROL_PLAN,
    projectDiagrams: {},
    workInstructions: MOCK_WORK_INSTRUCTIONS,
    selectedProjectId: null,
    currentView: 'DASHBOARD',
    riskSettings: DEFAULT_RISK_SETTINGS,
    businessAreas: MOCK_BUSINESS_AREAS,
    locations: MOCK_LOCATIONS,
    businessAreaLocationMap: MOCK_BUSINESS_AREA_LOCATION_MAP
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // Generic holder for edit form
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedProcessStep, setSelectedProcessStep] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'PROJECT' | 'STRUCTURE' | 'DFMEA' | 'PFMEA' | 'CP' | 'PROCESS_STEP' | null>(null);
  
  // State for Work Instruction View
  const [viewingWorkInstruction, setViewingWorkInstruction] = useState<WorkInstruction | null>(null);

  // State for pending new element drop on diagram
  const [pendingDiagramDrop, setPendingDiagramDrop] = useState<{x: number, y: number} | null>(null);

  // --- Derived State ---
  const activeProject = state.projects.find(p => p.project_id === state.selectedProjectId);
  
  // Filter structure elements by project
  const projectStructureElements = useMemo(() => 
    state.structureElements.filter(e => e.project_id === state.selectedProjectId),
    [state.structureElements, state.selectedProjectId]
  );

  // Get current project diagram or default
  const currentDiagram: ProjectDiagram = (state.selectedProjectId && state.projectDiagrams[state.selectedProjectId]) || {
    imageUrl: null,
    boxes: []
  };

  // Filter DFMEA items by project AND structure selection
  const filteredDfmea = useMemo(() => {
    let items = state.dfmeaItems.filter(i => i.project_id === state.selectedProjectId);
    if (selectedStructureId) {
      items = items.filter(i => i.structure_element_id === selectedStructureId);
    }
    return items;
  }, [state.dfmeaItems, state.selectedProjectId, selectedStructureId]);
  
  const filteredPfmea = useMemo(() => {
    let items = state.pfmeaItems.filter(i => i.project_id === state.selectedProjectId);
    if (selectedProcessStep !== null) {
        items = items.filter(i => i.process_step_number === selectedProcessStep);
    }
    return items.sort((a,b) => a.process_step_number - b.process_step_number);
  }, [state.pfmeaItems, state.selectedProjectId, selectedProcessStep]);
  
  const filteredControlPlan = useMemo(() => {
    // Get all PFMEA IDs for current project
    const pfmeaIds = filteredPfmea.map(p => p.pfmea_id);
    return state.controlPlanItems.filter(c => pfmeaIds.includes(c.pfmea_link_id));
  }, [state.controlPlanItems, filteredPfmea]);


  // --- Helper Functions ---
  const getActionPriority = (s: number, o: number, d: number): 'H' | 'M' | 'L' => {
    const rules = state.riskSettings.apLogic || [];
    
    // Evaluate rules in order
    for (const rule of rules) {
        if (
            s >= rule.sMin && s <= rule.sMax &&
            o >= rule.oMin && o <= rule.oMax &&
            d >= rule.dMin && d <= rule.dMax
        ) {
            return rule.result;
        }
    }
    
    // Default to Low if no rule matches
    return 'L';
  };

  // Failure Chain Helpers
  const getStructureElement = (id: string | null) => projectStructureElements.find(e => e.element_id === id);
  
  const getHigherLevelFailures = (currentStructId: string | null) => {
    if (!currentStructId) return [];
    const currentEl = getStructureElement(currentStructId);
    if (!currentEl || !currentEl.parent_element_id) return [];
    
    // Find all DFMEA items belonging to the parent element
    const parentItems = state.dfmeaItems.filter(i => i.structure_element_id === currentEl.parent_element_id);
    // Return unique failure modes
    return Array.from(new Set(parentItems.map(i => i.failure_mode))).map(mode => {
        const item = parentItems.find(i => i.failure_mode === mode);
        return { label: `[Parent: ${getStructureElement(currentEl.parent_element_id)?.element_title}] ${mode}`, value: item?.failure_mode_id || mode, text: mode };
    });
  };

  const getLowerLevelFailures = (currentStructId: string | null) => {
      if (!currentStructId) return [];
      
      // Find children elements
      const childrenEls = projectStructureElements.filter(e => e.parent_element_id === currentStructId);
      const childrenIds = childrenEls.map(e => e.element_id);
      
      const childItems = state.dfmeaItems.filter(i => i.structure_element_id && childrenIds.includes(i.structure_element_id));
       // Return unique failure modes
       return Array.from(new Set(childItems.map(i => i.failure_mode))).map(mode => {
        const item = childItems.find(i => i.failure_mode === mode);
        const el = getStructureElement(item?.structure_element_id || null);
        return { label: `[Child: ${el?.element_title}] ${mode}`, value: item?.failure_mode_id || mode, text: mode };
    });
  };

  const getExistingFunctions = (currentStructId: string | null) => {
      const items = state.dfmeaItems.filter(i => i.structure_element_id === currentStructId);
      return Array.from(new Set(items.map(i => i.item_function)));
  };

  const handleAddFailureModeFromItem = (item: DfmeaItem) => {
      setEditingItem({
          structure_element_id: item.structure_element_id,
          item_function: item.item_function,
          requirement: item.requirement,
          // Clear specific failure details
          dfmea_id: null,
          failure_mode: '',
          failure_mode_id: null,
          effect_of_failure: '',
          potential_cause: '',
          severity_score: 1, 
          occurrence_score: 1,
          detection_score: 1,
          classification: 'None'
      });
      setModalType('DFMEA');
      setIsModalOpen(true);
  };
  
  const handleAddSuggestedElements = (elements: Partial<StructureElement>[]) => {
      if (!state.selectedProjectId) return;
      
      const newElements: StructureElement[] = elements.map((el, idx) => ({
          element_id: `STR-${Date.now()}-${idx}`,
          project_id: state.selectedProjectId!,
          element_title: el.element_title || 'New Element',
          description: el.description || '',
          specification: el.specification || '',
          category: (el.category as any) || 'Component',
          parent_element_id: null
      }));

      setState(prev => ({
          ...prev,
          structureElements: [...prev.structureElements, ...newElements]
      }));
  };

  // --- Actions ---
  const handleSelectProject = (id: string) => {
    setState(prev => ({ ...prev, selectedProjectId: id, currentView: 'DFMEA' }));
    setSelectedStructureId(null);
    setSelectedProcessStep(null);
  };

  const handleNavigate = (view: ViewMode) => {
    if (view === 'DASHBOARD') {
      setState(prev => ({ ...prev, selectedProjectId: null, currentView: view }));
    } else {
      setState(prev => ({ ...prev, currentView: view }));
    }
  };

  const handleAddProject = (project: ProjectMaster) => {
    setState(prev => ({ ...prev, projects: [...prev.projects, project] }));
  };
  
  const handleDeleteProject = (id: string) => {
      if(window.confirm("Are you sure? This will hide linked FMEAs for this demo.")) {
          setState(prev => ({...prev, projects: prev.projects.filter(p => p.project_id !== id)}));
      }
  }

  // Diagram Actions
  const handleUploadImage = (dataUrl: string) => {
    if (!state.selectedProjectId) return;
    setState(prev => ({
        ...prev,
        projectDiagrams: {
            ...prev.projectDiagrams,
            [prev.selectedProjectId!]: {
                ...currentDiagram,
                imageUrl: dataUrl
            }
        }
    }));
  };

  const handleAddBox = (box: ExplodedViewBox) => {
    if (!state.selectedProjectId) return;
    setState(prev => ({
        ...prev,
        projectDiagrams: {
            ...prev.projectDiagrams,
            [prev.selectedProjectId!]: {
                ...currentDiagram,
                boxes: [...currentDiagram.boxes, box]
            }
        }
    }));
  };

  const handleRemoveBox = (boxId: string) => {
      if (!state.selectedProjectId) return;
      setState(prev => ({
        ...prev,
        projectDiagrams: {
            ...prev.projectDiagrams,
            [prev.selectedProjectId!]: {
                ...currentDiagram,
                boxes: currentDiagram.boxes.filter(b => b.id !== boxId)
            }
        }
    }));
  };

  const handleBoxDropNew = (x: number, y: number) => {
      setPendingDiagramDrop({ x, y });
      setEditingItem({});
      setModalType('STRUCTURE');
      setIsModalOpen(true);
  };

  const handleUpdateStructureElement = (updatedElement: StructureElement) => {
    setState(prev => ({
      ...prev,
      structureElements: prev.structureElements.map(e =>
        e.element_id === updatedElement.element_id ? updatedElement : e
      )
    }));
  };

  const handleAddProcessStep = () => {
      const maxStep = Math.max(0, ...state.pfmeaItems
        .filter(i => i.project_id === state.selectedProjectId)
        .map(i => i.process_step_number));
      
      setEditingItem({ process_step_number: maxStep + 10 });
      setModalType('PROCESS_STEP');
      setIsModalOpen(true);
  };

  const handleEditProcessStep = (stepNumber: number) => {
      // Find the first item with this step number to populate fields
      const item = state.pfmeaItems.find(i => i.project_id === state.selectedProjectId && i.process_step_number === stepNumber);
      if (item) {
          setEditingItem({ ...item }); // We only care about step number and function/req
          setModalType('PROCESS_STEP');
          setIsModalOpen(true);
      }
  };
  
  const handleDeleteProcessStep = (stepNumber: number) => {
      if (!window.confirm(`Are you sure you want to delete Step ${stepNumber} and all its Failure Modes?`)) return;
      
      setState(prev => ({
          ...prev,
          pfmeaItems: prev.pfmeaItems.filter(i => 
              // Keep item if it's NOT (current project AND matching step number)
              !(i.project_id === state.selectedProjectId && i.process_step_number === stepNumber)
          )
      }));
      
      if (selectedProcessStep === stepNumber) setSelectedProcessStep(null);
  };

  // Generic Handlers for Form Submission
  const handleDeleteItem = (type: 'STRUCTURE' | 'DFMEA' | 'PFMEA' | 'CP', id: string) => {
      if(!window.confirm("Delete item? This action cannot be undone.")) return;
      
      if (type === 'STRUCTURE') {
        setState(prev => ({
            ...prev, 
            structureElements: prev.structureElements.filter(i => i.element_id !== id),
            // Also remove any diagram boxes linked to this element
            projectDiagrams: state.selectedProjectId ? {
                ...prev.projectDiagrams,
                [state.selectedProjectId]: {
                    ...currentDiagram,
                    boxes: currentDiagram.boxes.filter(b => b.structure_element_id !== id)
                }
            } : prev.projectDiagrams
        }));
        if (selectedStructureId === id) setSelectedStructureId(null);
      } else if (type === 'DFMEA') {
          setState(prev => ({...prev, dfmeaItems: prev.dfmeaItems.filter(i => i.dfmea_id !== id)}));
      } else if (type === 'PFMEA') {
          setState(prev => ({...prev, pfmeaItems: prev.pfmeaItems.filter(i => i.pfmea_id !== id)}));
      } else {
          setState(prev => ({...prev, controlPlanItems: prev.controlPlanItems.filter(i => i.cp_id !== id)}));
      }
  };

  const handleOpenWorkInstruction = (cpId: string) => {
      const instruction = state.workInstructions.find(wi => wi.linked_cp_id === cpId);
      if (instruction) {
          setViewingWorkInstruction(instruction);
      }
  };

  // --- Render Helpers ---

  const GenericModal = ({ title, fields, onSubmit, initialData }: any) => {
    const [formData, setFormData] = useState(initialData || {});

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

        setFormData((prev: any) => ({...prev, ...updates}));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="p-6 grid grid-cols-2 gap-4">
                    {fields.map((field: any) => {
                        // Render Datalist for fields with suggestions
                        if (field.type === 'text' && field.suggestions) {
                             return (
                                <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                                    <div className="flex space-x-2">
                                        <select 
                                            className="w-1/3 border-slate-300 rounded-md shadow-sm border p-2 text-xs"
                                            value={formData[field.linkKey] || ''}
                                            onChange={(e) => {
                                                const selectedOption = field.options.find((o:any) => o.value === e.target.value);
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

                        return (
                        <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
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
    switch(state.currentView) {
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
            onUpdateBusinessAreas={(areas) => setState(prev => ({...prev, businessAreas: areas}))}
            onUpdateLocations={(locs) => setState(prev => ({...prev, locations: locs}))}
            onUpdateAssociations={(updatedMap) => setState(prev => ({...prev, businessAreaLocationMap: updatedMap}))}
        />;

      case 'PROJECT_SETTINGS':
        if (!activeProject) return <div>No project selected</div>;
        return <ProjectSettings 
            project={activeProject}
            riskSettings={state.riskSettings}
            businessAreas={state.businessAreas}
            locations={state.locations}
            businessAreaLocationMap={state.businessAreaLocationMap}
            onUpdateProject={(updated) => {
                setState(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.project_id === updated.project_id ? updated : p)
                }));
            }}
            onUpdateRiskSettings={(settings) => {
                setState(prev => ({...prev, riskSettings: settings}));
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {state.workInstructions.map(wi => (
                        <div key={wi.wi_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="h-40 bg-slate-100 relative">
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
                            <div className="p-5">
                                <div className="text-xs text-slate-500 font-mono mb-1">{wi.doc_id}</div>
                                <h3 className="font-bold text-lg text-slate-800 mb-2">{wi.title}</h3>
                                <div className="flex items-center justify-between mt-4">
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
                        </div>
                    ))}
                    
                    {state.workInstructions.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-slate-500">No Work Instructions available.</p>
                            <p className="text-xs text-slate-400 mt-1">Create one from the Control Plan view.</p>
                        </div>
                    )}
                </div>
            </div>
        );

      case 'DFMEA':
        // Prepare Failure Chain Options for the currently selected structure
        const higherLevelFailures = getHigherLevelFailures(selectedStructureId);
        const lowerLevelFailures = getLowerLevelFailures(selectedStructureId);
        const existingFunctions = getExistingFunctions(selectedStructureId);

        return (
          <div className="space-y-6">
            <ExplodedView 
                diagram={currentDiagram}
                structureElements={projectStructureElements}
                onUploadImage={handleUploadImage}
                onAddBox={handleAddBox}
                onRemoveBox={handleRemoveBox}
                onBoxDropNew={handleBoxDropNew}
                onAddSuggestedElements={handleAddSuggestedElements}
            />

            <StructureVisualizer
                projectName={activeProject?.part_name || "Project"}
                elements={projectStructureElements}
                selectedElementId={selectedStructureId}
                onSelectElement={setSelectedStructureId}
                onAddElement={() => { setEditingItem({}); setModalType('STRUCTURE'); setIsModalOpen(true); }}
                onEditElement={(el) => { setEditingItem(el); setModalType('STRUCTURE'); setIsModalOpen(true); }}
                onDeleteElement={(id) => handleDeleteItem('STRUCTURE', id)}
                onUpdateElement={handleUpdateStructureElement}
            />

            <FmeaTable<DfmeaItem>
              title={selectedStructureId 
                ? `Design FMEA for: ${projectStructureElements.find(e => e.element_id === selectedStructureId)?.element_title}` 
                : "Design FMEA (All Items)"}
              colorTheme="blue"
              data={filteredDfmea}
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
                { key: 'effect_of_failure', label: 'Effect (Higher Level)', render: i => (
                    <div>
                        <div className="text-sm">{i.effect_of_failure}</div>
                        {i.linked_parent_failure_id && <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">Linked</span>}
                    </div>
                )},
                { key: 'potential_cause', label: 'Cause (Lower Level)', render: i => (
                    <div>
                        <div className="text-sm">{i.potential_cause}</div>
                        {i.linked_child_failure_id && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded border border-emerald-200">Linked</span>}
                    </div>
                )},
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
                    onSubmit={(data: any) => {
                        const newItem = {
                            ...data,
                            project_id: state.selectedProjectId,
                            element_id: data.element_id || `STR-${Date.now()}`,
                            parent_element_id: data.parent_element_id === '' ? null : data.parent_element_id
                        };
                        
                        setState(prev => {
                            const exists = prev.structureElements.find(i => i.element_id === newItem.element_id);
                            
                            // If this was a drag-and-drop creation, add the box to the diagram
                            let updatedDiagrams = prev.projectDiagrams;
                            if (pendingDiagramDrop && !exists && state.selectedProjectId) {
                                updatedDiagrams = {
                                    ...prev.projectDiagrams,
                                    [state.selectedProjectId]: {
                                        ...currentDiagram,
                                        boxes: [...currentDiagram.boxes, {
                                            id: `BOX-${Date.now()}`,
                                            structure_element_id: newItem.element_id,
                                            x: pendingDiagramDrop.x,
                                            y: pendingDiagramDrop.y
                                        }]
                                    }
                                }
                            }

                            return {
                                ...prev,
                                structureElements: exists 
                                    ? prev.structureElements.map(i => i.element_id === newItem.element_id ? newItem : i)
                                    : [...prev.structureElements, newItem],
                                projectDiagrams: updatedDiagrams
                            };
                        });
                        setIsModalOpen(false);
                        setPendingDiagramDrop(null);
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
                    onSubmit={(data: any) => {
                        const s = Number(data.severity_score) || 1;
                        const o = Number(data.occurrence_score) || 1;
                        const d = Number(data.detection_score) || 1;
                        const newItem = {
                            ...data,
                            severity_score: s, occurrence_score: o, detection_score: d,
                            rpn: s * o * d,
                            project_id: state.selectedProjectId,
                            dfmea_id: data.dfmea_id || `DF-${Date.now()}`,
                            failure_mode_id: data.failure_mode_id || `FM-${Date.now()}` // Ensure FM ID
                        };
                        
                        setState(prev => {
                            const exists = prev.dfmeaItems.find(i => i.dfmea_id === newItem.dfmea_id);
                            return {
                                ...prev,
                                dfmeaItems: exists 
                                    ? prev.dfmeaItems.map(i => i.dfmea_id === newItem.dfmea_id ? newItem : i)
                                    : [...prev.dfmeaItems, newItem]
                            };
                        });
                        setIsModalOpen(false);
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
                        { key: 'classification', label: 'Classification', options: [{value: 'CC', label: 'Critical'}, {value: 'SC', label: 'Significant'}, {value: 'None', label: 'None'}], type: 'select' },
                        
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
              data={filteredPfmea}
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
                        if(!hasCP) return <span className="text-slate-300 text-xs text-center block">-</span>;
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
             {/* ... PFMEA and PROCESS_STEP modals ... */}
             {isModalOpen && modalType === 'PFMEA' && (
                <GenericModal
                    title={editingItem.pfmea_id ? "Edit PFMEA Item" : "New PFMEA Item"}
                    initialData={editingItem}
                    onSubmit={(data: any) => {
                        const newItem = {
                            ...data,
                            project_id: state.selectedProjectId,
                            pfmea_id: data.pfmea_id || `PF-${Date.now()}`
                        };
                        setState(prev => {
                            const exists = prev.pfmeaItems.find(i => i.pfmea_id === newItem.pfmea_id);
                            return {
                                ...prev,
                                pfmeaItems: exists 
                                    ? prev.pfmeaItems.map(i => i.pfmea_id === newItem.pfmea_id ? newItem : i)
                                    : [...prev.pfmeaItems, newItem]
                            };
                        });
                        setIsModalOpen(false);
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
                                            process_requirement: data.process_requirement
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
                                    detection_score: 1
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
                    ]}
                />
            )}
          </>
        );

      case 'CONTROL_PLAN':
        // ... existing CONTROL_PLAN code ...
        const processStepOptions = Array.from(new Set(state.pfmeaItems
            .filter(i => i.project_id === state.selectedProjectId)
            .map(i => i.process_step_number)))
            .sort((a: number, b: number) => a - b)
            .map(n => ({ value: n.toString(), label: `OP ${n}` }));

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
                : "Control Plan (All Steps)"}
              colorTheme="indigo"
              data={filteredControlPlan}
              renderRowActions={(item) => {
                  const hasWI = state.workInstructions.some(wi => wi.linked_cp_id === item.cp_id);
                  if (hasWI) {
                      return (
                          <button 
                            onClick={() => handleOpenWorkInstruction(item.cp_id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm transition-colors mr-2 flex items-center"
                          >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              View WI
                          </button>
                      );
                  }
                  return null;
              }}
              onAdd={() => { 
                  setEditingItem({
                      part_process_number: selectedProcessStep ? selectedProcessStep.toString() : ''
                  }); 
                  setModalType('CP'); 
                  setIsModalOpen(true); 
              }}
              onEdit={(item) => { setEditingItem(item); setModalType('CP'); setIsModalOpen(true); }}
              onDelete={(id) => handleDeleteItem('CP', id)}
              columns={[
                { key: 'part_process_number', label: 'Step #' },
                { key: 'product_characteristic', label: 'Prod. Char' },
                { key: 'process_characteristic', label: 'Proc. Char' },
                { key: 'special_char_class', label: 'Class' },
                { key: 'specification_tolerance', label: 'Spec/Tol' },
                { key: 'evaluation_technique', label: 'Eval Tech' },
                { key: 'sample_size', label: 'Size' },
                { key: 'sample_freq', label: 'Freq' },
                { key: 'reaction_plan', label: 'Reaction', render: i => <span className="text-red-600 font-medium text-xs">{i.reaction_plan}</span> },
                { key: 'actions', label: '' }
              ]}
            />
            {isModalOpen && modalType === 'CP' && (
                <GenericModal
                    title={editingItem.cp_id ? "Edit Control Plan" : "New Control Plan Item"}
                    initialData={editingItem}
                    onSubmit={(data: any) => {
                        const newItem = {
                            ...data,
                            cp_id: data.cp_id || `CP-${Date.now()}`
                        };
                        setState(prev => {
                            const exists = prev.controlPlanItems.find(i => i.cp_id === newItem.cp_id);
                            return {
                                ...prev,
                                controlPlanItems: exists 
                                    ? prev.controlPlanItems.map(i => i.cp_id === newItem.cp_id ? newItem : i)
                                    : [...prev.controlPlanItems, newItem]
                            };
                        });
                        setIsModalOpen(false);
                    }}
                    fields={[
                        { 
                            key: 'pfmea_link_id', 
                            label: 'Link to PFMEA (Golden Thread)', 
                            type: 'select', 
                            fullWidth: true, 
                            options: filteredPfmea.map(p => ({ value: p.pfmea_id, label: `Step ${p.process_step_number}: ${p.failure_mode}` })),
                            onChangeEffect: (id: string) => {
                                const pfmeaItem = state.pfmeaItems.find(p => p.pfmea_id === id);
                                if (pfmeaItem) {
                                    return {
                                        part_process_number: pfmeaItem.process_step_number.toString(),
                                        product_characteristic: pfmeaItem.failure_mode,
                                        process_characteristic: pfmeaItem.failure_cause,
                                        specification_tolerance: pfmeaItem.process_requirement
                                    };
                                }
                                return {};
                            }
                        },
                        { key: 'part_process_number', label: 'Process #', type: 'select', options: processStepOptions, required: true },
                        { key: 'product_characteristic', label: 'Product Characteristic' },
                        { key: 'process_characteristic', label: 'Process Characteristic' },
                        { key: 'special_char_class', label: 'Class', options: [{value: 'CC', label: 'Critical'}, {value: 'SC', label: 'Significant'}] , type: 'select'},
                        { key: 'specification_tolerance', label: 'Spec/Tolerance' },
                        { key: 'evaluation_technique', label: 'Eval Technique' },
                        { key: 'sample_size', label: 'Sample Size' },
                        { key: 'sample_freq', label: 'Frequency' },
                        { key: 'control_method', label: 'Control Method' },
                        { key: 'reaction_plan', label: 'Reaction Plan', fullWidth: true }
                    ]}
                />
            )}
             {/* Reuse Process Step Modal logic for CP view editing */}
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
                                            process_requirement: data.process_requirement
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
                                    detection_score: 1
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
                    ]}
                />
            )}
          </>
        );

      case 'TRACEABILITY':
        return (
          <TraceabilityMatrix 
            dfmeaItems={filteredDfmea}
            pfmeaItems={filteredPfmea}
            controlPlanItems={filteredControlPlan}
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
      {/* RiskSettingsModal removed - functionality moved to ProjectSettings */}
      {renderContent()}
      
      {viewingWorkInstruction && (
          <DigitalWorkInstruction 
            instruction={viewingWorkInstruction}
            onClose={() => setViewingWorkInstruction(null)}
          />
      )}
    </Layout>
  );
}
