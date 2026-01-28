
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
  idKey: keyof T; // Required to identify rows for highlighting
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onOpenSettings?: () => void;
  onRowClick?: (item: T) => void;
  highlights?: Record<string, 'focus' | 'parent' | 'child' | 'error' | 'warning'>; // Map of ID -> Highlight Type
  colorTheme: 'blue' | 'green' | 'indigo';
  customActions?: React.ReactNode;
  renderRowActions?: (item: T) => React.ReactNode;
}

export function FmeaTable<T>({
  title, data, columns, idKey, onAdd, onEdit, onDelete, onOpenSettings, onRowClick, highlights, colorTheme, customActions, renderRowActions
}: FmeaTableProps<T>) {

  const getThemeClasses = () => {
    switch (colorTheme) {
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'green': return 'bg-green-50 border-green-200 text-green-700';
      case 'indigo': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getHeaderClasses = () => {
    switch (colorTheme) {
      case 'blue': return 'bg-blue-600 text-white';
      case 'green': return 'bg-emerald-600 text-white';
      case 'indigo': return 'bg-indigo-600 text-white';
    }
  };

  const hasHighlights = highlights && Object.keys(highlights).length > 0;

  const renderConnectionBadge = (type: 'focus' | 'parent' | 'child' | 'error' | 'warning') => {
    if (type === 'parent') {
      return (
        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wide mr-2 mb-1">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          Caused By (Parent)
        </div>
      );
    } else if (type === 'child') {
      return (
        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide mr-2 mb-1">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          Causes (Child)
        </div>
      );
    } else if (type === 'focus') {
      return (
        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide mr-2 mb-1">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          Selected Focus
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col h-full transition-all">
      <div className={`px-6 py-4 border-b flex justify-between items-center ${getThemeClasses()}`}>
        <div className="flex flex-col">
          <h3 className="font-bold text-lg">{title}</h3>
          {hasHighlights && (
            <div className="flex items-center space-x-3 mt-1 text-[10px] uppercase font-bold tracking-wider">
              <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                Effect (Parent)
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Selected
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                Cause (Child)
              </span>
            </div>
          )}
        </div>
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

      <div className="overflow-auto flex-1 custom-scrollbar relative">
        <table className="w-full text-sm text-left border-collapse">
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
              data.map((item, idx) => {
                const id = String((item as any)[idKey]);
                const highlightType = highlights ? highlights[id] : undefined;

                // Row Styling based on highlight
                let rowClass = "hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 border-transparent relative";
                if (hasHighlights) {
                  if (highlightType === 'focus') rowClass = "bg-blue-50/80 hover:bg-blue-100 border-l-4 border-l-blue-600 shadow-md z-10 scale-[1.002] transition-transform";
                  else if (highlightType === 'parent') rowClass = "bg-orange-50/50 hover:bg-orange-100 border-l-4 border-l-orange-400";
                  else if (highlightType === 'child') rowClass = "bg-green-50/50 hover:bg-green-100 border-l-4 border-l-green-500";
                  else if (highlightType === 'error') rowClass = "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-600";
                  else if (highlightType === 'warning') rowClass = "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-400";
                  else rowClass = "opacity-40 hover:opacity-60 grayscale-[0.5] transition-opacity blur-[0.5px] hover:blur-0";
                }

                return (
                  <tr
                    key={id}
                    className={rowClass}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={col.key as string} className="px-4 py-3 border-r border-slate-100 last:border-r-0 align-top max-w-xs break-words relative">
                        {colIdx === 0 && highlightType && (
                          <div className="mb-1">
                            {renderConnectionBadge(highlightType)}
                          </div>
                        )}
                        {col.key === 'actions' ? (
                          <div className="flex items-center justify-end space-x-2">
                            {renderRowActions && (
                              <>
                                {renderRowActions(item)}
                                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                              </>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="text-red-500 hover:text-red-700 text-xs font-medium px-1">Delete</button>
                          </div>
                        ) : (
                          col.render ? col.render(item) : (item as any)[col.key]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
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
