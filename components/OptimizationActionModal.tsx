import React, { useState, useEffect } from 'react';
import { OptimizationAction, ActionLog } from '../types';

interface OptimizationActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (action: Partial<OptimizationAction>) => void;
    initialData?: Partial<OptimizationAction>;
    riskMethod: 'RPN' | 'AP';
    teamMembers: string[];
    originalS?: number;
    originalO?: number;
    originalD?: number;
}

export const OptimizationActionModal: React.FC<OptimizationActionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    riskMethod,
    teamMembers,
    originalS,
    originalO,
    originalD
}) => {
    const [formData, setFormData] = useState<Partial<OptimizationAction>>(initialData || {
        status: 'Open',
        due_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                status: 'Open',
                due_date: new Date().toISOString().split('T')[0]
            });
        }
    }, [initialData, isOpen]);

    const [newComment, setNewComment] = useState('');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editingLogText, setEditingLogText] = useState('');

    const addHistoryLog = (action: ActionLog['action'], comment: string, before?: string, after?: string) => {
        const log: ActionLog = {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: formData.responsible_owner || 'System',
            action,
            comment,
            before,
            after
        };
        setFormData(prev => ({
            ...prev,
            history: [...(prev.history || []), log]
        }));
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        addHistoryLog('Comment Added', newComment.trim());
        setNewComment('');
    };

    const handleDeleteLog = (id: string) => {
        if (!window.confirm("Delete this comment/log entry?")) return;
        setFormData(prev => ({
            ...prev,
            history: (prev.history || []).filter(log => log.id !== id)
        }));
    };

    const handleStartEditLog = (log: ActionLog) => {
        setEditingLogId(log.id);
        setEditingLogText(log.comment);
    };

    const handleSaveEditLog = () => {
        if (!editingLogId) return;
        setFormData(prev => ({
            ...prev,
            history: (prev.history || []).map(log =>
                log.id === editingLogId ? { ...log, comment: editingLogText } : log
            )
        }));
        setEditingLogId(null);
        setEditingLogText('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for changes to log them if editing existing
        if (initialData?.id) {
            if (initialData.status !== formData.status) {
                addHistoryLog('Status Changed', `Status changed to ${formData.status}`, initialData.status, formData.status);
            }
            if (initialData.due_date !== formData.due_date) {
                addHistoryLog('Deadline Changed', `Due date changed to ${formData.due_date}`, initialData.due_date, formData.due_date);
            }
        } else {
            // New action
            if (!(formData.history && formData.history.length > 0)) {
                const initialLog: ActionLog = {
                    id: `LOG-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    user: formData.responsible_owner || 'System',
                    action: 'Created',
                    comment: 'Action created'
                };
                formData.history = [initialLog];
            }
        }

        // Validation logic
        if (formData.status === 'Closed') {
            if (!formData.new_severity || !formData.new_occurrence || !formData.new_detection) {
                alert("For Closed status, you must specify the new Severity, Occurrence, and Detection scores.");
                return;
            }
        }

        if (formData.status === 'Cancelled' && !formData.comment) {
            alert("For Cancelled status, you must provide a comment/reason.");
            return;
        }

        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">Optimization Action</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel: Form */}
                    <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto border-r border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Preventive Measure</label>
                                <textarea
                                    required={formData.status !== 'Cancelled'}
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={formData.preventive_measure || ''}
                                    onChange={e => setFormData({ ...formData, preventive_measure: e.target.value })}
                                    placeholder="Describe the preventive action..."
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detection Measure</label>
                                <textarea
                                    required={formData.status !== 'Cancelled'}
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={formData.detection_measure || ''}
                                    onChange={e => setFormData({ ...formData, detection_measure: e.target.value })}
                                    placeholder="Describe the detection action..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Owner</label>
                                <select
                                    required={formData.status !== 'Cancelled'}
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                    value={formData.responsible_owner || ''}
                                    onChange={e => setFormData({ ...formData, responsible_owner: e.target.value })}
                                >
                                    <option value="">Select Owner...</option>
                                    {teamMembers && teamMembers.map((member, idx) => (
                                        <option key={idx} value={member}>{member}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    required={formData.status !== 'Cancelled'}
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                    value={formData.due_date || ''}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                    value={formData.status || 'Open'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="Open">Open</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Cancelled">Cancelled (No Action Needed)</option>
                                </select>
                            </div>
                        </div>

                        {formData.status === 'Closed' && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                                <h4 className="font-semibold text-blue-900 mb-3 text-sm">Post-Optimization Assessment</h4>

                                {/* Reference Scores */}
                                <div className="flex space-x-6 mb-4 p-2 bg-blue-100/50 rounded-md">
                                    <span className="text-xs text-blue-700 font-medium">Original Severity: <strong className="text-blue-900">{originalS}</strong></span>
                                    <span className="text-xs text-blue-700 font-medium">Original Occurrence: <strong className="text-blue-900">{originalO}</strong></span>
                                    <span className="text-xs text-blue-700 font-medium">Original Detection: <strong className="text-blue-900">{originalD}</strong></span>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">New Severity</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            required
                                            className="w-full border-blue-200 rounded-md shadow-sm border p-2"
                                            value={formData.new_severity || ''}
                                            onChange={e => setFormData({ ...formData, new_severity: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">New Occurrence</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            required
                                            className="w-full border-blue-200 rounded-md shadow-sm border p-2"
                                            value={formData.new_occurrence || ''}
                                            onChange={e => setFormData({ ...formData, new_occurrence: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">New Detection</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            required
                                            className="w-full border-blue-200 rounded-md shadow-sm border p-2"
                                            value={formData.new_detection || ''}
                                            onChange={e => setFormData({ ...formData, new_detection: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(formData.status === 'Cancelled' || formData.status === 'Closed') && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {formData.status === 'Cancelled' ? 'Reason for Cancellation (Required)' : 'Completion Comments'}
                                </label>
                                <textarea
                                    required={formData.status === 'Cancelled'}
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2"
                                    rows={2}
                                    value={formData.comment || ''}
                                    onChange={e => setFormData({ ...formData, comment: e.target.value })}
                                    placeholder={formData.status === 'Cancelled' ? "Why is no optimization action needed?" : "Any final comments..."}
                                />
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                                Save Action
                            </button>
                        </div>
                    </form>

                    {/* Right Panel: Audit Trail / Comments */}
                    <div className="w-80 p-6 bg-slate-50 flex flex-col overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 sticky top-0 bg-slate-50 py-1">Activity Log & Comments</h4>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                            {formData.history && formData.history.length > 0 ? (
                                formData.history.map((log) => (
                                    <div key={log.id} className="text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-sm group relative">
                                        <div className="flex justify-between items-start mb-1 text-[10px] text-slate-400 font-medium">
                                            <span className="font-bold text-slate-600">{log.user}</span>
                                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-semibold text-blue-600 uppercase text-[9px]">{log.action}</div>
                                            {log.action === 'Comment Added' && (
                                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleStartEditLog(log)}
                                                        className="text-slate-400 hover:text-indigo-600"
                                                        title="Edit Comment"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className="text-slate-400 hover:text-red-600"
                                                        title="Delete entry"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {editingLogId === log.id ? (
                                            <div className="mt-2">
                                                <textarea
                                                    className="w-full border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                                    rows={3}
                                                    value={editingLogText}
                                                    onChange={e => setEditingLogText(e.target.value)}
                                                />
                                                <div className="flex justify-end space-x-2 mt-1">
                                                    <button onClick={() => setEditingLogId(null)} className="text-[10px] text-slate-500 hover:text-slate-700">Cancel</button>
                                                    <button onClick={handleSaveEditLog} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-slate-700 whitespace-pre-wrap">{log.comment}</div>
                                        )}

                                        {log.before && log.after && (
                                            <div className="mt-1 pt-1 border-t border-slate-50 text-[10px] text-slate-500">
                                                <span className="line-through">{log.before}</span> → <span className="font-bold">{log.after}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    No activity recorded yet.
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 mt-auto pt-4 border-t border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Add Comment</label>
                            <div className="relative">
                                <textarea
                                    className="w-full border-slate-300 rounded-md shadow-sm border p-2 text-xs focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    rows={3}
                                    placeholder="Type a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-sm"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
