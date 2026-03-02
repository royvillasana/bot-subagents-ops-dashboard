import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { generateMockShortsIntel } from './shorts-intel.js';

const STORE_PATH = path.join(process.cwd(), 'backend', 'data', 'store.json');

const seed = {
  tasks: [
    { id: 't-1', title: 'Definir oferta UX Ops Autopilot', status: 'in_progress', assignee: 'Stanley', priority: 'high', dueAt: null, notes: '' },
    { id: 't-2', title: 'Revisar prompts de contenido con Roy', status: 'todo', assignee: 'Roy', priority: 'medium', dueAt: null, notes: '' }
  ],
  pipeline: [
    { id: 'c-1', stage: 'ideas', title: 'Post: OpenClaw UX automation', script: '', imageUrls: [], status: 'draft', assignee: 'Roy', updatedAt: new Date().toISOString() },
    { id: 'c-2', stage: 'script', title: 'Video short disciplina', script: 'Hook + body + CTA', imageUrls: [], status: 'in_progress', assignee: 'Stanley', updatedAt: new Date().toISOString() }
  ],
  calendar: [
    { id: 'e-1', title: 'Revisión semanal UX Ops', startsAt: new Date(Date.now() + 86400000).toISOString(), source: 'manual', status: 'scheduled' }
  ],
  teamRoles: [
    { id: 'agent-main', name: 'Stanley', role: 'Lead Operator', type: 'core', responsibilities: ['Planificación', 'Orquestación', 'QA'] },
    { id: 'agent-dev', name: 'DevAgent', role: 'Developer', type: 'subagent', responsibilities: ['Frontend', 'Backend', 'Integraciones'] },
    { id: 'agent-writer', name: 'WriterAgent', role: 'Writer', type: 'subagent', responsibilities: ['Guiones', 'Copy', 'Documentación'] },
    { id: 'agent-designer', name: 'DesignAgent', role: 'Designer', type: 'subagent', responsibilities: ['Layouts', 'UX Flows', 'Visual polish'] }
  ],
  shortsIntel: generateMockShortsIntel()
};

async function ensureStore() {
  try {
    await readFile(STORE_PATH, 'utf8');
  } catch {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(seed, null, 2), 'utf8');
  }
}

export async function loadStore() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

export async function saveStore(next) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(next, null, 2), 'utf8');
}

export function id(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
