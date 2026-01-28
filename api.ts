
// Centralized API Client

const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
    // Projects
    getProjects: async () => {
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        return response.json();
    },

    // Structure Elements
    getStructureElements: async () => {
        const response = await fetch(`${API_BASE_URL}/structure`);
        if (!response.ok) throw new Error('Failed to fetch structure elements');
        return response.json();
    },

    // DFMEA Items
    getDfmeaItems: async () => {
        const response = await fetch(`${API_BASE_URL}/dfmea`);
        if (!response.ok) throw new Error('Failed to fetch DFMEA items');
        return response.json();
    },

    // PFMEA Items
    getPfmeaItems: async () => {
        const response = await fetch(`${API_BASE_URL}/pfmea`);
        if (!response.ok) throw new Error('Failed to fetch PFMEA items');
        return response.json();
    },

    // Control Plan Items
    getControlPlanItems: async () => {
        const response = await fetch(`${API_BASE_URL}/control-plan`);
        if (!response.ok) throw new Error('Failed to fetch Control Plan items');
        return response.json();
    },

    // Work Instructions
    getWorkInstructions: async () => {
        const response = await fetch(`${API_BASE_URL}/work-instructions`);
        if (!response.ok) throw new Error('Failed to fetch Work Instructions');
        return response.json();
    },

    // --- Write Methods ---

    // Projects
    createProject: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create Project');
        return response.json();
    },
    updateProject: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update Project');
        return response.json();
    },
    deleteProject: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete Project');
        return response.json();
    },

    // Structure
    createStructureElement: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/structure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create structure element');
        return response.json();
    },
    updateStructureElement: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/structure/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update structure element');
        return response.json();
    },
    deleteStructureElement: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/structure/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete structure element');
        return response.json();
    },

    // DFMEA
    createDfmeaItem: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/dfmea`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create DFMEA item');
        return response.json();
    },
    updateDfmeaItem: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/dfmea/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update DFMEA item');
        return response.json();
    },
    deleteDfmeaItem: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/dfmea/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete DFMEA item');
        return response.json();
    },

    // Optimization Actions
    getOptimizationActions: async (dfmeaId: string) => {
        const response = await fetch(`${API_BASE_URL}/optimization-actions/${dfmeaId}`);
        if (!response.ok) throw new Error('Failed to fetch optimization actions');
        return response.json();
    },
    createOptimizationAction: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/optimization-actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Failed to create optimization action');
        }
        return response.json();
    },
    updateOptimizationAction: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/optimization-actions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update optimization action');
        return response.json();
    },
    deleteOptimizationAction: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/optimization-actions/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete optimization action');
        return response.json();
    },

    // PFMEA
    createPfmeaItem: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/pfmea`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create PFMEA item');
        return response.json();
    },
    updatePfmeaItem: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/pfmea/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update PFMEA item');
        return response.json();
    },
    deletePfmeaItem: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/pfmea/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete PFMEA item');
        return response.json();
    },

    // Control Plan
    createControlPlanItem: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/control-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create Control Plan item');
        return response.json();
    },
    updateControlPlanItem: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/control-plan/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update Control Plan item');
        return response.json();
    },
    deleteControlPlanItem: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/control-plan/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete Control Plan item');
        return response.json();
    },

    // Work Instructions
    createWorkInstruction: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/work-instructions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create Work Instruction');
        return response.json();
    },
    updateWorkInstruction: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/work-instructions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update Work Instruction');
        return response.json();
    },
    deleteWorkInstruction: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/work-instructions/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete Work Instruction');
        return response.json();
    },

    // Diagrams
    getDiagrams: async () => {
        const response = await fetch(`${API_BASE_URL}/diagrams`);
        if (!response.ok) throw new Error('Failed to fetch diagrams');
        return response.json();
    },
    createDiagram: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/diagrams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create diagram');
        return response.json();
    },
    updateDiagram: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/diagrams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update diagram');
        return response.json();
    },
    deleteDiagram: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/diagrams/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete diagram');
        return response.json();
    },

    // Diagram Boxes
    createDiagramBox: async (diagramId: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/diagrams/${diagramId}/boxes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create box');
        return response.json();
    },
    deleteDiagramBox: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/boxes/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete box');
        return response.json();
    }
};
