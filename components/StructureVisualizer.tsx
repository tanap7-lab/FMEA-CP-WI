
import React, { useState, useEffect } from 'react';
import { StructureElement, ProjectDiagram } from '../types';

interface StructureVisualizerProps {
  projectName: string;
  elements: StructureElement[];
  selectedElementId: string | null;
  activeDiagram?: ProjectDiagram | null; // Added to access image data
  onSelectElement: (id: string | null) => void;
  onAddElement: () => void;
  onEditElement: (element: StructureElement) => void;
  onDeleteElement: (id: string) => void;
  onUpdateElement: (element: StructureElement) => void;
  onImagePreviewClick?: () => void; // New prop for navigation
}

export const StructureVisualizer: React.FC<StructureVisualizerProps> = ({
  projectName,
  elements,
  selectedElementId,
  activeDiagram,
  onSelectElement,
  onAddElement,
  onEditElement,
  onDeleteElement,
  onUpdateElement,
  onImagePreviewClick
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showImagePreviews, setShowImagePreviews] = useState(false);

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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

  // --- Drag and Drop Logic ---
  const isDescendant = (ancestorId: string, potentialDescendantId: string): boolean => {
      let current = elements.find(e => e.element_id === potentialDescendantId);
      while (current && current.parent_element_id) {
          if (current.parent_element_id === ancestorId) return true;
          current = elements.find(e => e.element_id === current!.parent_element_id);
      }
      return false;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('structureId', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== targetId) {
          setDragOverId(targetId);
      }
  };

  const handleDrop = (e: React.DragEvent, targetParentId: string | null) => {
      e.preventDefault();
      setDragOverId(null);
      
      const draggedId = e.dataTransfer.getData('structureId');
      
      if (!draggedId) return;
      if (draggedId === targetParentId) return; // Dropped on self

      // Check if trying to drop parent into child (Cycle)
      if (targetParentId && isDescendant(draggedId, targetParentId)) {
          alert("Cannot move an element into its own descendant.");
          return;
      }

      const draggedElement = elements.find(e => e.element_id === draggedId);
      if (draggedElement && draggedElement.parent_element_id !== targetParentId) {
          onUpdateElement({ ...draggedElement, parent_element_id: targetParentId });
      }
  };

  // Using a render function instead of a nested component to ensure stability of event handlers
  const renderTree = (element: StructureElement) => {
    const children = getChildren(element.element_id);
    const isDragTarget = dragOverId === element.element_id;
    
    // Check if we have a mapped box for this element in the active diagram
    const mappedBox = activeDiagram?.boxes.find(b => b.structure_element_id === element.element_id);

    return (
      <div key={element.element_id} className="flex flex-col items-center">
        {/* Node Card */}
        <div 
            className="relative z-20 group"
            onClick={(e) => { e.stopPropagation(); onSelectElement(element.element_id); }}
            draggable
            onDragStart={(e) => handleDragStart(e, element.element_id)}
            onDragOver={(e) => handleDragOver(e, element.element_id)}
            onDrop={(e) => handleDrop(e, element.element_id)}
        >
            <div className={`
                w-64 p-4 rounded-lg border shadow-sm transition-all cursor-pointer bg-white relative
                ${selectedElementId === element.element_id 
                ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
                : isDragTarget 
                    ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50' 
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }
            `}>
                {/* Image Preview from Diagram */}
                {showImagePreviews && activeDiagram?.imageUrl && mappedBox && (
                    <div 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(onImagePreviewClick) onImagePreviewClick(); 
                        }}
                        title="Click to view in Diagram"
                        className="w-full h-24 bg-slate-100 mb-3 rounded overflow-hidden relative border border-slate-200 cursor-zoom-in group-hover:border-blue-300 transition-colors"
                    >
                        <div 
                            className="absolute inset-0 bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                            style={{
                                backgroundImage: `url(${activeDiagram.imageUrl})`,
                                // Center the background on the box coordinates
                                backgroundPosition: `${mappedBox.x}% ${mappedBox.y}%`,
                                // Zoom in (500% = 5x zoom relative to original image container)
                                backgroundSize: '600%', 
                            }}
                        />
                        {/* Center Crosshair/Marker */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3 h-3 border-2 border-red-500 rounded-full shadow-sm bg-white/20 backdrop-blur-sm"></div>
                        </div>
                    </div>
                )}
                
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
              {children.map((child, index) => (
                <div key={child.element_id} className="flex flex-col items-center relative px-4">
                  {/* Horizontal Connectors */}
                  {children.length > 1 && (
                      <>
                        {index > 0 && <div className="absolute top-0 left-0 w-1/2 h-px bg-slate-300"></div>}
                        {index < children.length - 1 && <div className="absolute top-0 right-0 w-1/2 h-px bg-slate-300"></div>}
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
  const isRootDragTarget = dragOverId === 'root-system';

  return (
    <div 
        className={`bg-slate-50 border-b border-slate-200 relative overflow-hidden transition-all duration-300 ease-in-out flex flex-col
            ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen border-none' : ''}
        `} 
        style={!isFullScreen ? { minHeight: '400px' } : {}}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { setDragOverId(null); }}
    >
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        {/* Toggle Image Previews Button */}
        <button
            onClick={() => setShowImagePreviews(!showImagePreviews)}
            className={`p-1.5 rounded shadow-sm border transition-colors flex items-center justify-center ${
                showImagePreviews 
                ? 'bg-indigo-100 text-indigo-600 border-indigo-300' 
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
            }`}
            title={showImagePreviews ? "Hide Diagram Previews" : "Show Pinned Image Position"}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>

        {/* Full Screen Toggle Button */}
        <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-white border border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded shadow-sm transition-colors"
            title={isFullScreen ? "Exit Full Screen" : "View Full Screen"}
        >
            {isFullScreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
        </button>

        <button 
          onClick={onAddElement}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors font-medium flex items-center h-8"
        >
          + Add Structure Element
        </button>
        
        {!isFullScreen && (
            <button 
              onClick={() => setIsExpanded(false)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs px-3 py-1.5 rounded shadow-sm transition-colors h-8"
            >
              FMEA table
            </button>
        )}
      </div>
      
      {/* Full Screen Header */}
      {isFullScreen && (
          <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-slate-200">
              <h2 className="font-bold text-slate-800">{projectName} Structure Analysis</h2>
              <p className="text-xs text-slate-500">Press ESC to exit full screen</p>
          </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-50/50">
        {/* Wrapper for horizontal scroll handling */}
        <div className="min-w-max flex flex-col items-center mx-auto pb-12 pt-12">
            
            {/* Root Node (System/Product) */}
            <div className="flex flex-col items-center mb-0 relative z-20">
                <div 
                    onClick={() => onSelectElement(null)}
                    onDragOver={(e) => handleDragOver(e, 'root-system')}
                    onDrop={(e) => handleDrop(e, null)}
                    className={`
                    p-1 rounded-xl bg-white shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] mb-0
                    ${selectedElementId === null 
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
                        : isRootDragTarget
                            ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50'
                            : 'border-slate-200 hover:border-blue-300'
                    }
                    `}
                >
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-10 py-4 text-center min-w-[320px]">
                        <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1.5">SYSTEM / PRODUCT</div>
                        <div className="font-bold text-slate-800 text-xl leading-tight truncate max-w-xs mx-auto" title={projectName}>
                            {projectName}
                        </div>
                        {isRootDragTarget && <div className="text-xs text-indigo-500 font-bold mt-1 animate-pulse">Drop here to make top-level</div>}
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
