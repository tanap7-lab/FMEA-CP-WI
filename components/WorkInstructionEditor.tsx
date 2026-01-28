
import React, { useState, useEffect, useRef } from 'react';
import { WorkInstruction, WorkInstructionStep, ControlPlanItem, PfmeaItem, ImageOverlay } from '../types';

interface WorkInstructionEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (wi: WorkInstruction) => void;
    initialData?: WorkInstruction | null;
    controlPlanItems: ControlPlanItem[];
    pfmeaItems: PfmeaItem[];
}

// --- Annotation Editor Sub-Component ---
const AnnotationEditor = ({ imageUrl, initialOverlays, onSave, onCancel }: {
    imageUrl: string,
    initialOverlays: ImageOverlay[],
    onSave: (o: ImageOverlay[]) => void,
    onCancel: () => void
}) => {
    const [overlays, setOverlays] = useState<ImageOverlay[]>(initialOverlays || []);
    const [tool, setTool] = useState<'box' | 'circle' | 'arrow' | 'label'>('box');
    const [color, setColor] = useState('#ef4444'); // Default red
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const getCoords = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        // Clamp values to 0-100%
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        return { x, y };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (tool === 'label') return; // Labels are placed on click/mouseup
        setIsDrawing(true);
        const coords = getCoords(e);
        setStartPos(coords);
        setCurrentPos(coords);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        setCurrentPos(getCoords(e));
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const coords = getCoords(e);
        let newOverlay: ImageOverlay | null = null;
        const newId = `ov-${Date.now()}`;

        if (tool === 'label') {
            // Place label on click
            const text = prompt("Enter label text:");
            if (text) {
                setOverlays([...overlays, { id: newId, type: 'label', x: coords.x, y: coords.y, text, color }]);
            }
            return;
        }

        if (isDrawing) {
            setIsDrawing(false);

            if (tool === 'box' || tool === 'circle') {
                const x = Math.min(startPos.x, currentPos.x);
                const y = Math.min(startPos.y, currentPos.y);
                const width = Math.abs(currentPos.x - startPos.x);
                const height = Math.abs(currentPos.y - startPos.y);

                if (width > 2 && height > 2) { // Min size threshold
                    newOverlay = { id: newId, type: tool, x, y, width, height, color };
                }
            } else if (tool === 'arrow') {
                if (Math.abs(currentPos.x - startPos.x) > 2 || Math.abs(currentPos.y - startPos.y) > 2) {
                    newOverlay = { id: newId, type: 'arrow', x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y, color };
                }
            }

            if (newOverlay) {
                setOverlays([...overlays, newOverlay]);
            }
        }
    };

    const renderOverlay = (o: ImageOverlay) => {
        switch (o.type) {
            case 'box': return <div key={o.id} className="absolute border-2 bg-opacity-10 bg-white" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%`, borderColor: o.color }}></div>;
            case 'circle': return <div key={o.id} className="absolute border-2 rounded-full bg-opacity-10 bg-white" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%`, borderColor: o.color }}></div>;
            case 'arrow':
                return (
                    <svg key={o.id} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                        <defs>
                            <marker id={`arrow-${o.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={o.color} />
                            </marker>
                        </defs>
                        <line x1={`${o.x}%`} y1={`${o.y}%`} x2={`${o.x2}%`} y2={`${o.y2}%`} stroke={o.color} strokeWidth="2" markerEnd={`url(#arrow-${o.id})`} />
                    </svg>
                );
            case 'label': return <div key={o.id} className="absolute px-2 py-1 bg-white text-xs border font-bold shadow-sm rounded transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-20" style={{ left: `${o.x}%`, top: `${o.y}%`, borderColor: o.color, color: o.color }}>{o.text}</div>;
            default: return null;
        }
    };

    const renderTempShape = () => {
        if (!isDrawing || tool === 'label') return null;

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        if (tool === 'box') return <div className="absolute border-2 border-dashed bg-white/20" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, borderColor: color }}></div>;
        if (tool === 'circle') return <div className="absolute border-2 border-dashed rounded-full bg-white/20" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, borderColor: color }}></div>;
        if (tool === 'arrow') return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1={`${startPos.x}%`} y1={`${startPos.y}%`} x2={`${currentPos.x}%`} y2={`${currentPos.y}%`} stroke={color} strokeWidth="2" strokeDasharray="4" />
            </svg>
        );
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-lg overflow-hidden flex flex-col h-[90vh]">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Annotate Image</h3>
                        <p className="text-xs text-slate-500">Draw on the image to highlight key areas.</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex bg-white border rounded-lg p-1 space-x-1">
                            {[
                                { id: 'box', icon: <div className="w-4 h-4 border-2 border-current rounded-sm" /> },
                                { id: 'circle', icon: <div className="w-4 h-4 border-2 border-current rounded-full" /> },
                                { id: 'arrow', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-4-4l4 4-4 4" /></svg> },
                                { id: 'label', icon: <span className="font-serif font-bold">T</span> }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTool(t.id as any)}
                                    className={`p-2 rounded hover:bg-slate-100 ${tool === t.id ? 'bg-blue-100 text-blue-600' : 'text-slate-600'}`}
                                    title={t.id.toUpperCase()}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>
                        <div className="h-8 w-px bg-slate-300"></div>
                        <div className="flex space-x-1">
                            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ffffff', '#000000'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setOverlays(prev => prev.slice(0, -1))}
                            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium"
                            disabled={overlays.length === 0}
                        >
                            Undo
                        </button>
                        <button
                            onClick={() => setOverlays([])}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-medium"
                            disabled={overlays.length === 0}
                        >
                            Clear All
                        </button>
                        <div className="h-8 w-px bg-slate-300 mx-2"></div>
                        <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                        <button onClick={() => onSave(overlays)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">
                            Save Annotations
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center">
                    <div
                        ref={containerRef}
                        className="relative shadow-2xl inline-block max-w-full max-h-full cursor-crosshair select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <img src={imageUrl} alt="Annotation Target" className="max-h-[75vh] max-w-full block object-contain pointer-events-none" />
                        {overlays.map(renderOverlay)}
                        {renderTempShape()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const WorkInstructionEditor: React.FC<WorkInstructionEditorProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    controlPlanItems,
    pfmeaItems
}) => {
    const [formData, setFormData] = useState<Partial<WorkInstruction>>({
        title: '',
        doc_id: '',
        model_variant: '',
        linked_cp_id: '',
        steps: []
    });

    // Track which step is currently being annotated
    const [annotatingStepIndex, setAnnotatingStepIndex] = useState<number | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData(JSON.parse(JSON.stringify(initialData))); // Deep copy
        } else {
            setFormData({
                wi_id: `WI-${Date.now()}`,
                title: '',
                doc_id: '',
                model_variant: '',
                linked_cp_id: '',
                steps: [
                    {
                        step_number: 1,
                        title: 'New Step',
                        image_url: '',
                        sub_steps: [],
                        overlays: []
                    }
                ]
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleStepChange = (index: number, field: keyof WorkInstructionStep, value: any) => {
        const newSteps = [...(formData.steps || [])];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setFormData(prev => ({ ...prev, steps: newSteps }));
    };

    const handleSubStepsChange = (index: number, text: string) => {
        // Split by new line to create array
        const subSteps = text.split('\n').filter(line => line.trim() !== '');
        handleStepChange(index, 'sub_steps', subSteps);
    };

    const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleStepChange(index, 'image_url', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveAnnotations = (newOverlays: ImageOverlay[]) => {
        if (annotatingStepIndex !== null) {
            handleStepChange(annotatingStepIndex, 'overlays', newOverlays);
            setAnnotatingStepIndex(null);
        }
    };

    const addStep = () => {
        const newSteps = [...(formData.steps || [])];
        newSteps.push({
            step_number: newSteps.length + 1,
            title: '',
            image_url: '',
            sub_steps: [],
            overlays: []
        });
        setFormData(prev => ({ ...prev, steps: newSteps }));
    };

    const removeStep = (index: number) => {
        const newSteps = [...(formData.steps || [])];
        newSteps.splice(index, 1);
        // Renumber steps
        const renumbered = newSteps.map((s, i) => ({ ...s, step_number: i + 1 }));
        setFormData(prev => ({ ...prev, steps: renumbered }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as WorkInstruction);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">
                            {initialData ? 'Edit Work Instruction' : 'Create New Work Instruction'}
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Front Door Assembly"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Document ID</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.doc_id}
                                        onChange={e => setFormData({ ...formData, doc_id: e.target.value })}
                                        placeholder="e.g. WI-001-A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Model / Variant</label>
                                    <input
                                        type="text"
                                        className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.model_variant}
                                        onChange={e => setFormData({ ...formData, model_variant: e.target.value })}
                                        placeholder="e.g. Model X, All Variants"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Linked Control Plan Item</label>
                                    <select
                                        className="w-full border-slate-300 rounded-md shadow-sm border p-2 text-sm"
                                        value={formData.linked_cp_id}
                                        onChange={e => setFormData({ ...formData, linked_cp_id: e.target.value })}
                                    >
                                        <option value="">-- Unlinked --</option>
                                        {controlPlanItems.map(cp => {
                                            const pfmea = pfmeaItems.find(p => p.pfmea_id === cp.pfmea_link_id);
                                            const label = pfmea
                                                ? `OP ${cp.part_process_number}: ${pfmea.process_function} - ${cp.product_characteristic}`
                                                : `CP: ${cp.product_characteristic}`;
                                            return <option key={cp.cp_id} value={cp.cp_id}>{label}</option>;
                                        })}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Links this instruction to a specific quality check.</p>
                                </div>
                            </div>

                            {/* Steps Editor */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-lg font-bold text-slate-800">Process Steps</h4>
                                    <button type="button" onClick={addStep} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium border border-blue-200 shadow-sm">
                                        + Add Step
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {formData.steps?.map((step, index) => (
                                        <div key={index} className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                <span className="font-bold text-slate-700">Step {index + 1}</span>
                                                <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-slate-500 uppercase">Step Title</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border-slate-300 rounded shadow-sm border p-2 mt-1"
                                                        value={step.title}
                                                        onChange={e => handleStepChange(index, 'title', e.target.value)}
                                                        placeholder="e.g. Inspect Surface"
                                                    />
                                                </div>

                                                {/* Left Column: Image Upload & Preview */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-xs font-medium text-slate-500 uppercase">Visual Aid / Image</label>
                                                        {step.image_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
                                                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                                                            >
                                                                Change Image
                                                            </button>
                                                        )}
                                                    </div>

                                                    {!step.image_url ? (
                                                        <div
                                                            onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
                                                            className="border-2 border-dashed border-slate-300 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors bg-slate-50 relative group"
                                                        >
                                                            <svg className="w-10 h-10 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            <span className="text-sm text-slate-600 font-medium group-hover:text-blue-600 transition-colors">Click to Attach Image</span>
                                                            <span className="text-xs text-slate-400 mt-1">Supports JPG, PNG</span>

                                                            {/* Suggestion from Process if linked */}
                                                            {(() => {
                                                                if (!formData.linked_cp_id) return null;
                                                                const cp = controlPlanItems.find(c => c.cp_id === formData.linked_cp_id);
                                                                if (!cp) return null;
                                                                const pf = pfmeaItems.find(p => p.pfmea_id === cp.pfmea_link_id);
                                                                if (!pf?.image_url) return null;

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStepChange(index, 'image_url', pf.image_url);
                                                                        }}
                                                                        className="mt-3 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-100 shadow-sm flex items-center"
                                                                    >
                                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                        Use Process Visual Aid
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-48 flex items-center justify-center">
                                                            <img
                                                                src={step.image_url}
                                                                alt="Step Visual"
                                                                className="max-h-full max-w-full object-contain"
                                                                onError={(e) => {
                                                                    // Handle broken image
                                                                    (e.target as any).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGFhYjgiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBhdGggZD0iTTIxIDE1bC01LTVMNSIyMSIvPjwvc3ZnPg==';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAnnotatingStepIndex(index)}
                                                                    className="bg-white text-blue-600 px-3 py-1.5 rounded shadow hover:bg-blue-50 text-xs font-bold flex items-center"
                                                                >
                                                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                    Annotate
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (window.confirm('Remove image? Annotations will be lost.')) {
                                                                            handleStepChange(index, 'image_url', '');
                                                                            handleStepChange(index, 'overlays', []);
                                                                        }
                                                                    }}
                                                                    className="bg-red-600 text-white px-3 py-1.5 rounded shadow hover:bg-red-700 text-xs font-bold"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            {/* Annotation Counter */}
                                                            {(step.overlays?.length || 0) > 0 && (
                                                                <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 pointer-events-none">
                                                                    {step.overlays?.length} Annotations
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <input
                                                        id={`file-upload-${index}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload(index, e)}
                                                    />
                                                </div>

                                                {/* Right Column: Sub-steps */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Sub-steps / Details (One per line)</label>
                                                    <textarea
                                                        className="w-full border-slate-300 rounded shadow-sm border p-3 text-sm font-normal h-48 resize-none focus:ring-blue-500 focus:border-blue-500"
                                                        value={step.sub_steps.join('\n')}
                                                        onChange={e => handleSubStepsChange(index, e.target.value)}
                                                        placeholder="1.1 Inspect panel clips.&#10;1.2 Align panel clips with frame holes."
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Warning / Alert (Optional)</label>
                                                    <div className="flex space-x-2">
                                                        <select
                                                            className="border-slate-300 rounded shadow-sm border p-2 text-sm w-32 focus:ring-blue-500 focus:border-blue-500"
                                                            value={step.warning_alert?.type || ''}
                                                            onChange={e => {
                                                                if (!e.target.value) handleStepChange(index, 'warning_alert', undefined);
                                                                else handleStepChange(index, 'warning_alert', { type: e.target.value, message: step.warning_alert?.message || '' });
                                                            }}
                                                        >
                                                            <option value="">None</option>
                                                            <option value="info">Info</option>
                                                            <option value="warning">Warning</option>
                                                            <option value="critical">Critical</option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            className="flex-1 border-slate-300 rounded shadow-sm border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                            value={step.warning_alert?.message || ''}
                                                            onChange={e => {
                                                                if (step.warning_alert) handleStepChange(index, 'warning_alert', { ...step.warning_alert, message: e.target.value });
                                                            }}
                                                            disabled={!step.warning_alert}
                                                            placeholder="Alert message..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm font-medium">Save Work Instruction</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Annotation Overlay Modal */}
            {annotatingStepIndex !== null && formData.steps && formData.steps[annotatingStepIndex] && (
                <AnnotationEditor
                    imageUrl={formData.steps[annotatingStepIndex].image_url}
                    initialOverlays={formData.steps[annotatingStepIndex].overlays || []}
                    onSave={handleSaveAnnotations}
                    onCancel={() => setAnnotatingStepIndex(null)}
                />
            )}
        </>
    );
};
