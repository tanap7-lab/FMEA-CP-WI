import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectDiagram, StructureElement, ExplodedViewBox } from '../types';

interface ExplodedViewProps {
  diagram: ProjectDiagram;
  structureElements: StructureElement[];
  onUploadImage: (dataUrl: string) => void;
  onAddBox: (box: ExplodedViewBox) => void;
  onRemoveBox: (boxId: string) => void;
  onBoxDropNew: (x: number, y: number) => void;
  onAddSuggestedElements: (elements: Partial<StructureElement>[]) => void;
}

export const ExplodedView: React.FC<ExplodedViewProps> = ({
  diagram,
  structureElements,
  onUploadImage,
  onAddBox,
  onRemoveBox,
  onBoxDropNew,
  onAddSuggestedElements
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUploadImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, type: 'EXISTING' | 'NEW', id?: string) => {
    e.dataTransfer.setData('type', type);
    if (id) e.dataTransfer.setData('id', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const type = e.dataTransfer.getData('type');
    
    if (type === 'NEW') {
        onBoxDropNew(x, y);
    } else if (type === 'EXISTING') {
        const id = e.dataTransfer.getData('id');
        // Check if box already exists for this element to prevent duplicates if desired
        // For now allowing multiple pointers to same element
        onAddBox({
            id: `BOX-${Date.now()}`,
            structure_element_id: id,
            x,
            y
        });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const getElementTitle = (id: string) => {
    return structureElements.find(e => e.element_id === id)?.element_title || 'Unknown';
  };

  const handleAiAnalysis = async () => {
    if (!diagram.imageUrl || isAnalyzing) return;
    setIsAnalyzing(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const [header, base64Data] = diagram.imageUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

        const response = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: "Identify the distinct engineering components in this diagram. For each component, provide a title, a brief visual description, a category (Component, Sub-system, or Assembly), and a realistic engineering specification (material or dimension). Return a JSON array." }
                ]
             },
             config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                     type: Type.ARRAY,
                     items: {
                         type: Type.OBJECT,
                         properties: {
                             element_title: { type: Type.STRING },
                             description: { type: Type.STRING },
                             category: { type: Type.STRING, enum: ["Component", "Sub-system", "Assembly"] },
                             specification: { type: Type.STRING }
                         },
                         required: ["element_title", "description", "category", "specification"]
                     }
                 }
             }
        });

        if (response.text) {
            const suggestions = JSON.parse(response.text);
            onAddSuggestedElements(suggestions);
        }
    } catch (e) {
        console.error("AI Analysis failed", e);
        alert("Could not analyze image. Check API key or try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Identify which elements are NOT yet on the diagram
  const usedElementIds = new Set(diagram.boxes.map(b => b.structure_element_id));
  const availableElements = structureElements.filter(e => !usedElementIds.has(e.element_id));

  return (
    <div className="bg-white border rounded-lg shadow-sm mb-6 overflow-hidden">
      <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
        <div>
            <h3 className="font-bold text-indigo-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Exploded View Diagram
            </h3>
            <p className="text-xs text-indigo-600">Map structure elements to visual diagram</p>
        </div>
        <div className="flex items-center space-x-3">
             {diagram.imageUrl && (
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                 >
                    Change Image
                 </button>
             )}
            <button 
                onClick={() => setIsVisible(!isVisible)}
                className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded text-xs font-medium hover:bg-indigo-50"
            >
                {isVisible ? 'Hide Diagram' : 'Show Diagram'}
            </button>
        </div>
      </div>

      {isVisible && (
        <div className="p-6">
            {!diagram.imageUrl ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange}
                    />
                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <span className="text-slate-600 font-medium">Click to Upload Exploded View Image</span>
                    <span className="text-slate-400 text-sm mt-1">Supports PNG, JPG, GIF</span>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6 h-[500px]">
                    {/* Sidebar Palette */}
                    <div className="w-full md:w-64 bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Element Palette</h4>
                            <button
                                onClick={handleAiAnalysis}
                                disabled={isAnalyzing}
                                className={`p-1.5 rounded border border-indigo-200 transition-colors shadow-sm ${isAnalyzing ? 'bg-indigo-100 text-indigo-400' : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800'}`}
                                title="AI: Auto-detect elements from image"
                            >
                                {isAnalyzing ? (
                                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        
                        <div 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, 'NEW')}
                            className="bg-white border border-blue-300 border-dashed text-blue-600 p-3 rounded mb-4 cursor-grab hover:shadow-md transition-shadow flex items-center"
                        >
                            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-lg font-bold">+</span>
                            <span className="text-sm font-medium">New Element</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                             <p className="text-[10px] text-slate-400 mb-2">Drag existing elements to image:</p>
                             {availableElements.length === 0 && <p className="text-xs text-slate-400 italic">All current elements mapped.</p>}
                             {availableElements.map(el => (
                                 <div
                                    key={el.element_id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'EXISTING', el.element_id)}
                                    className="bg-white border border-slate-200 p-2 rounded text-sm text-slate-700 cursor-grab hover:border-indigo-300 hover:shadow-sm"
                                 >
                                     {el.element_title}
                                 </div>
                             ))}
                        </div>
                    </div>

                    {/* Image Canvas */}
                    <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative overflow-hidden flex items-center justify-center">
                         <div 
                            ref={imageContainerRef}
                            className="relative shadow-xl"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                         >
                            <img 
                                src={diagram.imageUrl} 
                                alt="Exploded View" 
                                className="max-h-[480px] max-w-full object-contain pointer-events-none select-none"
                            />
                            
                            {/* Overlay Layer */}
                            <div className="absolute inset-0">
                                {diagram.boxes.map(box => (
                                    <div
                                        key={box.id}
                                        className="absolute bg-indigo-600/90 text-white text-[10px] px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group hover:scale-110 transition-transform whitespace-nowrap z-10"
                                        style={{ left: `${box.x}%`, top: `${box.y}%` }}
                                    >
                                        <div className="font-bold flex items-center">
                                            {getElementTitle(box.structure_element_id)}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveBox(box.id); }}
                                                className="ml-2 w-4 h-4 bg-indigo-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        <div className="w-0.5 h-4 bg-indigo-600 absolute -bottom-4 left-1/2 -translate-x-1/2"></div>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full absolute -bottom-5 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                ))}
                            </div>
                         </div>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};