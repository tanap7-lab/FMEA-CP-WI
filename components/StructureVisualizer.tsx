import React, { useState } from 'react';
import { StructureElement } from '../types';

interface StructureVisualizerProps {
  projectName: string;
  elements: StructureElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onAddElement: () => void;
  onEditElement: (element: StructureElement) => void;
  onDeleteElement: (id: string) => void;
  onUpdateElement: (element: StructureElement) => void;
}

export const StructureVisualizer: React.FC<StructureVisualizerProps> = ({
  projectName,
  elements,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onEditElement,
  onDeleteElement,
  onUpdateElement
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isExpanded) {
    return (
      <div className="bg-white border-b border-slate-200 p-2 flex justify-between items-center bg-slate-50">
        <span className="text-sm font-semibold text-slate-600 ml-4">Structure Analysis Diagram</span>
        <button 
          onClick={() => setIsExpanded(true)}
          className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-700"
        >
          Structure Visualization
        </button>
      </div>
    );
  }

  const getChildren = (parentId: string | null) => {
    return elements.filter(e => {
      if (parentId === null) return !e.parent_element_id;
      return e.parent_element_id === parentId;
    });
  };

  // Using a render function instead of a nested component to ensure stability of event handlers
  const renderTree = (element: StructureElement) => {
    const children = getChildren(element.element_id);

    return (
      <div key={element.element_id} className="flex flex-col items-center">
        {/* Node Card */}
        <div 
            className="relative z-20 group"
            onClick={(e) => { e.stopPropagation(); onSelectElement(element.element_id); }}
        >
            <div className={`
                w-64 p-4 rounded-lg border shadow-sm transition-all cursor-pointer bg-white
                ${selectedElementId === element.element_id 
                ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
                : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }
            `}>
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {element.category || 'COMPONENT'}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEditElement(element); }}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                            title="Edit"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteElement(element.element_id); }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                            title="Delete"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <h4 className="font-bold text-slate-800 text-sm mb-1">{element.element_title}</h4>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 h-8 leading-relaxed">
                    {element.description || 'No description provided.'}
                </p>

                {/* Footer Specification */}
                <div className="bg-slate-50 border border-slate-100 rounded px-2 py-1.5 text-[10px] text-slate-600 font-mono truncate">
                    {element.specification || 'Material: Unspecified'}
                </div>
            </div>
        </div>

        {/* Children Connection */}
        {children.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical Line Down from Parent */}
            <div className="w-px h-8 bg-slate-300"></div>
            
            {/* Horizontal Bus */}
            <div className="flex relative">
                {/* 
                   We need to draw lines connecting the vertical lines of children.
                   If there is more than one child, we draw a horizontal line spanning from the first child's center to the last child's center.
                */}
              {children.map((child, index) => (
                <div key={child.element_id} className="flex flex-col items-center relative px-4">
                  
                  {/* Horizontal Connectors */}
                  {children.length > 1 && (
                      <>
                        {/* Line to the left (if not first child) */}
                        {index > 0 && (
                            <div className="absolute top-0 left-0 w-1/2 h-px bg-slate-300"></div>
                        )}
                        {/* Line to the right (if not last child) */}
                        {index < children.length - 1 && (
                            <div className="absolute top-0 right-0 w-1/2 h-px bg-slate-300"></div>
                        )}
                      </>
                  )}

                  {/* Vertical Line Down to Child */}
                  <div className="w-px h-8 bg-slate-300"></div>
                  
                  {renderTree(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootChildren = getChildren(null);

  return (
    <div className="bg-slate-50 border-b border-slate-200 relative overflow-hidden transition-all duration-300 ease-in-out flex flex-col" style={{ minHeight: '400px' }}>
      <div className="absolute top-4 right-4 z-50 space-x-2">
        <button 
          onClick={onAddElement}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors font-medium"
        >
          + Add Structure Element
        </button>
        <button 
          onClick={() => setIsExpanded(false)}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs px-3 py-1.5 rounded shadow-sm transition-colors"
        >
          FMEA table
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-8">
        {/* Wrapper for horizontal scroll handling */}
        <div className="min-w-max flex flex-col items-center mx-auto pb-12 pt-4">
            
            {/* Root Node (System/Product) */}
            <div className="flex flex-col items-center mb-0 relative z-20">
                <div 
                    onClick={() => onSelectElement(null)}
                    className={`
                    p-1 rounded-xl bg-white shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] mb-0
                    ${selectedElementId === null 
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
                        : 'border-slate-200 hover:border-blue-300'
                    }
                    `}
                >
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-10 py-4 text-center min-w-[320px]">
                        <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1.5">SYSTEM / PRODUCT</div>
                        <div className="font-bold text-slate-800 text-xl leading-tight truncate max-w-xs mx-auto" title={projectName}>
                            {projectName}
                        </div>
                    </div>
                </div>

                {rootChildren.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="w-px h-12 bg-slate-300"></div>
                        <div className="flex relative">
                             {rootChildren.map((child, index) => (
                                <div key={child.element_id} className="flex flex-col items-center relative px-4">
                                     {rootChildren.length > 1 && (
                                        <>
                                            {index > 0 && <div className="absolute top-0 left-0 w-1/2 h-px bg-slate-300"></div>}
                                            {index < rootChildren.length - 1 && <div className="absolute top-0 right-0 w-1/2 h-px bg-slate-300"></div>}
                                        </>
                                     )}
                                    <div className="w-px h-8 bg-slate-300"></div>
                                    {renderTree(child)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {elements.length === 0 && (
            <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-lg w-full max-w-md mt-12 bg-white/50">
                <p className="mb-2 font-medium">No Structure Elements defined.</p>
                <p className="text-xs">Click "+ Add Structure Element" to begin mapping the system architecture.</p>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};
