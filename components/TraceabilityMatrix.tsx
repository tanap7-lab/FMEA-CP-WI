import React from 'react';
import { DfmeaItem, PfmeaItem, ControlPlanItem } from '../types';

interface TraceabilityMatrixProps {
  dfmeaItems: DfmeaItem[];
  pfmeaItems: PfmeaItem[];
  controlPlanItems: ControlPlanItem[];
}

export const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = ({
  dfmeaItems,
  pfmeaItems,
  controlPlanItems
}) => {
  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-2">The Golden Thread</h3>
          <p className="text-sm text-slate-600 max-w-3xl">
              Visualizing the lineage of quality control. 
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mx-2"></span> Design Requirements drive 
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full mx-2"></span> Process Steps, which are monitored by 
              <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mx-2"></span> Control Plans.
          </p>
      </div>

      <div className="flex flex-col space-y-4">
        {dfmeaItems.map(d => {
          const relatedPfmeas = pfmeaItems.filter(p => p.linked_dfmea_id === d.dfmea_id);
          
          return (
            <div key={d.dfmea_id} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Level 1: DFMEA */}
              <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-start">
                 <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mr-3 mt-1">DFMEA</div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <span className="text-xs text-blue-600 font-semibold uppercase block">Function</span>
                        <span className="text-sm font-medium text-slate-800">{d.item_function}</span>
                    </div>
                    <div>
                        <span className="text-xs text-blue-600 font-semibold uppercase block">Requirement</span>
                        <span className="text-sm text-slate-700">{d.requirement}</span>
                    </div>
                    <div>
                        <span className="text-xs text-blue-600 font-semibold uppercase block">Failure Mode</span>
                        <span className="text-sm text-slate-700">{d.failure_mode}</span>
                    </div>
                 </div>
                 <div className="ml-4 flex flex-col items-end">
                    <span className="text-xs text-slate-500">Severity</span>
                    <span className="font-bold text-lg text-slate-800">{d.severity_score}</span>
                 </div>
              </div>

              {/* Level 2: PFMEA */}
              {relatedPfmeas.length > 0 ? (
                <div className="bg-slate-50 p-4 pl-12 space-y-4">
                    {relatedPfmeas.map(p => {
                        const relatedCps = controlPlanItems.filter(cp => cp.pfmea_link_id === p.pfmea_id);
                        return (
                            <div key={p.pfmea_id} className="relative">
                                {/* Connector Line */}
                                <div className="absolute -left-6 top-6 w-6 h-px bg-slate-300"></div>
                                <div className="absolute -left-6 top-0 bottom-0 w-px bg-slate-300 h-full"></div>

                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <div className="flex items-start">
                                        <div className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded mr-3 mt-1">PFMEA</div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <span className="text-xs text-emerald-600 font-semibold uppercase block">Process Step {p.process_step_number}</span>
                                                <span className="text-sm font-medium text-slate-800">{p.process_function}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-emerald-600 font-semibold uppercase block">Cause</span>
                                                <span className="text-sm text-slate-700">{p.failure_cause}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-emerald-600 font-semibold uppercase block">Controls</span>
                                                <div className="text-sm text-slate-700">
                                                    <span className="block text-xs text-slate-500">Prev: {p.prevention_control}</span>
                                                    <span className="block text-xs text-slate-500">Det: {p.detection_control}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Level 3: Control Plan */}
                                    {relatedCps.length > 0 && (
                                        <div className="mt-4 pl-8 border-t border-emerald-100 pt-4 space-y-2">
                                            {relatedCps.map(cp => (
                                                <div key={cp.cp_id} className="flex items-center bg-indigo-50 border border-indigo-100 rounded p-2 text-sm">
                                                    <div className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-3">CP</div>
                                                    <div className="grid grid-cols-4 gap-4 w-full items-center">
                                                        <div>
                                                            <span className="text-[10px] text-indigo-500 uppercase block">Char.</span>
                                                            <span className="font-medium">{cp.product_characteristic}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-indigo-500 uppercase block">Method</span>
                                                            <span>{cp.evaluation_technique}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-indigo-500 uppercase block">Sample</span>
                                                            <span>{cp.sample_size} / {cp.sample_freq}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-indigo-500 uppercase block">Reaction</span>
                                                            <span className="text-red-600 font-medium">{cp.reaction_plan}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-slate-400 italic bg-slate-50">
                    No linked Process FMEA items found.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
