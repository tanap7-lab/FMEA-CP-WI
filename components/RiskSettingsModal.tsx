
import React, { useState } from 'react';
import { RiskSettings, RiskMethod, ApRule } from '../types';

interface RiskSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: RiskSettings;
    onSave: (settings: RiskSettings) => void;
}

export const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({
    isOpen, onClose, settings, onSave
}) => {
    const [localSettings, setLocalSettings] = useState<RiskSettings>(settings);
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'SEVERITY' | 'OCCURRENCE' | 'DETECTION' | 'LOGIC'>('GENERAL');

    // Sync when opening
    React.useEffect(() => {
        if(isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleDefinitionChange = (type: 'severity' | 'occurrence' | 'detection', level: number, text: string) => {
        setLocalSettings(prev => ({
            ...prev,
            definitions: {
                ...prev.definitions,
                [type]: {
                    ...prev.definitions[type],
                    [level]: text
                }
            }
        }));
    };

    const handleApDefinitionChange = (level: 'H' | 'M' | 'L', text: string) => {
        setLocalSettings(prev => ({
            ...prev,
            definitions: {
                ...prev.definitions,
                ap: {
                    ...prev.definitions.ap,
                    [level]: text
                }
            }
        }));
    };

    const handleAddLogicRule = () => {
        const newRule: ApRule = {
            id: `rule-${Date.now()}`,
            sMin: 1, sMax: 10,
            oMin: 1, oMax: 10,
            dMin: 1, dMax: 10,
            result: 'H'
        };
        setLocalSettings(prev => ({
            ...prev,
            apLogic: [newRule, ...prev.apLogic]
        }));
    };

    const handleUpdateLogicRule = (id: string, updates: Partial<ApRule>) => {
        setLocalSettings(prev => ({
            ...prev,
            apLogic: prev.apLogic.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
    };

    const handleDeleteLogicRule = (id: string) => {
        setLocalSettings(prev => ({
            ...prev,
            apLogic: prev.apLogic.filter(r => r.id !== id)
        }));
    };

    const renderDefinitionTable = (type: 'severity' | 'occurrence' | 'detection') => {
        return (
            <div className="overflow-auto max-h-96 border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 border-b w-16 text-center">Score</th>
                            <th className="px-4 py-2 border-b text-left">Definition / Criteria</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(score => (
                            <tr key={score}>
                                <td className="px-4 py-2 text-center font-bold text-slate-500">{score}</td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        className="w-full border-slate-200 rounded px-2 py-1 text-slate-700 focus:ring-blue-500 focus:border-blue-500"
                                        value={localSettings.definitions[type][score] || ''}
                                        onChange={e => handleDefinitionChange(type, score, e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const TabButton = ({ id, label, onClick, isActive }: { id: string, label: string, onClick: () => void, isActive: boolean }) => (
        <button 
            onClick={onClick}
            className={`px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${isActive ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-white z-10">
                    <h3 className="text-xl font-bold text-slate-800">Risk Assessment Settings</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col p-2 space-y-1">
                        <TabButton id="GENERAL" label="General & Methodology" onClick={() => setActiveTab('GENERAL')} isActive={activeTab === 'GENERAL'} />
                        <TabButton id="LOGIC" label="Action Priority Logic" onClick={() => setActiveTab('LOGIC')} isActive={activeTab === 'LOGIC'} />
                        <div className="h-px bg-slate-200 my-2"></div>
                        <TabButton id="SEVERITY" label="Severity (S)" onClick={() => setActiveTab('SEVERITY')} isActive={activeTab === 'SEVERITY'} />
                        <TabButton id="OCCURRENCE" label="Occurrence (O)" onClick={() => setActiveTab('OCCURRENCE')} isActive={activeTab === 'OCCURRENCE'} />
                        <TabButton id="DETECTION" label="Detection (D)" onClick={() => setActiveTab('DETECTION')} isActive={activeTab === 'DETECTION'} />
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto bg-white">
                        {activeTab === 'GENERAL' && (
                            <div className="space-y-8 max-w-3xl">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800 mb-4">Rating Methodology</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={`block border rounded-lg p-5 cursor-pointer transition-all relative ${localSettings.method === 'RPN' ? 'bg-white border-blue-500 ring-2 ring-blue-500 shadow-md z-10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                            <input type="radio" name="method" value="RPN" checked={localSettings.method === 'RPN'} onChange={() => setLocalSettings({...localSettings, method: 'RPN'})} className="sr-only"/>
                                            <div className="font-bold text-slate-800 text-lg mb-2">RPN</div>
                                            <div className="text-sm text-slate-500">Risk Priority Number<br/>(Severity × Occurrence × Detection)</div>
                                        </label>
                                        <label className={`block border rounded-lg p-5 cursor-pointer transition-all relative ${localSettings.method === 'AP' ? 'bg-white border-blue-500 ring-2 ring-blue-500 shadow-md z-10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                            <input type="radio" name="method" value="AP" checked={localSettings.method === 'AP'} onChange={() => setLocalSettings({...localSettings, method: 'AP'})} className="sr-only"/>
                                            <div className="font-bold text-slate-800 text-lg mb-2">Action Priority</div>
                                            <div className="text-sm text-slate-500">AIAG-VDA Standard<br/>(High/Medium/Low Logic Table)</div>
                                        </label>
                                    </div>
                                </div>

                                {localSettings.method === 'RPN' && (
                                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                                        <h4 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">
                                            RPN Color Thresholds
                                        </h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">Medium Risk (Yellow) &gt;</label>
                                                <input 
                                                    type="number" 
                                                    value={localSettings.rpnThresholds.medium} 
                                                    onChange={e => setLocalSettings({...localSettings, rpnThresholds: {...localSettings.rpnThresholds, medium: parseInt(e.target.value)}})} 
                                                    className="w-full border-slate-300 rounded shadow-sm p-3 text-sm border focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2">High Risk (Red) &gt;</label>
                                                <input 
                                                    type="number" 
                                                    value={localSettings.rpnThresholds.high} 
                                                    onChange={e => setLocalSettings({...localSettings, rpnThresholds: {...localSettings.rpnThresholds, high: parseInt(e.target.value)}})} 
                                                    className="w-full border-slate-300 rounded shadow-sm p-3 text-sm border focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {localSettings.method === 'AP' && (
                                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-6">
                                             <h4 className="font-bold text-slate-800">Action Priority Definitions</h4>
                                             <span className="text-[10px] uppercase font-bold text-slate-500 bg-white border px-2 py-1 rounded shadow-sm">Based on AIAG-VDA Table</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center">
                                                <div className="w-24 shrink-0 bg-red-100 text-red-800 rounded-lg p-2.5 text-xs font-bold border border-red-200 text-center mr-4">High (H)</div>
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border-slate-300 rounded-lg shadow-sm p-2.5 text-sm border focus:ring-blue-500 focus:border-blue-500"
                                                    value={localSettings.definitions.ap.H}
                                                    onChange={(e) => handleApDefinitionChange('H', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <div className="w-24 shrink-0 bg-yellow-100 text-yellow-800 rounded-lg p-2.5 text-xs font-bold border border-yellow-200 text-center mr-4">Medium (M)</div>
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border-slate-300 rounded-lg shadow-sm p-2.5 text-sm border focus:ring-blue-500 focus:border-blue-500"
                                                    value={localSettings.definitions.ap.M}
                                                    onChange={(e) => handleApDefinitionChange('M', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <div className="w-24 shrink-0 bg-green-100 text-green-800 rounded-lg p-2.5 text-xs font-bold border border-green-200 text-center mr-4">Low (L)</div>
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border-slate-300 rounded-lg shadow-sm p-2.5 text-sm border focus:ring-blue-500 focus:border-blue-500"
                                                    value={localSettings.definitions.ap.L}
                                                    onChange={(e) => handleApDefinitionChange('L', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'LOGIC' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800">Action Priority Logic Map</h4>
                                        <p className="text-sm text-slate-500">Define the mapping of S, O, and D to Action Priority levels.</p>
                                    </div>
                                    <button onClick={handleAddLogicRule} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium">
                                        + Add Logic Rule
                                    </button>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                                    <strong>Logic Order:</strong> The system evaluates rules from top to bottom. The first matching rule determines the Action Priority. If no rule matches, "Low" is assigned by default.
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Severity (S)</th>
                                                <th className="px-4 py-2 text-left">Occurrence (O)</th>
                                                <th className="px-4 py-2 text-left">Detection (D)</th>
                                                <th className="px-4 py-2 text-center">Result</th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {localSettings.apLogic.map((rule) => (
                                                <tr key={rule.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.sMin} onChange={e => handleUpdateLogicRule(rule.id, { sMin: parseInt(e.target.value) })} />
                                                            <span>-</span>
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.sMax} onChange={e => handleUpdateLogicRule(rule.id, { sMax: parseInt(e.target.value) })} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.oMin} onChange={e => handleUpdateLogicRule(rule.id, { oMin: parseInt(e.target.value) })} />
                                                            <span>-</span>
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.oMax} onChange={e => handleUpdateLogicRule(rule.id, { oMax: parseInt(e.target.value) })} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.dMin} onChange={e => handleUpdateLogicRule(rule.id, { dMin: parseInt(e.target.value) })} />
                                                            <span>-</span>
                                                            <input type="number" min="1" max="10" className="w-12 border rounded px-1 py-0.5 text-center" value={rule.dMax} onChange={e => handleUpdateLogicRule(rule.id, { dMax: parseInt(e.target.value) })} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <select 
                                                            className={`border rounded px-2 py-1 font-bold ${rule.result === 'H' ? 'text-red-600 bg-red-50' : rule.result === 'M' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}
                                                            value={rule.result}
                                                            onChange={e => handleUpdateLogicRule(rule.id, { result: e.target.value as 'H'|'M'|'L' })}
                                                        >
                                                            <option value="H">High</option>
                                                            <option value="M">Medium</option>
                                                            <option value="L">Low</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button onClick={() => handleDeleteLogicRule(rule.id)} className="text-slate-400 hover:text-red-500">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'SEVERITY' && (
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold text-slate-800">Severity Definitions</h4>
                                <p className="text-sm text-slate-500">Define the criteria for Severity ranking (1-10).</p>
                                {renderDefinitionTable('severity')}
                            </div>
                        )}

                        {activeTab === 'OCCURRENCE' && (
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold text-slate-800">Occurrence Definitions</h4>
                                <p className="text-sm text-slate-500">Define the criteria for Occurrence ranking (1-10).</p>
                                {renderDefinitionTable('occurrence')}
                            </div>
                        )}

                        {activeTab === 'DETECTION' && (
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold text-slate-800">Detection Definitions</h4>
                                <p className="text-sm text-slate-500">Define the criteria for Detection ranking (1-10).</p>
                                {renderDefinitionTable('detection')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end z-10">
                    <button onClick={onClose} className="px-5 py-2 text-slate-600 hover:text-slate-800 font-medium mr-2">Cancel</button>
                    <button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">Apply Settings</button>
                </div>
            </div>
        </div>
    );
};
