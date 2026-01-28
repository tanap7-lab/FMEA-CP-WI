
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// --- API Routes (To be moved to separate files later) ---

// Projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.project.findMany();
        // Parse JSON strings back to objects
        const formattedProjects = projects.map(p => ({
            ...p,
            core_team_members: JSON.parse(p.core_team_members)
        }));
        res.json(formattedProjects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// --- Projects (Write) ---
app.post('/api/projects', async (req, res) => {
    console.log("SERVER: POST /api/projects received", req.body);
    try {
        const data = { ...req.body };
        // Defensive stringification: Only stringify if it's an array
        if (Array.isArray(data.core_team_members)) {
            data.core_team_members = JSON.stringify(data.core_team_members);
        } else if (typeof data.core_team_members !== 'string') {
            data.core_team_members = JSON.stringify([]);
        }

        const newItem = await prisma.project.create({ data });
        const formatted = {
            ...newItem,
            core_team_members: typeof newItem.core_team_members === 'string'
                ? JSON.parse(newItem.core_team_members)
                : newItem.core_team_members
        };
        res.json(formatted);
    } catch (error) {
        console.error('SERVER: Failed to create Project', error);
        res.status(500).json({ error: 'Failed to create Project' });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    console.log(`SERVER: PUT /api/projects/${req.params.id} received`);
    try {
        const data = { ...req.body };
        if (data.core_team_members) data.core_team_members = JSON.stringify(data.core_team_members);
        const updatedItem = await prisma.project.update({
            where: { project_id: req.params.id },
            data
        });

        // Ensure core_team_members is parsed as array
        const formattedItem = {
            ...updatedItem,
            core_team_members: typeof updatedItem.core_team_members === 'string'
                ? JSON.parse(updatedItem.core_team_members)
                : updatedItem.core_team_members
        };

        console.log("SERVER: Sending response", formattedItem);
        res.json(formattedItem);
    } catch (error) {
        console.error('SERVER: PROJECT UPDATE ERROR:', error);
        res.status(500).json({ error: 'Failed to update Project', details: (error as Error).message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await prisma.project.delete({ where: { project_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Project' });
    }
});

// Structure Elements
app.get('/api/structure', async (req, res) => {
    try {
        const elements = await prisma.structureElement.findMany();
        res.json(elements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch structure elements' });
    }
});

// DFMEA
app.get('/api/dfmea', async (req, res) => {
    try {
        const items = await prisma.dfmeaItem.findMany({
            include: { optimizationActions: true }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch DFMEA items' });
    }
});

// PFMEA
app.get('/api/pfmea', async (req, res) => {
    try {
        const items = await prisma.pfmeaItem.findMany({
            include: { optimizationActions: true }
        });
        // Parse JSON strings
        const formattedItems = items.map(p => ({
            ...p,
            process_specifications: p.process_specifications ? JSON.parse(p.process_specifications) : []
        }));
        res.json(formattedItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch PFMEA items' });
    }
});

// Control Plan
app.get('/api/control-plan', async (req, res) => {
    try {
        const items = await prisma.controlPlanItem.findMany();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Control Plan items' });
    }
});

// --- Structure Elements ---
app.post('/api/structure', async (req, res) => {
    try {
        const newElement = await prisma.structureElement.create({ data: req.body });
        res.json(newElement);
    } catch (error) {
        console.error("SERVER: Failed to create structure element", error);
        res.status(500).json({ error: 'Failed to create structure element', details: (error as Error).message });
    }
});

app.put('/api/structure/:id', async (req, res) => {
    try {
        const updatedElement = await prisma.structureElement.update({
            where: { element_id: req.params.id },
            data: req.body
        });
        res.json(updatedElement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update structure element' });
    }
});

app.delete('/api/structure/:id', async (req, res) => {
    try {
        await prisma.structureElement.delete({ where: { element_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete structure element' });
    }
});

// --- DFMEA ---
app.post('/api/dfmea', async (req, res) => {
    try {
        const { optimizationActions, ...data } = req.body; // Strip relational field
        const newItem = await prisma.dfmeaItem.create({ data });
        res.json(newItem);
    } catch (error) {
        console.error("DFMEA POST Error:", error);
        res.status(500).json({ error: 'Failed to create DFMEA item', details: (error as Error).message });
    }
});

app.put('/api/dfmea/:id', async (req, res) => {
    try {
        const { optimizationActions, ...data } = req.body;
        const updatedItem = await prisma.dfmeaItem.update({
            where: { dfmea_id: req.params.id },
            data
        });
        res.json(updatedItem);
    } catch (error) {
        console.error("DFMEA PUT Error:", error);
        res.status(500).json({ error: 'Failed to update DFMEA item', details: (error as Error).message });
    }
});

app.delete('/api/dfmea/:id', async (req, res) => {
    try {
        await prisma.dfmeaItem.delete({ where: { dfmea_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete DFMEA item' });
    }
});

// --- Optimization Actions ---
app.get('/api/optimization-actions/:id', async (req, res) => {
    try {
        const actions = await prisma.optimizationAction.findMany({
            where: {
                OR: [
                    { dfmea_id: req.params.id },
                    { pfmea_id: req.params.id }
                ]
            }
        });
        const formatted = actions.map((a: any) => ({
            ...a,
            history: a.history ? JSON.parse(a.history) : []
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch optimization actions' });
    }
});

app.post('/api/optimization-actions', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.history) data.history = JSON.stringify(data.history);
        const newAction = await prisma.optimizationAction.create({
            data
        });
        const formatted = {
            ...(newAction as any),
            history: (newAction as any).history ? JSON.parse((newAction as any).history) : []
        };
        res.json(formatted);
    } catch (error) {
        console.error("Failed to create optimization action", error);
        res.status(500).json({ error: 'Failed to create optimization action', details: (error as any).message });
    }
});

app.put('/api/optimization-actions/:id', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.history) data.history = JSON.stringify(data.history);
        const updatedAction = await prisma.optimizationAction.update({
            where: { id: req.params.id },
            data
        });
        const formatted = {
            ...(updatedAction as any),
            history: (updatedAction as any).history ? JSON.parse((updatedAction as any).history) : []
        };
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update optimization action' });
    }
});

app.delete('/api/optimization-actions/:id', async (req, res) => {
    try {
        await prisma.optimizationAction.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete optimization action' });
    }
});

// --- PFMEA ---
app.post('/api/pfmea', async (req, res) => {
    try {
        const { dfmeaItem, controlPlanItems, ...data } = req.body;
        if (data.process_specifications) {
            data.process_specifications = JSON.stringify(data.process_specifications);
        }
        const newItem = await prisma.pfmeaItem.create({ data });
        const formatted = {
            ...newItem,
            process_specifications: newItem.process_specifications ? JSON.parse(newItem.process_specifications) : []
        };
        res.json(formatted);
    } catch (error) {
        console.error("PFMEA POST Error:", error);
        res.status(500).json({ error: 'Failed to create PFMEA item', details: (error as Error).message });
    }
});

app.put('/api/pfmea/:id', async (req, res) => {
    try {
        const { dfmeaItem, controlPlanItems, ...data } = req.body;
        if (data.process_specifications) {
            data.process_specifications = JSON.stringify(data.process_specifications);
        }
        const updatedItem = await prisma.pfmeaItem.update({
            where: { pfmea_id: req.params.id },
            data
        });
        const formatted = {
            ...updatedItem,
            process_specifications: updatedItem.process_specifications ? JSON.parse(updatedItem.process_specifications) : []
        };
        res.json(formatted);
    } catch (error) {
        console.error("PFMEA PUT Error:", error);
        res.status(500).json({ error: 'Failed to update PFMEA item', details: (error as Error).message });
    }
});

app.delete('/api/pfmea/:id', async (req, res) => {
    try {
        await prisma.pfmeaItem.delete({ where: { pfmea_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete PFMEA item' });
    }
});

// --- Control Plan ---
app.post('/api/control-plan', async (req, res) => {
    try {
        const { pfmeaItem, ...data } = req.body;
        const newItem = await prisma.controlPlanItem.create({ data });
        res.json(newItem);
    } catch (error) {
        console.error("CP POST Error:", error);
        res.status(500).json({ error: 'Failed to create Control Plan item', details: (error as Error).message });
    }
});

app.put('/api/control-plan/:id', async (req, res) => {
    try {
        const { pfmeaItem, ...data } = req.body;
        const updatedItem = await prisma.controlPlanItem.update({
            where: { cp_id: req.params.id },
            data
        });
        res.json(updatedItem);
    } catch (error) {
        console.error("CP PUT Error:", error);
        res.status(500).json({ error: 'Failed to update Control Plan item', details: (error as Error).message });
    }
});

app.delete('/api/control-plan/:id', async (req, res) => {
    try {
        await prisma.controlPlanItem.delete({ where: { cp_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Control Plan item' });
    }
});

// Work Instructions
app.get('/api/work-instructions', async (req, res) => {
    try {
        const items = await prisma.workInstruction.findMany();
        // Parse JSON strings
        const formattedItems = items.map(w => ({
            ...w,
            steps: JSON.parse(w.steps)
        }));
        res.json(formattedItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Work Instructions' });
    }
});

// --- Work Instructions ---
app.post('/api/work-instructions', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.steps) data.steps = JSON.stringify(data.steps);
        const newItem = await prisma.workInstruction.create({ data });
        const formatted = {
            ...newItem,
            steps: newItem.steps ? JSON.parse(newItem.steps) : []
        };
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Work Instruction' });
    }
});

app.put('/api/work-instructions/:id', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.steps) data.steps = JSON.stringify(data.steps);
        const updatedItem = await prisma.workInstruction.update({
            where: { wi_id: req.params.id },
            data
        });
        const formatted = {
            ...updatedItem,
            steps: updatedItem.steps ? JSON.parse(updatedItem.steps) : []
        };
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update Work Instruction' });
    }
});

app.delete('/api/work-instructions/:id', async (req, res) => {
    try {
        await prisma.workInstruction.delete({ where: { wi_id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Work Instruction' });
    }
});

// --- Diagrams ---
app.get('/api/diagrams', async (req, res) => {
    try {
        const diagrams = await prisma.diagram.findMany({
            include: { boxes: true }
        });
        res.json(diagrams);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch diagrams' });
    }
});

app.post('/api/diagrams', async (req, res) => {
    try {
        const newDiagram = await prisma.diagram.create({
            data: req.body,
            include: { boxes: true }
        });
        res.json(newDiagram);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create diagram' });
    }
});

app.put('/api/diagrams/:id', async (req, res) => {
    try {
        const updated = await prisma.diagram.update({
            where: { id: req.params.id },
            data: req.body,
            include: { boxes: true }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update diagram' });
    }
});

app.delete('/api/diagrams/:id', async (req, res) => {
    try {
        await prisma.diagram.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete diagram' });
    }
});

// --- Diagram Boxes ---
app.post('/api/diagrams/:id/boxes', async (req, res) => {
    try {
        const newBox = await prisma.diagramBox.create({
            data: {
                ...req.body,
                diagram_id: req.params.id
            }
        });
        res.json(newBox);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add box' });
    }
});

app.delete('/api/boxes/:id', async (req, res) => {
    try {
        await prisma.diagramBox.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete box' });
    }
});

app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', method: req.method, url: req.url });
});

app.use((err: any, req: any, res: any, next: any) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
