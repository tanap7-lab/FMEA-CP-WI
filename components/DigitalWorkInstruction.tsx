
import React from 'react';
import { WorkInstruction, ImageOverlay } from '../types';

interface DigitalWorkInstructionProps {
    instruction: WorkInstruction;
    onClose: () => void;
    onGoToControlPlan?: (cpId: string) => void;
}

export const DigitalWorkInstruction: React.FC<DigitalWorkInstructionProps> = ({ instruction, onClose, onGoToControlPlan }) => {
    
    // Helper to render individual overlays
    const renderOverlay = (overlay: ImageOverlay) => {
        const { id, type, x, y, width, height, x2, y2, text, color = '#2563eb' } = overlay; // Default blue-600

        switch (type) {
            case 'box':
                return (
                    <div 
                        key={id}
                        className="absolute border-2 bg-opacity-20 flex items-center justify-center font-bold text-xs"
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                            borderColor: color,
                            backgroundColor: `${color}33`, // 20% opacity hex
                            color: color
                        }}
                    >
                        {text && <span className="bg-white px-1 shadow-sm rounded">{text}</span>}
                    </div>
                );
            case 'circle':
                return (
                     <div 
                        key={id}
                        className="absolute border-2 rounded-full bg-opacity-20"
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                            borderColor: color,
                             backgroundColor: `${color}33`
                        }}
                    />
                );
            case 'arrow':
                // Simple SVG arrow calculation
                // x, y are start points %, x2, y2 are end points %
                return (
                    <svg key={id} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                        <defs>
                            <marker id={`arrowhead-${id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                            </marker>
                        </defs>
                        <line 
                            x1={`${x}%`} y1={`${y}%`} 
                            x2={`${x2}%`} y2={`${y2}%`} 
                            stroke={color} 
                            strokeWidth="3" 
                            markerEnd={`url(#arrowhead-${id})`} 
                        />
                        {text && (
                            // Position text at midpoint
                            <foreignObject x={`${(x + (x2||x))/2}%`} y={`${(y + (y2||y))/2}%`} width="100" height="30">
                                <div className="bg-white text-xs font-bold px-1 py-0.5 rounded shadow inline-block border" style={{ borderColor: color, color: color }}>
                                    {text}
                                </div>
                            </foreignObject>
                        )}
                    </svg>
                );
            case 'label':
                return (
                    <div 
                        key={id}
                        className="absolute px-2 py-1 rounded shadow-md text-white text-xs font-bold transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            backgroundColor: color
                        }}
                    >
                        {text}
                        {/* Little triangle to point to spot */}
                        <div 
                            className="absolute w-2 h-2 rotate-45 transform -translate-x-1/2 left-1/2 -bottom-1" 
                            style={{ backgroundColor: color }}
                        ></div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col animate-fade-in overflow-hidden">
            {/* 1. Header Info: Title & Document ID */}
            <div className="bg-slate-700 text-white p-4 shadow-md flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center space-x-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-600 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-wide">Electronic Work Instruction: {instruction.title}</h2>
                        <div className="flex space-x-4 text-xs text-slate-300 font-mono">
                            <span>MODEL: {instruction.model_variant}</span>
                            <span>DOC ID: {instruction.doc_id}</span>
                        </div>
                    </div>
                </div>
                {instruction.linked_cp_id && onGoToControlPlan && (
                    <button 
                        onClick={() => onGoToControlPlan(instruction.linked_cp_id)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        View Control Plan
                    </button>
                )}
            </div>

            {/* 2. Scrollable Body: Vertical list of cards */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-100 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">
                    {instruction.steps.map((step, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            {/* Card Header */}
                            <div className="bg-slate-500 text-white px-6 py-2 font-bold text-sm uppercase tracking-wider flex justify-between items-center">
                                <span>Step {step.step_number}: {step.title}</span>
                                {index === 0 && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded">Active</span>}
                            </div>

                            {/* Card Content: Split View */}
                            <div className="flex flex-col md:flex-row h-full">
                                {/* Left: Visual Aid with Overlays */}
                                <div className="w-full md:w-2/5 border-r border-slate-100 bg-slate-50 flex items-center justify-center p-4 relative min-h-[300px]">
                                    <div className="relative inline-block max-w-full">
                                        {step.image_url ? (
                                            <img src={step.image_url} alt={step.title} className="max-h-72 object-contain rounded-md shadow-sm block" />
                                        ) : (
                                            <div className="w-64 h-48 flex flex-col items-center justify-center text-slate-300 bg-white border border-dashed border-slate-300 rounded">
                                                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span>No Visual Aid</span>
                                            </div>
                                        )}
                                        
                                        {/* Render Overlays */}
                                        {step.overlays && step.overlays.map(renderOverlay)}
                                    </div>

                                    {/* Simulated "Green Check" overlay for completed visual steps logic could go here */}
                                    {index === 0 && (
                                        <div className="absolute bottom-4 right-4 bg-green-500 text-white p-1 rounded-md shadow-lg z-20">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Instructions & Alerts */}
                                <div className="w-full md:w-3/5 p-6 flex flex-col justify-center">
                                    <ul className="space-y-3 mb-6">
                                        {step.sub_steps.map((sub, idx) => (
                                            <li key={idx} className="flex items-start text-lg text-slate-700">
                                                <span className="font-semibold mr-2 block text-slate-400 select-none">{step.step_number}.{idx + 1}</span>
                                                {sub}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Critical Alerts */}
                                    {step.warning_alert && (
                                        <div className={`flex items-center p-3 rounded-lg border-l-4 mb-4 ${
                                            step.warning_alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                                            step.warning_alert.type === 'critical' ? 'bg-red-50 border-red-500 text-red-800' :
                                            'bg-blue-50 border-blue-400 text-blue-800'
                                        }`}>
                                            <svg className="w-6 h-6 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="font-bold">{step.warning_alert.message}</span>
                                        </div>
                                    )}

                                    {/* Tool Specs / Validation */}
                                    {step.tool_specs && step.tool_specs.length > 0 && (
                                        <div className="flex space-x-3">
                                            {step.tool_specs.map((spec, sIdx) => (
                                                <div key={sIdx} className="bg-slate-800 text-white rounded px-3 py-2 flex items-center shadow-sm">
                                                    <div className="mr-3">
                                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase text-slate-400 leading-none mb-0.5">{spec.tool_type}</span>
                                                        <span className="font-mono text-lg font-bold text-blue-300">{spec.value} <span className="text-sm text-slate-400">{spec.unit}</span></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Navigation Footer */}
            <div className="bg-slate-700 text-white p-4 shrink-0 flex justify-end">
                <button 
                    onClick={onClose}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-8 py-3 rounded text-lg font-bold transition-colors w-full md:w-auto"
                >
                    NEXT STEP
                </button>
            </div>
        </div>
    );
};
