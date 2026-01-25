

import React, { useState } from 'react';

interface AdminSettingsProps {
    businessAreas: string[];
    locations: string[];
    businessAreaLocationMap?: Record<string, string[]>;
    onUpdateBusinessAreas: (areas: string[]) => void;
    onUpdateLocations: (locs: string[]) => void;
    onUpdateAssociations?: (map: Record<string, string[]>) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
    businessAreas,
    locations,
    businessAreaLocationMap = {},
    onUpdateBusinessAreas,
    onUpdateLocations,
    onUpdateAssociations
}) => {
    const [newArea, setNewArea] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [linkingArea, setLinkingArea] = useState<string | null>(null);

    const addArea = () => {
        if (newArea.trim() && !businessAreas.includes(newArea.trim())) {
            onUpdateBusinessAreas([...businessAreas, newArea.trim()]);
            setNewArea('');
        }
    };

    const removeArea = (area: string) => {
        if(window.confirm(`Delete Business Area: "${area}"?`)) {
            // Remove from list
            onUpdateBusinessAreas(businessAreas.filter(a => a !== area));
            
            // Clean up map
            if (onUpdateAssociations) {
                const newMap = { ...businessAreaLocationMap };
                delete newMap[area];
                onUpdateAssociations(newMap);
            }
        }
    };

    const addLocation = () => {
        if (newLocation.trim() && !locations.includes(newLocation.trim())) {
            onUpdateLocations([...locations, newLocation.trim()]);
            setNewLocation('');
        }
    };

    const removeLocation = (loc: string) => {
        if(window.confirm(`Delete Location: "${loc}"?`)) {
            // Remove from list
            onUpdateLocations(locations.filter(l => l !== loc));
            
            // Clean up from all associations
            if (onUpdateAssociations) {
                const newMap: Record<string, string[]> = {};
                Object.keys(businessAreaLocationMap).forEach(key => {
                    newMap[key] = businessAreaLocationMap[key].filter(l => l !== loc);
                });
                onUpdateAssociations(newMap);
            }
        }
    };

    const toggleAssociation = (loc: string) => {
        if (!linkingArea || !onUpdateAssociations) return;
        
        const currentLinks = businessAreaLocationMap[linkingArea] || [];
        const newLinks = currentLinks.includes(loc) 
            ? currentLinks.filter(l => l !== loc)
            : [...currentLinks, loc];
            
        onUpdateAssociations({
            ...businessAreaLocationMap,
            [linkingArea]: newLinks
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Admin Backend - List Management</h2>
                <p className="text-slate-500 text-sm mb-6">Manage global dropdown lists available for all projects.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Business Areas */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Business Areas
                        </h3>
                        <div className="flex space-x-2 mb-3">
                            <input 
                                type="text" 
                                className="flex-1 border rounded px-3 py-2 text-sm" 
                                placeholder="New Business Area..." 
                                value={newArea}
                                onChange={e => setNewArea(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addArea()}
                            />
                            <button onClick={addArea} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">Add</button>
                        </div>
                        <ul className="border rounded divide-y max-h-96 overflow-auto bg-slate-50">
                            {businessAreas.map(area => (
                                <li key={area} className="px-3 py-2 flex justify-between items-center text-sm hover:bg-slate-100 group transition-colors">
                                    <span className="font-medium text-slate-700">{area}</span>
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setLinkingArea(area)}
                                            className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                            title="Manage Location Associations"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => removeArea(area)} 
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Locations */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Locations
                        </h3>
                         <div className="flex space-x-2 mb-3">
                            <input 
                                type="text" 
                                className="flex-1 border rounded px-3 py-2 text-sm" 
                                placeholder="New Location..." 
                                value={newLocation}
                                onChange={e => setNewLocation(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addLocation()}
                            />
                            <button onClick={addLocation} className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700 transition-colors">Add</button>
                        </div>
                        <ul className="border rounded divide-y max-h-96 overflow-auto bg-slate-50">
                            {locations.map(loc => (
                                <li key={loc} className="px-3 py-2 flex justify-between items-center text-sm hover:bg-slate-100 group transition-colors">
                                    <span className="text-slate-700">{loc}</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => removeLocation(loc)} 
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Link Locations Modal */}
            {linkingArea && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Manage Locations</h3>
                            <button onClick={() => setLinkingArea(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">
                                Select valid locations for <strong>{linkingArea}</strong>.
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2 custom-scrollbar">
                                {locations.length === 0 && <p className="text-xs text-slate-400 italic">No locations defined.</p>}
                                {locations.map(loc => {
                                    const isLinked = (businessAreaLocationMap[linkingArea] || []).includes(loc);
                                    return (
                                        <label key={loc} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isLinked} 
                                                onChange={() => toggleAssociation(loc)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                            />
                                            <span className={`text-sm ${isLinked ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{loc}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 border-t flex justify-end">
                            <button onClick={() => setLinkingArea(null)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
