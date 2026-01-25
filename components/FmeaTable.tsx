import React, { useState } from 'react';
import { DfmeaItem, PfmeaItem, ControlPlanItem, Severity, Occurrence, Detection } from '../types';

interface Column<T> {
  key: keyof T | 'actions' | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface FmeaTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onOpenSettings?: () => void;
  colorTheme: 'blue' | 'green' | 'indigo';
  customActions?: React.ReactNode;
  renderRowActions?: (item: T) => React.ReactNode;
}

export function FmeaTable<T>({ 
  title, data, columns, onAdd, onEdit, onDelete, onOpenSettings, colorTheme, customActions, renderRowActions 
}: FmeaTableProps<T>) {
  
  const getThemeClasses = () => {
    switch(colorTheme) {
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'green': return 'bg-green-50 border-green-200 text-green-700';
      case 'indigo': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getHeaderClasses = () => {
    switch(colorTheme) {
      case 'blue': return 'bg-blue-600 text-white';
      case 'green': return 'bg-emerald-600 text-white';
      case 'indigo': return 'bg-indigo-600 text-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className={`px-6 py-4 border-b flex justify-between items-center ${getThemeClasses()}`}>
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="flex space-x-2">
            {customActions}
            {onOpenSettings && (
                <button 
                  onClick={onOpenSettings}
                  className="bg-white/80 hover:bg-white text-slate-800 px-3 py-1.5 rounded text-sm font-medium shadow-sm transition-colors flex items-center border border-transparent hover:border-slate-300"
                  title="Risk Assessment Settings"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </button>
            )}
            <button 
              onClick={onAdd}
              className="bg-white/80 hover:bg-white text-slate-800 px-3 py-1.5 rounded text-sm font-medium shadow-sm transition-colors flex items-center border border-transparent hover:border-slate-300"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Item
            </button>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className={`text-xs uppercase font-semibold sticky top-0 z-10 ${getHeaderClasses()}`}>
            <tr>
              {columns.map(col => (
                <th key={col.key as string} className="px-4 py-3 whitespace-nowrap tracking-wider border-r border-white/20 last:border-r-0" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
                <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                        No items found. Click "Add Item" to start.
                    </td>
                </tr>
            ) : (
                data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    {columns.map(col => (
                    <td key={col.key as string} className="px-4 py-3 border-r border-slate-100 last:border-r-0 align-top max-w-xs break-words">
                        {col.key === 'actions' ? (
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {renderRowActions && (
                                  <>
                                    {renderRowActions(item)}
                                    <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                  </>
                                )}
                                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1">Edit</button>
                                <button onClick={() => onDelete(item[Object.keys(item)[0]] as string)} className="text-red-500 hover:text-red-700 text-xs font-medium px-1">Delete</button>
                            </div>
                        ) : (
                            col.render ? col.render(item) : (item as any)[col.key]
                        )}
                    </td>
                    ))}
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// RpnBadge and ApBadge remain the same, just keeping the file structure clean
export const RpnBadge: React.FC<{ value: number, thresholds?: { medium: number, high: number } }> = ({ value, thresholds }) => {
  const t = thresholds || { medium: 100, high: 200 };
  let color = 'bg-green-100 text-green-800';
  if (value > t.high) color = 'bg-red-100 text-red-800';
  else if (value > t.medium) color = 'bg-yellow-100 text-yellow-800';
  
  return (
    <span className={`px-2 py-1 rounded font-bold text-xs ${color}`}>
      {value}
    </span>
  );
};

export const ApBadge: React.FC<{ value: 'H' | 'M' | 'L' }> = ({ value }) => {
    let color = 'bg-green-100 text-green-800';
    let label = 'L';
    
    if (value === 'H') {
        color = 'bg-red-100 text-red-800';
        label = 'H';
    } else if (value === 'M') {
        color = 'bg-yellow-100 text-yellow-800';
        label = 'M';
    }
    
    return (
      <span className={`px-3 py-1 rounded font-bold text-xs ${color} border border-black/5`}>
        {label}
      </span>
    );
};
