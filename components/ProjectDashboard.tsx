import React, { useState } from 'react';
import { ProjectMaster } from '../types';

interface ProjectDashboardProps {
  projects: ProjectMaster[];
  onSelectProject: (id: string) => void;
  onAddProject: (project: ProjectMaster) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects, onSelectProject, onAddProject, onDeleteProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<ProjectMaster>>({
    part_number: '',
    part_name: '',
    revision_level: '',
    core_team_members: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `PROJ-${Math.floor(Math.random() * 1000)}`;
    onAddProject({
      ...newProject as ProjectMaster,
      project_id: id,
      core_team_members: typeof newProject.core_team_members === 'string' 
        ? (newProject.core_team_members as string).split(',').map(s => s.trim()) 
        : []
    });
    setIsModalOpen(false);
    setNewProject({ part_number: '', part_name: '', revision_level: '', core_team_members: [] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-medium text-slate-700">Select a Project to Begin</h3>
           <p className="text-sm text-slate-500">Manage your product development portfolio</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center"
        >
          <span className="mr-2">+</span> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.project_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(project.project_id); }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded-md mb-2">
                {project.revision_level}
              </span>
              <h4 className="text-xl font-bold text-slate-800">{project.part_name}</h4>
              <p className="text-sm text-slate-500 font-mono">{project.part_number}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-slate-600">
                <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {project.core_team_members.length} Members
              </div>
            </div>

            <button 
              onClick={() => onSelectProject(project.project_id)}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors"
            >
              Open Workspace
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Part Name</label>
                <input required type="text" className="mt-1 w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  value={newProject.part_name} onChange={e => setNewProject({...newProject, part_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Part Number</label>
                <input required type="text" className="mt-1 w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  value={newProject.part_number} onChange={e => setNewProject({...newProject, part_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Revision Level</label>
                <input required type="text" className="mt-1 w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  value={newProject.revision_level} onChange={e => setNewProject({...newProject, revision_level: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Team (comma separated)</label>
                <input type="text" className="mt-1 w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe, Jane Smith"
                  value={Array.isArray(newProject.core_team_members) ? newProject.core_team_members.join(', ') : newProject.core_team_members} 
                  onChange={e => setNewProject({...newProject, core_team_members: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
