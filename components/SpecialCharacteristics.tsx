
import React, { useState } from 'react';
import { DfmeaItem, PfmeaItem, ControlPlanItem, WorkInstruction, OptimizationAction } from '../types';

interface SpecialCharacteristicsProps {
    dfmeaItems: DfmeaItem[];
    pfmeaItems: PfmeaItem[];
    controlPlanItems: ControlPlanItem[];
    workInstructions: WorkInstruction[];
    onNavigateToDfmea: (id: string) => void;
    onNavigateToPfmea: (id: string) => void;
}

export const SpecialCharacteristics: React.FC<SpecialCharacteristicsProps> = ({
    dfmeaItems,
    pfmeaItems,
    controlPlanItems,
    workInstructions,
    onNavigateToDfmea,
    onNavigateToPfmea
}) => {
    const [selectedItem, setSelectedItem] = useState<{ type: 'DFMEA' | 'PFMEA', id: string } | null>(null);

    const designSCs = dfmeaItems.filter(i => i.classification === 'CC' || i.classification === 'SC');
    const processSCs = pfmeaItems.filter(i => i.special_characteristic === 'In-process' || i.special_characteristic === 'Component');

    const getSelectItemData = () => {
        if (!selectedItem) return null;
        if (selectedItem.type === 'DFMEA') {
            return dfmeaItems.find(i => i.dfmea_id === selectedItem.id);
        } else {
            return pfmeaItems.find(i => i.pfmea_id === selectedItem.id);
        }
    };

    const activeItem = getSelectItemData();

    // Helper to render a "Chain Node"
    const ChainNode = ({ title, subtitle, label, color, icon, status, onClick }: { title: string, subtitle?: string, label: string, color: string, icon: React.ReactNode, status?: string, onClick?: () => void }) => (
        <div className={`relative flex items-center p-4 bg-white rounded-xl border-l-4 ${color} shadow-sm border border-slate-200 min-w-[300px]`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 text-white shadow-sm transition-transform hover:scale-110 ${color.replace('border-', 'bg-')}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</div>
                    {onClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            GO TO →
                        </button>
                    )}
                </div>
                <div className="font-bold text-slate-800 text-sm truncate" title={title}>{title}</div>
                {subtitle && <div className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</div>}
                {status && (
                    <div className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );

    const Connector = () => (
        <div className="flex flex-col items-center mx-4">
            <div className="w-12 h-px bg-slate-300"></div>
            <svg className="w-3 h-3 text-slate-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
    );

    const renderChains = (item: any) => {
        // Determine the starting point (always the SC itself)
        const isDfmea = selectedItem?.type === 'DFMEA';
        const dfmea = isDfmea ? item as DfmeaItem : dfmeaItems.find(d => d.dfmea_id === (item as PfmeaItem).linked_dfmea_id);
        const pfmeas = isDfmea
            ? pfmeaItems.filter(p => p.linked_dfmea_id === dfmea?.dfmea_id)
            : [item as PfmeaItem];

        return (
            <div className="space-y-12">
                {/* Chain 1: SC -> D-FMEA -> Optimization Action */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Chain 1: Design Improvement Flow</h4>
                    <div className="flex items-center overflow-x-auto pb-4 custom-scrollbar">
                        <ChainNode
                            label="Special Characteristic"
                            title={isDfmea ? (item as DfmeaItem).requirement : (item as PfmeaItem).process_requirement}
                            color="border-blue-600"
                            icon={<div className="w-4 h-4 border-2 border-white rotate-45 flex items-center justify-center font-bold text-[8px]">SC</div>}
                        />
                        <Connector />
                        <ChainNode
                            label="Design FMEA"
                            title={dfmea?.failure_mode || "No linked DFMEA"}
                            subtitle={dfmea?.item_function}
                            color="border-indigo-500"
                            onClick={dfmea ? () => onNavigateToDfmea(dfmea.dfmea_id) : undefined}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        />
                        {dfmea?.optimizationActions && dfmea.optimizationActions.length > 0 ? (
                            <>
                                <Connector />
                                <div className="flex flex-col gap-2">
                                    {dfmea.optimizationActions.map(action => (
                                        <ChainNode
                                            key={action.id}
                                            label="Optimization Action"
                                            title={action.preventive_measure}
                                            subtitle={action.responsible_owner}
                                            status={action.status}
                                            color="border-orange-500"
                                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <Connector />
                                <div className="px-4 py-2 bg-slate-100 border border-dashed text-slate-500 text-xs rounded-lg">No Design Actions Found</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Chain 2: SC -> D-FMEA -> P-FMEA -> Optimization Action */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Chain 2: Process Improvement Flow</h4>
                    <div className="flex items-center overflow-x-auto pb-4 custom-scrollbar">
                        <ChainNode
                            label="Design FMEA"
                            title={dfmea?.failure_mode || "N/A"}
                            color="border-indigo-500"
                            onClick={dfmea ? () => onNavigateToDfmea(dfmea.dfmea_id) : undefined}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        />
                        <Connector />
                        <div className="flex flex-col gap-2">
                            {pfmeas.map(p => (
                                <div key={p.pfmea_id} className="flex items-center">
                                    <ChainNode
                                        label={`Process Step ${p.process_step_number}`}
                                        title={p.failure_mode}
                                        subtitle={p.process_function}
                                        color="border-emerald-500"
                                        onClick={() => onNavigateToPfmea(p.pfmea_id)}
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                    />
                                    {p.optimizationActions && p.optimizationActions.length > 0 ? (
                                        <>
                                            <Connector />
                                            <div className="flex flex-col gap-1">
                                                {p.optimizationActions.map(action => (
                                                    <ChainNode
                                                        key={action.id}
                                                        label="P-Optimization"
                                                        title={action.preventive_measure}
                                                        status={action.status}
                                                        color="border-orange-500"
                                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="ml-4 px-3 py-1 bg-slate-50 border border-dashed text-[10px] text-slate-400 rounded">No Process Actions</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chain 3: SC -> D-FMEA -> P-FMEA -> Control Plan -> Work Instruction */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Chain 3: Quality Control & Execution Flow (Golden Thread)</h4>
                    <div className="flex items-center overflow-x-auto pb-4 custom-scrollbar">
                        <ChainNode
                            label={`Process FMEA`}
                            title={pfmeas[0]?.failure_mode || "N/A"}
                            color="border-emerald-500"
                            onClick={pfmeas[0] ? () => onNavigateToPfmea(pfmeas[0].pfmea_id) : undefined}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                        />
                        <Connector />
                        <div className="flex flex-col gap-2">
                            {pfmeas.map(p => {
                                const cpItems = controlPlanItems.filter(cp => cp.pfmea_link_id === p.pfmea_id);
                                return (
                                    <div key={p.pfmea_id} className="flex flex-col gap-2">
                                        {cpItems.length > 0 ? cpItems.map(cp => {
                                            const wi = workInstructions.find(w => w.wi_id === cp.linked_wi_id);
                                            return (
                                                <div key={cp.cp_id} className="flex items-center">
                                                    <ChainNode
                                                        label="Control Plan"
                                                        title={cp.product_characteristic || cp.process_characteristic || "Control Item"}
                                                        subtitle={cp.control_method}
                                                        color="border-purple-500"
                                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                                                    />
                                                    <Connector />
                                                    {wi ? (
                                                        <ChainNode
                                                            label="Work Instruction"
                                                            title={wi.title}
                                                            subtitle={wi.doc_id}
                                                            color="border-pink-500"
                                                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                                                        />
                                                    ) : (
                                                        <div className="px-4 py-2 bg-slate-50 border border-dashed text-[10px] text-slate-400 rounded">No WI Linked</div>
                                                    )}
                                                </div>
                                            );
                                        }) : <div className="px-4 py-2 bg-slate-50 border border-dashed text-[10px] text-slate-400 rounded ml-4">No Control Plan Found</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Special Characteristics (SC) Summary</h2>
                <p className="text-slate-500">Automatically consolidated list of critical and significant characteristics from Design and Process FMEA.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Design Special Characteristics */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                            <h3 className="text-white font-bold flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Design SCs (from D-FMEA)
                            </h3>
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">{designSCs.length}</span>
                        </div>
                        <div className="p-0">
                            {designSCs.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                                        <tr>
                                            <th className="px-6 py-3">Requirement</th>
                                            <th className="px-6 py-3">Failure Mode</th>
                                            <th className="px-6 py-3">CL</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {designSCs.map((i) => (
                                            <tr
                                                key={i.dfmea_id}
                                                onClick={() => setSelectedItem({ type: 'DFMEA', id: i.dfmea_id })}
                                                className={`hover:bg-blue-50 transition-colors cursor-pointer ${selectedItem?.id === i.dfmea_id ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : ''}`}
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-900">{i.requirement}</td>
                                                <td className="px-6 py-4 text-slate-600">{i.failure_mode}</td>
                                                <td className="px-6 py-4">
                                                    <div className="w-5 h-5 bg-white border-2 border-slate-900 rotate-45 flex items-center justify-center">
                                                        <span className="text-[8px] -rotate-45 font-bold text-slate-900">{i.classification}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToDfmea(i.dfmea_id); }}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs whitespace-nowrap"
                                                    >
                                                        Edit →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center text-slate-400 italic">No Design SCs identified.</div>
                            )}
                        </div>
                    </div>

                    {/* Process Special Characteristics */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                            <h3 className="text-white font-bold flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                Process SCs (from P-FMEA)
                            </h3>
                            <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">{processSCs.length}</span>
                        </div>
                        <div className="p-0">
                            {processSCs.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                                        <tr>
                                            <th className="px-6 py-3">Step #</th>
                                            <th className="px-6 py-3">Requirement</th>
                                            <th className="px-6 py-3">CL</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {processSCs.map((i) => (
                                            <tr
                                                key={i.pfmea_id}
                                                onClick={() => setSelectedItem({ type: 'PFMEA', id: i.pfmea_id })}
                                                className={`hover:bg-emerald-50 transition-colors cursor-pointer ${selectedItem?.id === i.pfmea_id ? 'bg-emerald-50 ring-2 ring-emerald-200 ring-inset' : ''}`}
                                            >
                                                <td className="px-6 py-4 font-mono text-slate-500">Step {i.process_step_number}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900 line-clamp-2">{i.process_requirement}</td>
                                                <td className="px-6 py-4">
                                                    <div className="w-5 h-5 bg-white border-2 border-slate-900 rotate-45 flex items-center justify-center">
                                                        <span className="text-[8px] -rotate-45 font-bold text-slate-900">{i.special_characteristic === 'In-process' ? 'SC' : 'CC'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToPfmea(i.pfmea_id); }}
                                                        className="text-emerald-600 hover:text-emerald-800 font-medium text-xs whitespace-nowrap"
                                                    >
                                                        Edit →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center text-slate-400 italic">No Process SCs identified.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dynamic Chain Visualizer Overlay/Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col min-h-0">
                    <div className="p-6 border-b bg-white rounded-t-2xl flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Propagation Chain (Golden Thread)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Select an SC row to visualize its impact chain across the system.</p>
                        </div>
                        {selectedItem && (
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {selectedItem && activeItem ? (
                            renderChains(activeItem)
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="w-16 h-16 bg-white border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                                </div>
                                <p className="text-sm font-medium">Click an SC on the left to view its chains.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
