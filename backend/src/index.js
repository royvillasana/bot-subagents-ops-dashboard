import http from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { bots as mockBots, subagents as mockSubagents } from './data.js';
import { getOpenClawStatus } from './openclaw.js';
import { loadStore, saveStore, id } from './store.js';

const port = Number(process.env.API_PORT || 8790);
const WS = '/data/.openclaw/workspace';

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(payload));
}

function classifyByAge(updatedAtMs) {
  const ageMs = Date.now() - Number(updatedAtMs || 0);
  if (ageMs < 2 * 60 * 1000) return 'running';
  if (ageMs < 15 * 60 * 1000) return 'queued';
  return 'idle';
}

function mapBotsFromStatus(status) {
  const byAgent = status?.sessions?.byAgent || [];
  if (!byAgent.length) return mockBots;
  return byAgent.map((a, idx) => ({
    id: `bot-${idx + 1}`,
    name: a.agentId || `agent-${idx + 1}`,
    status: classifyByAge(a.lastUpdatedAt),
    queue: Math.max(0, (a.count || 0) - 1),
    updatedAt: new Date(a.lastUpdatedAt || Date.now()).toISOString(),
    ageMs: Date.now() - Number(a.lastUpdatedAt || Date.now())
  }));
}

function mapSubagentsFromStatus(status) {
  const recent = status?.sessions?.recent || [];
  if (!recent.length) return mockSubagents;
  return recent.slice(0, 20).map((s, idx) => ({
    id: `sa-${idx + 1}`,
    task: s.key || 'session',
    status: classifyByAge(s.updatedAt),
    owner: s.agentId || 'main',
    updatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
    ageMs: Date.now() - Number(s.updatedAt || Date.now())
  }));
}

async function parseBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

async function memoriesSearch(q = '') {
  const hits = [];
  const files = [path.join(WS, 'MEMORY.md')];
  try {
    const memDir = path.join(WS, 'memory');
    const names = await readdir(memDir);
    for (const n of names) if (n.endsWith('.md')) files.push(path.join(memDir, n));
  } catch {}

  const term = q.trim().toLowerCase();
  for (const f of files) {
    try {
      const raw = await readFile(f, 'utf8');
      const lines = raw.split('\n');
      if (!term) {
        hits.push({ file: path.basename(f), excerpt: lines.slice(0, 8).join('\n') });
      } else {
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(term)) {
            hits.push({ file: path.basename(f), line: i + 1, excerpt: line.trim() });
          }
        });
      }
    } catch {}
  }
  return hits.slice(0, 120);
}

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/health') return send(res, 200, { ok: true, service: 'bot-subagents-ops-dashboard', now: Date.now() });

  if (url.pathname === '/api/openclaw/status') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { ok: true, connected: true, now: Date.now(), status });
    } catch (error) {
      return send(res, 500, { ok: false, connected: false, now: Date.now(), error: String(error?.message || error) });
    }
  }

  if (url.pathname === '/api/bots') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapBotsFromStatus(status), source: 'openclaw', now: Date.now() });
    } catch {
      return send(res, 200, { items: mockBots, source: 'mock', now: Date.now() });
    }
  }

  if (url.pathname === '/api/subagents') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapSubagentsFromStatus(status), source: 'openclaw', now: Date.now() });
    } catch {
      return send(res, 200, { items: mockSubagents, source: 'mock', now: Date.now() });
    }
  }

  // Task Board
  if (url.pathname === '/api/tasks' && req.method === 'GET') {
    const store = await loadStore();
    return send(res, 200, { items: store.tasks });
  }
  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    const body = await parseBody(req);
    const store = await loadStore();
    const row = { id: id('t'), title: body.title || 'Nueva tarea', status: body.status || 'todo', assignee: body.assignee || 'Stanley', priority: body.priority || 'medium', dueAt: body.dueAt || null, notes: body.notes || '' };
    store.tasks.unshift(row);
    await saveStore(store);
    return send(res, 200, { ok: true, item: row });
  }
  if (url.pathname.startsWith('/api/tasks/') && req.method === 'PATCH') {
    const taskId = url.pathname.split('/').pop();
    const body = await parseBody(req);
    const store = await loadStore();
    const i = store.tasks.findIndex((x) => x.id === taskId);
    if (i < 0) return send(res, 404, { ok: false, error: 'task not found' });
    store.tasks[i] = { ...store.tasks[i], ...body };
    await saveStore(store);
    return send(res, 200, { ok: true, item: store.tasks[i] });
  }

  // Content pipeline
  if (url.pathname === '/api/pipeline' && req.method === 'GET') {
    const store = await loadStore();
    return send(res, 200, { items: store.pipeline });
  }
  if (url.pathname === '/api/pipeline' && req.method === 'POST') {
    const body = await parseBody(req);
    const store = await loadStore();
    const row = {
      id: id('c'),
      stage: body.stage || 'ideas',
      title: body.title || 'Nueva idea',
      script: body.script || '',
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
      status: body.status || 'draft',
      assignee: body.assignee || 'Roy',
      updatedAt: new Date().toISOString()
    };
    store.pipeline.unshift(row);
    await saveStore(store);
    return send(res, 200, { ok: true, item: row });
  }
  if (url.pathname.startsWith('/api/pipeline/') && req.method === 'PATCH') {
    const rowId = url.pathname.split('/').pop();
    const body = await parseBody(req);
    const store = await loadStore();
    const i = store.pipeline.findIndex((x) => x.id === rowId);
    if (i < 0) return send(res, 404, { ok: false, error: 'item not found' });
    store.pipeline[i] = { ...store.pipeline[i], ...body, updatedAt: new Date().toISOString() };
    await saveStore(store);
    return send(res, 200, { ok: true, item: store.pipeline[i] });
  }

  // Calendar
  if (url.pathname === '/api/calendar' && req.method === 'GET') {
    const store = await loadStore();
    const taskEvents = store.tasks.filter((t) => t.dueAt).map((t) => ({ id: `task-${t.id}`, title: `Task: ${t.title}`, startsAt: t.dueAt, source: 'task', status: t.status }));
    const all = [...store.calendar, ...taskEvents].sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1));
    return send(res, 200, { items: all });
  }
  if (url.pathname === '/api/calendar' && req.method === 'POST') {
    const body = await parseBody(req);
    const store = await loadStore();
    const row = { id: id('e'), title: body.title || 'Evento', startsAt: body.startsAt || new Date().toISOString(), source: body.source || 'manual', status: body.status || 'scheduled' };
    store.calendar.push(row);
    await saveStore(store);
    return send(res, 200, { ok: true, item: row });
  }

  // Memory
  if (url.pathname === '/api/memories' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    const items = await memoriesSearch(q);
    return send(res, 200, { items });
  }

  // Team + digital office
  if (url.pathname === '/api/team' && req.method === 'GET') {
    const store = await loadStore();
    return send(res, 200, { items: store.teamRoles });
  }

  if (url.pathname === '/api/office' && req.method === 'GET') {
    const store = await loadStore();
    const base = store.teamRoles.map((m, idx) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(m.name)}`,
      desk: `Desk-${idx + 1}`,
      atComputer: m.type === 'core' ? true : Math.random() > 0.25,
      status: m.type === 'core' ? 'running' : (Math.random() > 0.5 ? 'running' : 'idle')
    }));
    return send(res, 200, { items: base });
  }

  return send(res, 404, { ok: false, error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`[bot-subagents-dashboard] backend listening on :${port}`));
}
