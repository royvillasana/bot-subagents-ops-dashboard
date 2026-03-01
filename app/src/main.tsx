import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Task = { id: string; title: string; status: string; assignee: string; priority: string; dueAt: string | null; notes: string };
type Pipeline = { id: string; stage: string; title: string; script: string; imageUrls: string[]; status: string; assignee: string; updatedAt: string };
type Cal = { id: string; title: string; startsAt: string; source: string; status: string };
type MemoryHit = { file: string; line?: number; excerpt: string };
type Team = { id: string; name: string; role: string; type: string; responsibilities: string[] };
type Office = { id: string; name: string; role: string; avatar: string; desk: string; atComputer: boolean; status: string };

type LocalStore = {
  tasks: Task[];
  pipeline: Pipeline[];
  calendar: Cal[];
  team: Team[];
  memories: MemoryHit[];
};

const DEFAULT_API = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8790';
const LS_API_KEY = 'mission_control_api_base';
const LS_STORE_KEY = 'mission_control_local_store_v1';

function seedStore(): LocalStore {
  return {
    tasks: [
      { id: 't-seed-1', title: 'Definir plan comercial UX Ops', status: 'in_progress', assignee: 'Stanley', priority: 'high', dueAt: null, notes: '' },
      { id: 't-seed-2', title: 'Aprobar propuesta final', status: 'todo', assignee: 'Roy', priority: 'medium', dueAt: null, notes: '' }
    ],
    pipeline: [
      { id: 'p-seed-1', stage: 'ideas', title: 'Post: UX Ops con IA', script: '', imageUrls: [], status: 'draft', assignee: 'Roy', updatedAt: new Date().toISOString() }
    ],
    calendar: [
      { id: 'e-seed-1', title: 'Revisión semanal', startsAt: new Date(Date.now() + 86400000).toISOString(), source: 'manual', status: 'scheduled' }
    ],
    team: [
      { id: 'agent-main', name: 'Stanley', role: 'Lead Operator', type: 'core', responsibilities: ['Orquestación', 'QA', 'Entrega'] },
      { id: 'agent-dev', name: 'DevAgent', role: 'Developer', type: 'subagent', responsibilities: ['Frontend', 'Backend', 'Integraciones'] },
      { id: 'agent-writer', name: 'WriterAgent', role: 'Writer', type: 'subagent', responsibilities: ['Guiones', 'Copy', 'Research'] },
      { id: 'agent-designer', name: 'DesignAgent', role: 'Designer', type: 'subagent', responsibilities: ['UX', 'Visual', 'Prototipos'] }
    ],
    memories: [
      { file: 'memory/2026-03-01.md', line: 1, excerpt: 'Resumen operativo del día y decisiones clave.' },
      { file: 'MEMORY.md', line: 1, excerpt: 'Memoria de largo plazo curada.' }
    ]
  };
}

function loadLocalStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LS_STORE_KEY);
    if (!raw) return seedStore();
    return JSON.parse(raw);
  } catch {
    return seedStore();
  }
}

function saveLocalStore(store: LocalStore) {
  localStorage.setItem(LS_STORE_KEY, JSON.stringify(store));
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</section>;
}

function Tabs({ tab, setTab }: { tab: string; setTab: (x: string) => void }) {
  const items = [
    ['tasks', 'Task Board'],
    ['pipeline', 'Content Pipeline'],
    ['calendar', 'Calendar'],
    ['memory', 'Memory'],
    ['team', 'Team Structure'],
    ['office', 'Digital Office']
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {items.map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid #d1d5db', background: tab === k ? '#111827' : '#fff', color: tab === k ? '#fff' : '#111' }}>{label}</button>
      ))}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('tasks');
  const [apiBase, setApiBase] = useState<string>(() => localStorage.getItem(LS_API_KEY) || DEFAULT_API);
  const [apiInput, setApiInput] = useState<string>(() => localStorage.getItem(LS_API_KEY) || DEFAULT_API);
  const [oc, setOc] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState('');
  const [source, setSource] = useState<'api' | 'local'>('local');
  const [apiError, setApiError] = useState<string>('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [calendar, setCalendar] = useState<Cal[]>([]);
  const [memories, setMemories] = useState<MemoryHit[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [office, setOffice] = useState<Office[]>([]);

  const [qMem, setQMem] = useState('');

  const [newTask, setNewTask] = useState({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
  const [newPipe, setNewPipe] = useState({ title: '', stage: 'ideas', assignee: 'Roy' });
  const [newEvent, setNewEvent] = useState({ title: '', startsAt: '' });

  const mixedContentRisk = typeof window !== 'undefined' && window.location.protocol === 'https:' && apiBase.startsWith('http://');

  function hydrateFromLocal() {
    const st = loadLocalStore();
    setTasks(st.tasks);
    setPipeline(st.pipeline);
    setCalendar(st.calendar);
    setMemories(st.memories);
    setTeam(st.team);
    setOffice(st.team.map((m, i) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(m.name)}`,
      desk: `Desk-${i + 1}`,
      atComputer: true,
      status: 'running'
    })));
    setSource('local');
    setOc(false);
    setLastSync(new Date().toLocaleTimeString());
  }

  async function loadAll() {
    if (mixedContentRisk) {
      setApiError('Tu página está en HTTPS (github.io) y el API está en HTTP. El navegador lo bloquea por seguridad.');
      hydrateFromLocal();
      return;
    }

    try {
      const [s, t, p, c, m, tm, of] = await Promise.all([
        fetch(`${apiBase}/api/openclaw/status`).then(r => r.json()),
        fetch(`${apiBase}/api/tasks`).then(r => r.json()),
        fetch(`${apiBase}/api/pipeline`).then(r => r.json()),
        fetch(`${apiBase}/api/calendar`).then(r => r.json()),
        fetch(`${apiBase}/api/memories`).then(r => r.json()),
        fetch(`${apiBase}/api/team`).then(r => r.json()),
        fetch(`${apiBase}/api/office`).then(r => r.json())
      ]);
      setOc(Boolean(s?.ok));
      setTasks(t.items || []);
      setPipeline(p.items || []);
      setCalendar(c.items || []);
      setMemories(m.items || []);
      setTeam(tm.items || []);
      setOffice(of.items || []);
      setSource('api');
      setApiError('');
      setLastSync(new Date().toLocaleTimeString());
    } catch (e: any) {
      setApiError(`API no responde: ${String(e?.message || e)}`);
      hydrateFromLocal();
    }
  }

  useEffect(() => {
    loadAll().catch(() => void 0);
    const i = setInterval(() => loadAll().catch(() => void 0), 6000);
    return () => clearInterval(i);
  }, [apiBase]);

  function persistLocal(partial: Partial<LocalStore>) {
    const current = loadLocalStore();
    const next = { ...current, ...partial };
    saveLocalStore(next);
  }

  async function createTask() {
    if (source === 'api') {
      try {
        await fetch(`${apiBase}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newTask, dueAt: newTask.dueAt || null }) });
      } catch {}
      await loadAll();
      return;
    }
    const row: Task = { id: uid('t'), title: newTask.title || 'Nueva tarea', status: 'todo', assignee: newTask.assignee, priority: newTask.priority, dueAt: newTask.dueAt || null, notes: '' };
    const next = [row, ...tasks];
    setTasks(next);
    persistLocal({ tasks: next, calendar: [...calendar, ...(row.dueAt ? [{ id: uid('e'), title: `Task: ${row.title}`, startsAt: row.dueAt, source: 'task', status: row.status }] : [])] });
    setNewTask({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    if (source === 'api') {
      try { await fetch(`${apiBase}/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }); } catch {}
      await loadAll();
      return;
    }
    const next = tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    setTasks(next);
    persistLocal({ tasks: next });
  }

  async function createPipeline() {
    if (source === 'api') {
      try { await fetch(`${apiBase}/api/pipeline`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(newPipe) }); } catch {}
      await loadAll();
      return;
    }
    const row: Pipeline = { id: uid('p'), stage: newPipe.stage, title: newPipe.title || 'Nueva idea', script: '', imageUrls: [], status: 'draft', assignee: newPipe.assignee, updatedAt: new Date().toISOString() };
    const next = [row, ...pipeline];
    setPipeline(next);
    persistLocal({ pipeline: next });
    setNewPipe({ title: '', stage: 'ideas', assignee: 'Roy' });
  }

  async function patchPipeline(id: string, patch: Partial<Pipeline>) {
    if (source === 'api') {
      try { await fetch(`${apiBase}/api/pipeline/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }); } catch {}
      await loadAll();
      return;
    }
    const next = pipeline.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p);
    setPipeline(next);
    persistLocal({ pipeline: next });
  }

  async function createEvent() {
    if (source === 'api') {
      try { await fetch(`${apiBase}/api/calendar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newEvent, source: 'manual' }) }); } catch {}
      await loadAll();
      return;
    }
    const row: Cal = { id: uid('e'), title: newEvent.title || 'Evento', startsAt: newEvent.startsAt || new Date().toISOString(), source: 'manual', status: 'scheduled' };
    const next = [...calendar, row];
    setCalendar(next);
    persistLocal({ calendar: next });
    setNewEvent({ title: '', startsAt: '' });
  }

  async function searchMem() {
    if (source === 'api') {
      const d = await fetch(`${apiBase}/api/memories?q=${encodeURIComponent(qMem)}`).then(r => r.json()).catch(() => ({ items: [] }));
      setMemories(d.items || []);
      return;
    }
    const term = qMem.trim().toLowerCase();
    const local = loadLocalStore().memories;
    setMemories(!term ? local : local.filter(m => `${m.file} ${m.excerpt}`.toLowerCase().includes(term)));
  }

  const tasksByStatus = useMemo(() => {
    const g: Record<string, number> = {};
    tasks.forEach(t => { g[t.status] = (g[t.status] || 0) + 1; });
    return g;
  }, [tasks]);

  function saveApiBase() {
    localStorage.setItem(LS_API_KEY, apiInput.trim());
    setApiBase(apiInput.trim());
  }

  return (
    <main style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Mission Control Dashboard v4.1</h1>
      <p style={{ marginTop: 0, color: '#4b5563' }}>
        OpenClaw: <strong style={{ color: oc ? '#15803d' : '#b91c1c' }}>{oc === null ? 'verificando...' : oc ? 'conectado' : 'sin conexión'}</strong>
        {' · '}source: <strong>{source}</strong> · último refresh: {lastSync || '-'}
      </p>

      <Card title="Conexión / Configuración">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={apiInput} onChange={e => setApiInput(e.target.value)} placeholder="API Base URL" style={{ padding: 8, minWidth: 360 }} />
          <button onClick={saveApiBase}>Guardar API URL</button>
          <button onClick={() => loadAll()}>Reintentar conexión</button>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Ejemplo local: http://76.13.51.1:8790</span>
        </div>
        {!!apiError && <p style={{ color: '#b91c1c', marginBottom: 0 }}>{apiError}</p>}
      </Card>

      <Tabs tab={tab} setTab={setTab} />

      {tab === 'tasks' && (
        <Card title="Task Board (asignación Roy / Stanley)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input placeholder='Nueva tarea' value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db', minWidth: 260 }} />
            <select value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })} style={{ padding: 8 }}><option>Roy</option><option>Stanley</option></select>
            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} style={{ padding: 8 }}><option>low</option><option>medium</option><option>high</option></select>
            <input type='datetime-local' value={newTask.dueAt} onChange={e => setNewTask({ ...newTask, dueAt: e.target.value })} style={{ padding: 8 }} />
            <button onClick={createTask}>Agregar</button>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Resumen: {Object.entries(tasksByStatus).map(([k,v]) => `${k}:${v}`).join(' · ') || 'sin tareas'}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}><th style={{textAlign:'left',padding:8}}>Task</th><th style={{textAlign:'left',padding:8}}>Assignee</th><th style={{textAlign:'left',padding:8}}>Status</th><th style={{textAlign:'left',padding:8}}>Due</th><th/></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td style={{padding:8,borderTop:'1px solid #f3f4f6'}}>{t.title}</td>
                  <td style={{padding:8,borderTop:'1px solid #f3f4f6'}}>{t.assignee}</td>
                  <td style={{padding:8,borderTop:'1px solid #f3f4f6'}}>
                    <select value={t.status} onChange={e => patchTask(t.id,{status:e.target.value})}><option>todo</option><option>in_progress</option><option>blocked</option><option>done</option></select>
                  </td>
                  <td style={{padding:8,borderTop:'1px solid #f3f4f6'}}>{t.dueAt ? new Date(t.dueAt).toLocaleString() : '-'}</td>
                  <td style={{padding:8,borderTop:'1px solid #f3f4f6'}}><button onClick={() => patchTask(t.id,{assignee:t.assignee==='Roy'?'Stanley':'Roy'})}>Reasignar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'pipeline' && (
        <Card title="Content Pipeline Tool">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input placeholder='Idea/Título' value={newPipe.title} onChange={e => setNewPipe({...newPipe,title:e.target.value})} style={{ padding: 8, minWidth: 260 }} />
            <select value={newPipe.stage} onChange={e => setNewPipe({...newPipe,stage:e.target.value})}><option>ideas</option><option>outline</option><option>script</option><option>assets</option><option>edit</option><option>publish</option></select>
            <select value={newPipe.assignee} onChange={e => setNewPipe({...newPipe,assignee:e.target.value})}><option>Roy</option><option>Stanley</option></select>
            <button onClick={createPipeline}>Agregar item</button>
          </div>
          {pipeline.map(p => (
            <div key={p.id} style={{ border:'1px solid #eee', borderRadius:10, padding:10, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                <strong>{p.title}</strong>
                <span>{p.stage} · {p.status} · {p.assignee}</span>
              </div>
              <textarea value={p.script || ''} onChange={e => patchPipeline(p.id,{script:e.target.value})} placeholder='Full script...' style={{ width:'100%', minHeight:80, marginTop:8 }} />
              <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => patchPipeline(p.id,{status:'in_progress'})}>In progress</button>
                <button onClick={() => patchPipeline(p.id,{status:'ready'})}>Ready</button>
                <button onClick={() => patchPipeline(p.id,{stage:'publish'})}>Move to Publish</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'calendar' && (
        <Card title="Calendar (scheduled tasks + cron)">
          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
            <input placeholder='Título evento' value={newEvent.title} onChange={e => setNewEvent({...newEvent,title:e.target.value})} style={{ padding:8 }} />
            <input type='datetime-local' value={newEvent.startsAt} onChange={e => setNewEvent({...newEvent,startsAt:e.target.value})} style={{ padding:8 }} />
            <button onClick={createEvent}>Agregar evento</button>
          </div>
          <ul>
            {calendar.map(e => <li key={e.id}><strong>{e.title}</strong> — {new Date(e.startsAt).toLocaleString()} — {e.source} — {e.status}</li>)}
          </ul>
        </Card>
      )}

      {tab === 'memory' && (
        <Card title="Memory Documents + Search">
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input value={qMem} onChange={e => setQMem(e.target.value)} placeholder='Buscar memoria...' style={{ padding:8, minWidth:260 }} />
            <button onClick={searchMem}>Buscar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {memories.map((m, i) => (
              <article key={i} style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
                <div style={{ fontSize:12, color:'#6b7280' }}>{m.file}{m.line ? `#${m.line}` : ''}</div>
                <div style={{ whiteSpace:'pre-wrap' }}>{m.excerpt}</div>
              </article>
            ))}
          </div>
        </Card>
      )}

      {tab === 'team' && (
        <Card title="Team Structure">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }}>
            {team.map(t => (
              <div key={t.id} style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
                <h4 style={{ margin:'0 0 4px' }}>{t.name}</h4>
                <div style={{ fontSize:13, color:'#6b7280' }}>{t.role} · {t.type}</div>
                <ul style={{ marginTop:8 }}>
                  {(t.responsibilities||[]).map((r:string) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'office' && (
        <Card title="Digital Office">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10 }}>
            {office.map(o => (
              <div key={o.id} style={{ border:'1px solid #eee', borderRadius:10, padding:10, textAlign:'center' }}>
                <img src={o.avatar} alt={o.name} style={{ width:72, height:72 }} />
                <div><strong>{o.name}</strong></div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{o.role}</div>
                <div style={{ marginTop:6 }}>{o.atComputer ? '💻 En su computadora' : '☕ Fuera del puesto'}</div>
                <div style={{ fontSize:12, marginTop:4 }}>Estado: {o.status}</div>
                <div style={{ fontSize:12 }}>Área: {o.desk}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
