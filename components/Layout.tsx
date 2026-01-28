
import React from 'react';
import { ViewMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  projectName?: string;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onNavigate,
  projectName
}) => {
  const navItems: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'DASHBOARD', label: 'Project Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'DFMEA', label: 'Design FMEA', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z' },
    { id: 'PFMEA', label: 'Process FMEA', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { id: 'SPECIAL_CHARACTERISTICS', label: 'Special Characteristics', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { id: 'OPTIMIZATION', label: 'Optimization Action', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'CONTROL_PLAN', label: 'Control Plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'WORK_INSTRUCTIONS', label: 'Work Instructions', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'TRACEABILITY', label: 'Traceability Matrix', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' }
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            QualityChain
          </h1>
          <p className="text-xs text-slate-400 mt-1">AIAG-VDA Standard</p>
        </div>

        {projectName && (
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current Project</p>
            <p className="text-sm font-semibold truncate text-blue-200" title={projectName}>{projectName}</p>

            <button
              onClick={() => onNavigate('PROJECT_SETTINGS')}
              className={`mt-2 text-xs flex items-center hover:text-white transition-colors ${currentView === 'PROJECT_SETTINGS' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Project Settings
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  disabled={!projectName && item.id !== 'DASHBOARD' && item.id !== 'ADMIN'}
                  className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${currentView === item.id
                    ? 'bg-blue-600 text-white border-r-4 border-blue-300'
                    : !projectName && item.id !== 'DASHBOARD' && item.id !== 'ADMIN'
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <svg className={`w-5 h-5 mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 px-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => onNavigate('ADMIN')}
              className={`w-full flex items-center text-xs font-medium transition-colors ${currentView === 'ADMIN' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Admin Settings
            </button>
          </div>
        </nav>

        <div className="p-4 bg-slate-900 border-t border-slate-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
              JD
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">John Doe</p>
              <p className="text-xs text-slate-400">Quality Engineer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-100 relative">
        {children}
      </main>
    </div>
  );
};
