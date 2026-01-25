

import React, { useState, useEffect } from 'react';
import { ProjectMaster, RiskSettings, ApRule } from '../types';

interface ProjectSettingsProps {
    project: ProjectMaster;
    riskSettings: RiskSettings;
    businessAreas: string[];
    locations: string[];
    businessAreaLocationMap?: Record<string, string[]>;
    onUpdateProject: (updatedProject: ProjectMaster) => void;
    onUpdateRiskSettings: (settings: RiskSettings) => void;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
    project,
    riskSettings,
    businessAreas,
    locations,
    businessAreaLocationMap = {},
    onUpdateProject,
    onUpdateRiskSettings
}) => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'RISK'>('GENERAL');
    
    // --- General Tab State ---
    const [formData, setFormData] = useState<ProjectMaster>(project);
    const [newMember, setNewMember] = useState('');

    useEffect(() => {
        setFormData(project);
    }, [project]);

    // Derived Locations based on Business Area Constraint
    const availableLocations = React.useMemo(() => {
        if (formData.business_area && businessAreaLocationMap[formData.business_area]) {
            return businessAreaLocationMap[formData.business_area];
        }
        // If no Business Area selected, or no constraints defined, show all?
        // Usually constraints imply restriction. If map exists but empty, shows empty.
        // If map key doesn't exist (new area), show all? Let's assume show all if no key.
        if (formData.business_area && !(formData.business_area in businessAreaLocationMap)) {
            return locations;
        }
        return locations;
    }, [formData.business_area, businessAreaLocationMap, locations]);

    const handleGeneralChange = (key: keyof ProjectMaster, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [key]: value };
            
            // Auto-clear location if it becomes invalid after business area change
            if (key === 'business_area') {
                const validLocs = value && businessAreaLocationMap[value] 
                    ? businessAreaLocationMap[value] 
                    : locations; // Fallback
                
                // If map has constraints for this area
                if (value in businessAreaLocationMap) {
                     if (!validLocs.includes(updated.location || '')) {
                        updated.location = '';
                    }
                }
            }
            return updated;
        });
    };

    const handleAddMember = () => {
        if (newMember.trim()) {
            const updatedMembers = [...formData.core_team_members, newMember.trim()];
            setFormData(prev => ({ ...prev, core_team_members: updatedMembers }));
            setNewMember('');
        }
    };

    const handleRemoveMember = (index: number) => {
        const updatedMembers = formData.core_team_members.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, core_team_members: updatedMembers }));
    };

    const handleSaveGeneral = () => {
        onUpdateProject(formData);
        alert("Project details updated successfully.");
    };

    // --- Risk Tab State ---
    const [localSettings, setLocalSettings] = useState<RiskSettings>(riskSettings);
    
    useEffect(() => {
        setLocalSettings(riskSettings);
    }, [riskSettings]);

    const handleDefinitionChange = (type: 'severity' | 'occurrence' | 'detection', level: number, text: string) => {
        setLocalSettings(prev => ({
            ...prev,
            definitions: {
                ...prev.definitions,
                [type]: { ...prev.definitions[type], [level]: text }
            }
        }));
    };
    
    const handleApDefinitionChange = (level: 'H' | 'M' | 'L', text: string) => {
        setLocalSettings(prev => ({
            ...prev,
            definitions: {
                ...prev.definitions,
                ap: { ...prev.definitions.ap, [level]: text }
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

    const handleSaveRisk = () => {
        onUpdateRiskSettings(localSettings);
        alert("Risk settings updated successfully.");
    };

    // --- Render Logic ---

    const renderDefinitionTable = (type: 'severity' | 'occurrence' | 'detection') => (
        <div className="overflow-auto max-h-80 border rounded-lg bg-white">
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

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
            <div className="border-b border-slate-200">
                <nav className="flex -mb-px px-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('GENERAL')}
                        className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'GENERAL'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        General Information
                    </button>
                    <button
                        onClick={() => setActiveTab('RISK')}
                        className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'RISK'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Risk Configuration (S/O/D/AP)
                    </button>
                </nav>
            </div>

            <div className="p-8 flex-1 overflow-auto">
                {activeTab === 'GENERAL' && (
                    <div className="max-w-4xl space-y-8">
                        {/* Basic Details */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Project Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.part_name} onChange={e => handleGeneralChange('part_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Part Number</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.part_number} onChange={e => handleGeneralChange('part_number', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Process ID</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.process_id || ''} onChange={e => handleGeneralChange('process_id', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.customer || ''} onChange={e => handleGeneralChange('customer', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.product || ''} onChange={e => handleGeneralChange('product', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Revision Level</label>
                                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                        value={formData.revision_level} onChange={e => handleGeneralChange('revision_level', e.target.value)} />
                                </div>
                                <div className="col-span-2 border border-blue-200 rounded-lg p-4 bg-blue-50/50 mt-2">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Business Area</label>
                                            <select className="w-full border-slate-300 rounded-md shadow-sm border p-2 bg-white"
                                                value={formData.business_area || ''} onChange={e => handleGeneralChange('business_area', e.target.value)}>
                                                <option value="">Select...</option>
                                                {businessAreas.map(ba => <option key={ba} value={ba}>{ba}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                            <select 
                                                className="w-full border-slate-300 rounded-md shadow-sm border p-2 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                value={formData.location || ''} 
                                                onChange={e => handleGeneralChange('location', e.target.value)}
                                                disabled={!formData.business_area}
                                            >
                                                <option value="">{formData.business_area ? "Select..." : "Select Business Area first"}</option>
                                                {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                            </select>
                                            {formData.business_area && availableLocations.length === 0 && (
                                                <p className="text-xs text-red-500 mt-1">No valid locations found for this Business Area.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Team Members */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Core Team Members</h3>
                            <div className="flex space-x-2 mb-3">
                                <input 
                                    type="text" 
                                    className="flex-1 border-slate-300 rounded-md shadow-sm border p-2"
                                    placeholder="Add team member name..."
                                    value={newMember}
                                    onChange={e => setNewMember(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                                />
                                <button onClick={handleAddMember} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded text-slate-700 font-medium">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.core_team_members.map((member, idx) => (
                                    <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                        {member}
                                        <button onClick={() => handleRemoveMember(idx)} className="ml-2 hover:text-blue-900">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </section>

                        <div className="pt-4 flex justify-end">
                            <button onClick={handleSaveGeneral} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm">
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'RISK' && (
                     <div className="max-w-6xl space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Methodology</h3>
                            <button onClick={handleSaveRisk} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm">
                                Save Risk Settings
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`block border rounded-lg p-5 cursor-pointer transition-all relative ${localSettings.method === 'RPN' ? 'bg-white border-blue-500 ring-2 ring-blue-500 shadow-md z-10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="method" value="RPN" checked={localSettings.method === 'RPN'} onChange={() => setLocalSettings({...localSettings, method: 'RPN'})} className="sr-only"/>
                                <div className="font-bold text-slate-800 text-lg mb-2">RPN</div>
                                <div className="text-sm text-slate-500">Risk Priority Number (S × O × D)</div>
                            </label>
                            <label className={`block border rounded-lg p-5 cursor-pointer transition-all relative ${localSettings.method === 'AP' ? 'bg-white border-blue-500 ring-2 ring-blue-500 shadow-md z-10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="method" value="AP" checked={localSettings.method === 'AP'} onChange={() => setLocalSettings({...localSettings, method: 'AP'})} className="sr-only"/>
                                <div className="font-bold text-slate-800 text-lg mb-2">Action Priority</div>
                                <div className="text-sm text-slate-500">AIAG-VDA Standard (Logic Table)</div>
                            </label>
                        </div>

                        {localSettings.method === 'AP' && (
                             <section className="bg-slate-50 p-6 rounded-lg border">
                                <h3 className="font-bold text-slate-700 mb-4">AP Logic Map</h3>
                                <div className="mb-4 text-xs text-blue-800 bg-blue-50 border border-blue-100 p-2 rounded">Logic evaluates top-down. First match wins. Default is Low.</div>
                                <div className="overflow-hidden bg-white rounded border mb-4">
                                     <table className="w-full text-sm">
                                        <thead className="bg-slate-100 font-bold text-slate-600 text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-2">Severity</th>
                                                <th className="px-4 py-2">Occurrence</th>
                                                <th className="px-4 py-2">Detection</th>
                                                <th className="px-4 py-2 text-center">Result</th>
                                                <th className="px-4 py-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {localSettings.apLogic.map(rule => (
                                                <tr key={rule.id}>
                                                    <td className="px-4 py-1.5"><div className="flex items-center space-x-1"><input type="number" className="w-12 border p-1 rounded text-center" value={rule.sMin} onChange={e => handleUpdateLogicRule(rule.id, {sMin: parseInt(e.target.value)})} /><span>-</span><input type="number" className="w-12 border p-1 rounded text-center" value={rule.sMax} onChange={e => handleUpdateLogicRule(rule.id, {sMax: parseInt(e.target.value)})} /></div></td>
                                                    <td className="px-4 py-1.5"><div className="flex items-center space-x-1"><input type="number" className="w-12 border p-1 rounded text-center" value={rule.oMin} onChange={e => handleUpdateLogicRule(rule.id, {oMin: parseInt(e.target.value)})} /><span>-</span><input type="number" className="w-12 border p-1 rounded text-center" value={rule.oMax} onChange={e => handleUpdateLogicRule(rule.id, {oMax: parseInt(e.target.value)})} /></div></td>
                                                    <td className="px-4 py-1.5"><div className="flex items-center space-x-1"><input type="number" className="w-12 border p-1 rounded text-center" value={rule.dMin} onChange={e => handleUpdateLogicRule(rule.id, {dMin: parseInt(e.target.value)})} /><span>-</span><input type="number" className="w-12 border p-1 rounded text-center" value={rule.dMax} onChange={e => handleUpdateLogicRule(rule.id, {dMax: parseInt(e.target.value)})} /></div></td>
                                                    <td className="px-4 py-1.5 text-center">
                                                        <select value={rule.result} onChange={e => handleUpdateLogicRule(rule.id, {result: e.target.value as any})} className="border p-1 rounded font-bold">
                                                            <option value="H">High</option><option value="M">Medium</option><option value="L">Low</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center"><button onClick={() => handleDeleteLogicRule(rule.id)} className="text-red-500 hover:text-red-700">&times;</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                     </table>
                                </div>
                                <button onClick={handleAddLogicRule} className="text-sm text-blue-600 font-medium">+ Add Rule</button>
                             </section>
                        )}

                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <h4 className="font-bold text-slate-700 mb-2">Severity (S) Definitions</h4>
                                {renderDefinitionTable('severity')}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700 mb-2">Occurrence (O) Definitions</h4>
                                {renderDefinitionTable('occurrence')}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700 mb-2">Detection (D) Definitions</h4>
                                {renderDefinitionTable('detection')}
                            </div>
                        </div>

                        {localSettings.method === 'AP' && (
                             <div className="mt-6 border-t pt-4">
                                <h4 className="font-bold text-slate-700 mb-2">Action Priority Definitions</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex items-center"><span className="w-20 bg-red-100 text-red-800 text-xs font-bold p-2 text-center rounded mr-2">High</span><input type="text" className="border rounded p-1.5 w-full text-sm" value={localSettings.definitions.ap.H} onChange={e => handleApDefinitionChange('H', e.target.value)}/></div>
                                    <div className="flex items-center"><span className="w-20 bg-yellow-100 text-yellow-800 text-xs font-bold p-2 text-center rounded mr-2">Medium</span><input type="text" className="border rounded p-1.5 w-full text-sm" value={localSettings.definitions.ap.M} onChange={e => handleApDefinitionChange('M', e.target.value)}/></div>
                                    <div className="flex items-center"><span className="w-20 bg-green-100 text-green-800 text-xs font-bold p-2 text-center rounded mr-2">Low</span><input type="text" className="border rounded p-1.5 w-full text-sm" value={localSettings.definitions.ap.L} onChange={e => handleApDefinitionChange('L', e.target.value)}/></div>
                                </div>
                             </div>
                        )}
                     </div>
                )}
            </div>
        </div>
    );
};
