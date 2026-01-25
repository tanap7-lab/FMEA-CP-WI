import React, { useState } from 'react';
import { PfmeaItem } from '../types';

interface ProcessFlowVisualizerProps {
  items: PfmeaItem[];
  selectedStepNumber: number | null;
  onSelectStep: (stepNumber: number | null) => void;
  onAddStep: () => void;
  onEditStep: (stepNumber: number) => void;
  onDeleteStep: (stepNumber: number) => void;
}

export const ProcessFlowVisualizer: React.FC<ProcessFlowVisualizerProps> = ({
  items,
  selectedStepNumber,
  onSelectStep,
  onAddStep,
  onEditStep,
  onDeleteStep
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Derive unique steps and sort them
  const steps = Array.from(new Set(items.map(i => i.process_step_number)))
    .sort((a: number, b: number) => a - b)
    .map(stepNum => {
      const item = items.find(i => i.process_step_number === stepNum);
      return {
        stepNumber: stepNum,
        function: item?.process_function || 'Unknown Function',
        requirement: item?.process_requirement || ''
      };
    });

  if (!isExpanded) {
    return (
       <div className="bg-white border-b border-slate-200 p-2 flex justify-between items-center bg-slate-50 mb-6 rounded-lg border">
        <span className="text-sm font-semibold text-slate-600 ml-4">Process Flow Diagram</span>
        <button 
          onClick={() => setIsExpanded(true)}
          className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-700"
        >
          Show Diagram
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg mb-6 overflow-hidden transition-all duration-300 shadow-sm">
      <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 flex items-center">
          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Process Flow Diagram
        </h3>
        <div className="space-x-2">
            <button onClick={onAddStep} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 shadow-sm transition-colors">+ Add Process Step</button>
            <button onClick={() => setIsExpanded(false)} className="text-slate-500 hover:text-slate-700 text-xs px-2">Hide</button>
        </div>
      </div>
      
      <div className="p-8 overflow-x-auto custom-scrollbar">
        <div className="flex items-center min-w-max space-x-4">
            {/* Start Node */}
            <div className="flex flex-col items-center opacity-50">
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-[10px]">START</div>
            </div>
            
            <div className="w-8 h-0.5 bg-slate-300"></div>

            {steps.length === 0 && (
              <div className="text-slate-400 text-sm italic border-2 border-dashed border-slate-200 px-4 py-2 rounded">
                No process steps defined.
              </div>
            )}

            {steps.map((step, idx) => (
                <React.Fragment key={step.stepNumber}>
                    <div className="flex flex-col items-center relative group">
                        <div 
                            onClick={() => onSelectStep(selectedStepNumber === step.stepNumber ? null : step.stepNumber)}
                            className={`
                                w-48 p-4 rounded-lg border cursor-pointer transition-all bg-white relative
                                ${selectedStepNumber === step.stepNumber 
                                    ? 'border-emerald-500 shadow-md ring-2 ring-emerald-100 bg-emerald-50/30' 
                                    : 'border-slate-200 hover:border-emerald-300 hover:shadow'
                                }
                            `}
                        >
                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded backdrop-blur-sm">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEditStep(step.stepNumber); }} 
                                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                    title="Edit Step Definition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteStep(step.stepNumber); }} 
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Delete Step & All Items"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            <div className="flex items-center mb-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${selectedStepNumber === step.stepNumber ? 'bg-emerald-600' : 'bg-slate-400'}`}>
                                    OP {step.stepNumber}
                                </span>
                            </div>
                            <div className="font-bold text-slate-800 text-sm mb-1 leading-tight">{step.function}</div>
                             {step.requirement && <div className="text-[10px] text-slate-500 truncate mt-1 pt-1 border-t border-slate-100">{step.requirement}</div>}
                        </div>
                        
                        {/* Connecting Line Down (Optional visual cue) */}
                        {selectedStepNumber === step.stepNumber && (
                           <div className="absolute -bottom-8 w-0.5 h-8 bg-emerald-500 z-10"></div> 
                        )}
                    </div>
                    
                    <div className="w-8 h-0.5 bg-slate-300 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-300 -mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </div>
                </React.Fragment>
            ))}

            {/* End Node */}
            <div className="flex flex-col items-center opacity-50">
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-[10px]">END</div>
            </div>
        </div>
      </div>
    </div>
  );
};