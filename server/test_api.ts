
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001/api';

async function test() {
    console.log('--- Testing API ---');

    // 1. Health
    const health = await fetch(`${API_BASE_URL}/health`).then(r => r.json());
    console.log('Health:', health);

    // 2. GET Projects
    const projects = await fetch(`${API_BASE_URL}/projects`).then(r => r.json());
    console.log('Projects Count:', projects.length);

    // 3. PUT Project (The problematic one)
    console.log('Attempting PUT to PROJ-004...');
    const putResponse = await fetch(`${API_BASE_URL}/projects/PROJ-004`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_name: 'TEST UPDATE' })
    });
    console.log('PUT Status:', putResponse.status);
    const putBody = await putResponse.text();
    console.log('PUT Response:', putBody);

    // 4. POST Project
    console.log('Attempting POST...');
    const postResponse = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: 'TEST-TEMP',
            part_number: 'TMP-1',
            part_name: 'Temp Project',
            revision_level: 'A',
            core_team_members: []
        })
    });
    console.log('POST Status:', postResponse.status);
    const postBody = await postResponse.text();
    console.log('POST Response:', postBody);
}

test().catch(console.error);
