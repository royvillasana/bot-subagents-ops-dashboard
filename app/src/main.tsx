import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Task = { id: string; title: string; status: string; assignee: string; priority: string; dueAt: string | null; notes: string };
type Pipeline = { id: string; stage: string; title: string; script: string; imageUrls: string[]; status: string; assignee: string; updatedAt: string };
type Cal = { id: string; title: string; startsAt: string; source: string; status: string };
type MemoryHit = { file: string; line?: number; excerpt: string };
type Team = { id: string; name: string; role: string; type: string; responsibilities: string[] };
type Insight = { gamification?: any; kanban?: any; cronJobsCount?: number; suggestions?: string[] };
type SkillState = { slug: string; installed: boolean };

type LocalStore = { tasks: Task[]; pipeline: Pipeline[]; calendar: Cal[]; team: Team[]; memories: MemoryHit[] };

const DEFAULT_API = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8790';
const LS_API_KEY = 'mission_control_api_base';
const LS_STORE_KEY = 'mission_control_local_store_v1';

const UI = {
  bg: '#0b1020',
  card: '#151d34',
  cardSoft: '#1b2748',
  text: '#f5f8ff',
  sub: '#9fb3d9',
  accent: '#6ee7b7',
  danger: '#f87171',
  warn: '#fbbf24',
  border: '#2f3e68'
};

async function apiFetch(url: string, init: RequestInit = {}) {
  const u = new URL(url);
  const isPinggy = /pinggy\.link$/i.test(u.hostname);
  const extra = isPinggy ? { 'X-Pinggy-No-Screen': '1' } : {};
  return fetch(url, { ...init, headers: { ...extra, ...(init.headers || {}) } as any });
}

function seedStore(): LocalStore {
  return {
    tasks: [
      { id: 't-seed-1', title: 'Definir plan comercial UX Ops', status: 'in_progress', assignee: 'Stanley', priority: 'high', dueAt: null, notes: '' },
      { id: 't-seed-2', title: 'Aprobar propuesta final', status: 'todo', assignee: 'Roy', priority: 'medium', dueAt: null, notes: '' }
    ],
    pipeline: [
      { id: 'p-seed-1', stage: 'ideas', title: 'Post: UX Ops con IA', script: 'Hook, problema, framework, CTA.', imageUrls: [], status: 'draft', assignee: 'Roy', updatedAt: new Date().toISOString() },
      { id: 'p-seed-2', stage: 'script', title: 'Reel: de incertidumbre a impacto', script: 'Storyline principal + pruebas sociales.', imageUrls: [], status: 'in_progress', assignee: 'Stanley', updatedAt: new Date().toISOString() }
    ],
    calendar: [{ id: 'e-seed-1', title: 'Sprint Review', startsAt: new Date(Date.now() + 3600 * 1000 * 6).toISOString(), source: 'manual', status: 'scheduled' }],
    team: [
      { id: 'agent-main', name: 'Stanley', role: 'Lead Operator', type: 'core', responsibilities: ['Orquestación', 'QA', 'Entrega'] },
      { id: 'agent-dev', name: 'DevAgent', role: 'Developer', type: 'subagent', responsibilities: ['Frontend', 'Backend'] },
      { id: 'agent-writer', name: 'WriterAgent', role: 'Writer', type: 'subagent', responsibilities: ['Guiones', 'Copy'] },
      { id: 'agent-designer', name: 'DesignAgent', role: 'Designer', type: 'subagent', responsibilities: ['UI', 'Brand'] }
    ],
    memories: [{ file: 'MEMORY.md', line: 1, excerpt: 'Decisión: foco monetización en OpenClaw UX Ops automation.' }]
  };
}

function uid(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 8)}`; }
function loadLocalStore(): LocalStore { try { const raw = localStorage.getItem(LS_STORE_KEY); return raw ? JSON.parse(raw) : seedStore(); } catch { return seedStore(); } }
function saveLocalStore(store: LocalStore) { localStorage.setItem(LS_STORE_KEY, JSON.stringify(store)); }

const pill = (active = false): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 999, border: `1px solid ${UI.border}`, background: active ? '#28407c' : UI.card, color: UI.text, cursor: 'pointer'
});
const input: React.CSSProperties = { background: '#0f1730', color: UI.text, border: `1px solid ${UI.border}`, borderRadius: 8, padding: 8 };

function App() {
  const [tab, setTab] = useState('command');
  const [apiBase, setApiBase] = useState(localStorage.getItem(LS_API_KEY) || DEFAULT_API);
  const [apiInput, setApiInput] = useState(localStorage.getItem(LS_API_KEY) || DEFAULT_API);
  const [oc, setOc] = useState<boolean | null>(null);
  const [source, setSource] = useState<'api' | 'local'>('local');
  const [lastSync, setLastSync] = useState('-');
  const [apiError, setApiError] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [calendar, setCalendar] = useState<Cal[]>([]);
  const [memories, setMemories] = useState<MemoryHit[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [qMem, setQMem] = useState('');
  const [insights, setInsights] = useState<Insight>({});
  const [skills, setSkills] = useState<SkillState[]>([]);

  const [newTask, setNewTask] = useState({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
  const [newPipe, setNewPipe] = useState({ title: '', stage: 'ideas', assignee: 'Roy' });
  const [newEvent, setNewEvent] = useState({ title: '', startsAt: '' });

  const mixedContentRisk = typeof window !== 'undefined' && window.location.protocol === 'https:' && apiBase.startsWith('http://');

  function persistLocal(partial: Partial<LocalStore>) {
    const current = loadLocalStore();
    saveLocalStore({ ...current, ...partial });
  }

  function hydrateFromLocal(msg = '') {
    const st = loadLocalStore();
    setTasks(st.tasks); setPipeline(st.pipeline); setCalendar(st.calendar); setMemories(st.memories); setTeam(st.team);
    setSource('local'); setOc(false); setLastSync(new Date().toLocaleTimeString()); if (msg) setApiError(msg);
  }

  async function loadAll() {
    if (mixedContentRisk) return hydrateFromLocal('Tu página está en HTTPS y el API en HTTP (bloqueado por navegador).');
    try {
      const [s, t, p, c, m, tm, ins, sk] = await Promise.all([
        apiFetch(`${apiBase}/api/openclaw/status`).then(r => r.json()),
        apiFetch(`${apiBase}/api/tasks`).then(r => r.json()),
        apiFetch(`${apiBase}/api/pipeline`).then(r => r.json()),
        apiFetch(`${apiBase}/api/calendar`).then(r => r.json()),
        apiFetch(`${apiBase}/api/memories`).then(r => r.json()),
        apiFetch(`${apiBase}/api/team`).then(r => r.json()),
        apiFetch(`${apiBase}/api/insights`).then(r => r.json()).catch(() => ({})),
        apiFetch(`${apiBase}/api/skills`).then(r => r.json()).catch(() => ({ items: [] }))
      ]);
      setOc(Boolean(s?.ok)); setTasks(t.items || []); setPipeline(p.items || []); setCalendar(c.items || []); setMemories(m.items || []); setTeam(tm.items || []);
      setInsights(ins || {}); setSkills(sk.items || []);
      setSource('api'); setApiError(''); setLastSync(new Date().toLocaleTimeString());
    } catch (e: any) { hydrateFromLocal(`API no responde: ${String(e?.message || e)}`); }
  }

  useEffect(() => { loadAll(); const i = setInterval(loadAll, 6000); return () => clearInterval(i); }, [apiBase]);

  async function createTask() {
    if (source === 'api') {
      try { await apiFetch(`${apiBase}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newTask, dueAt: newTask.dueAt || null }) }); } catch {}
      return loadAll();
    }
    const row: Task = { id: uid('t'), title: newTask.title || 'Nueva quest', status: 'todo', assignee: newTask.assignee, priority: newTask.priority, dueAt: newTask.dueAt || null, notes: '' };
    const next = [row, ...tasks];
    setTasks(next); persistLocal({ tasks: next }); setNewTask({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    if (source === 'api') {
      try { await apiFetch(`${apiBase}/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }); } catch {}
      return loadAll();
    }
    const next = tasks.map(t => t.id === id ? { ...t, ...patch } : t); setTasks(next); persistLocal({ tasks: next });
  }

  async function createPipeline() {
    if (source === 'api') {
      try { await apiFetch(`${apiBase}/api/pipeline`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(newPipe) }); } catch {}
      return loadAll();
    }
    const row: Pipeline = { id: uid('p'), stage: newPipe.stage, title: newPipe.title || 'Nueva pieza', script: '', imageUrls: [], status: 'draft', assignee: newPipe.assignee, updatedAt: new Date().toISOString() };
    const next = [row, ...pipeline]; setPipeline(next); persistLocal({ pipeline: next }); setNewPipe({ title: '', stage: 'ideas', assignee: 'Roy' });
  }

  async function patchPipeline(id: string, patch: Partial<Pipeline>) {
    if (source === 'api') {
      try { await apiFetch(`${apiBase}/api/pipeline/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }); } catch {}
      return loadAll();
    }
    const next = pipeline.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p); setPipeline(next); persistLocal({ pipeline: next });
  }

  async function createEvent() {
    if (source === 'api') {
      try { await apiFetch(`${apiBase}/api/calendar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newEvent, source: 'manual' }) }); } catch {}
      return loadAll();
    }
    const row: Cal = { id: uid('e'), title: newEvent.title || 'Evento', startsAt: newEvent.startsAt || new Date().toISOString(), source: 'manual', status: 'scheduled' };
    const next = [...calendar, row]; setCalendar(next); persistLocal({ calendar: next }); setNewEvent({ title: '', startsAt: '' });
  }

  async function searchMem() {
    if (source === 'api') {
      const d = await apiFetch(`${apiBase}/api/memories?q=${encodeURIComponent(qMem)}`).then(r => r.json()).catch(() => ({ items: [] }));
      return setMemories(d.items || []);
    }
    const term = qMem.trim().toLowerCase();
    const local = loadLocalStore().memories;
    setMemories(!term ? local : local.filter(x => `${x.file} ${x.excerpt}`.toLowerCase().includes(term)));
  }

  const stats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const xp = done * 40 + inProgress * 10 - blocked * 12;
    const level = Math.max(1, Math.floor(xp / 120) + 1);
    const streak = Math.min(30, done + 3);
    return { done, inProgress, blocked, todo, xp, level, streak };
  }, [tasks]);

  const byStatus = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    done: tasks.filter(t => t.status === 'done')
  }), [tasks]);

  const tabs = [
    ['command', '🎮 Command'], ['tasks', '🧭 Quests'], ['pipeline', '🧪 Pipeline'], ['calendar', '🗓 Calendar'], ['memory', '📚 Memory'], ['team', '🧑‍🚀 Team'], ['office', '🗺 Office']
  ];

  return (
    <main style={{ fontFamily: 'Inter,system-ui,sans-serif', background: `linear-gradient(180deg, ${UI.bg}, #0d1530)`, minHeight: '100vh', color: UI.text, padding: 20 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 4 }}>Mission Control Dashboard v5 — Pokémon Ops</h1>
        <div style={{ color: UI.sub, marginBottom: 14 }}>
          OpenClaw: <b style={{ color: oc ? UI.accent : UI.danger }}>{oc ? 'conectado' : 'sin conexión'}</b> · source: <b>{source}</b> · refresh: {lastSync}
        </div>

        <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={apiInput} onChange={e => setApiInput(e.target.value)} style={{ ...input, minWidth: 360 }} placeholder='API Base URL' />
            <button style={pill(true)} onClick={() => { localStorage.setItem(LS_API_KEY, apiInput.trim()); setApiBase(apiInput.trim()); }}>Guardar API URL</button>
            <button style={pill()} onClick={loadAll}>Reintentar conexión</button>
            <span style={{ color: UI.sub, fontSize: 12 }}>Tip: usa backend HTTPS para github.io</span>
          </div>
          {apiError && <p style={{ color: UI.danger, margin: '8px 0 0' }}>{apiError}</p>}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
          {[
            ['XP', stats.xp, UI.accent], ['Nivel', stats.level, '#93c5fd'], ['Streak', `${stats.streak}d`, UI.warn], ['Bloqueadas', stats.blocked, stats.blocked ? UI.danger : UI.accent]
          ].map(([k, v, c]) => (
            <div key={String(k)} style={{ background: UI.cardSoft, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ color: UI.sub, fontSize: 12 }}>{k}</div><div style={{ fontSize: 24, color: String(c), fontWeight: 700 }}>{String(v)}</div>
            </div>
          ))}
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>{tabs.map(([k, l]) => <button key={k} style={pill(tab === k)} onClick={() => setTab(String(k))}>{l}</button>)}</div>

        {tab === 'command' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 12 }}>
            <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>🎯 Prioridades del día</h3>
              <ul>
                {tasks.slice(0, 6).map(t => <li key={t.id}><b>{t.title}</b> — {t.assignee} · {t.status}</li>)}
              </ul>
            </div>
            <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>⚡ Acciones sugeridas IA</h3>
              <ul>
                {(insights.suggestions?.length ? insights.suggestions : [
                  stats.blocked ? `Resolver ${stats.blocked} bloqueos antes de crear nuevas tareas.` : 'Sin bloqueos críticos, puedes escalar throughput.',
                  'Reasignar tareas high priority a agente con menor carga.',
                  'Empujar 1 item de pipeline a publish para mantener flujo.'
                ]).map((x:string, i:number)=><li key={i}>{x}</li>)}
              </ul>
              <p style={{ color: UI.sub, fontSize: 12 }}>Cron jobs detectados: {insights.cronJobsCount ?? 0}</p>
            </div>
          </section>
        )}


        {tab === 'command' && (
          <section style={{ marginTop: 12, background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🧩 Skills integradas (ClawHub)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
              {(skills.length ? skills : [
                { slug: 'mission-control-dashboard', installed: false },
                { slug: 'openclaw-dashboard', installed: false },
                { slug: 'agent-team-orchestration', installed: false }
              ]).map((sk:any) => (
                <div key={sk.slug} style={{ border: `1px solid ${UI.border}`, borderRadius: 8, padding: 8, background: '#0f1730' }}>
                  <div style={{ fontWeight: 600 }}>{sk.slug}</div>
                  <div style={{ color: sk.installed ? UI.accent : UI.warn, fontSize: 12 }}>{sk.installed ? 'instalada' : 'pendiente'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'tasks' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🧭 Quest Board (Kanban)</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input style={{ ...input, minWidth: 240 }} placeholder='Nueva quest' value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              <select style={input} value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}><option>Roy</option><option>Stanley</option></select>
              <select style={input} value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}><option>low</option><option>medium</option><option>high</option></select>
              <input style={input} type='datetime-local' value={newTask.dueAt} onChange={e => setNewTask({ ...newTask, dueAt: e.target.value })} />
              <button style={pill(true)} onClick={createTask}>Agregar quest</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
              {['todo', 'in_progress', 'blocked', 'done'].map((s) => (
                <div key={s} style={{ background: '#0f1730', border: `1px solid ${UI.border}`, borderRadius: 10, padding: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.toUpperCase()} ({(byStatus as any)[s].length})</div>
                  {(byStatus as any)[s].map((t: Task) => (
                    <article key={t.id} style={{ border: `1px solid ${UI.border}`, borderRadius: 8, padding: 8, marginBottom: 8, background: '#182246' }}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ color: UI.sub, fontSize: 12 }}>{t.assignee} · {t.priority} {t.dueAt ? `· ${new Date(t.dueAt).toLocaleDateString()}` : ''}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <select style={input} value={t.status} onChange={e => patchTask(t.id, { status: e.target.value })}><option>todo</option><option>in_progress</option><option>blocked</option><option>done</option></select>
                        <button style={pill()} onClick={() => patchTask(t.id, { assignee: t.assignee === 'Roy' ? 'Stanley' : 'Roy' })}>Reasignar</button>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'pipeline' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🧪 Content Evolution Pipeline</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input style={{ ...input, minWidth: 260 }} placeholder='Título pieza' value={newPipe.title} onChange={e => setNewPipe({ ...newPipe, title: e.target.value })} />
              <select style={input} value={newPipe.stage} onChange={e => setNewPipe({ ...newPipe, stage: e.target.value })}><option>ideas</option><option>outline</option><option>script</option><option>assets</option><option>edit</option><option>publish</option></select>
              <select style={input} value={newPipe.assignee} onChange={e => setNewPipe({ ...newPipe, assignee: e.target.value })}><option>Roy</option><option>Stanley</option></select>
              <button style={pill(true)} onClick={createPipeline}>Agregar</button>
            </div>
            {pipeline.map(p => (
              <article key={p.id} style={{ border: `1px solid ${UI.border}`, borderRadius: 10, padding: 10, marginBottom: 8, background: '#0f1730' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <b>{p.title}</b><span style={{ color: UI.sub }}>{p.stage} · {p.status} · {p.assignee}</span>
                </div>
                <textarea style={{ ...input, width: '100%', minHeight: 80, marginTop: 8 }} value={p.script || ''} onChange={e => patchPipeline(p.id, { script: e.target.value })} placeholder='Guion completo...' />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button style={pill()} onClick={() => patchPipeline(p.id, { status: 'in_progress' })}>In progress</button>
                  <button style={pill()} onClick={() => patchPipeline(p.id, { status: 'ready' })}>Ready</button>
                  <button style={pill(true)} onClick={() => patchPipeline(p.id, { stage: 'publish' })}>Evolucionar a Publish</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === 'calendar' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🗓 Calendar + Cron Arena</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input style={input} placeholder='Título evento' value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
              <input style={input} type='datetime-local' value={newEvent.startsAt} onChange={e => setNewEvent({ ...newEvent, startsAt: e.target.value })} />
              <button style={pill(true)} onClick={createEvent}>Agregar evento</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <div style={{ border: `1px solid ${UI.border}`, borderRadius: 10, padding: 10, background: '#0f1730' }}>
                <b>Próximos eventos</b>
                <ul>{calendar.slice().sort((a,b)=>a.startsAt>b.startsAt?1:-1).slice(0,10).map(e => <li key={e.id}>{new Date(e.startsAt).toLocaleString()} — {e.title} ({e.source})</li>)}</ul>
              </div>
              <div style={{ border: `1px solid ${UI.border}`, borderRadius: 10, padding: 10, background: '#0f1730' }}>
                <b>Deadlines de quests</b>
                <ul>{tasks.filter(t=>t.dueAt).slice(0,10).map(t => <li key={t.id}>{new Date(String(t.dueAt)).toLocaleString()} — {t.title} ({t.assignee})</li>)}</ul>
              </div>
            </div>
          </section>
        )}

        {tab === 'memory' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>📚 Memory Dex</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input style={{ ...input, minWidth: 260 }} value={qMem} onChange={e => setQMem(e.target.value)} placeholder='Buscar decisión, fecha, persona...' />
              <button style={pill(true)} onClick={searchMem}>Buscar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
              {memories.map((m, i) => <article key={i} style={{ border: `1px solid ${UI.border}`, borderRadius: 10, padding: 10, background: '#0f1730' }}><div style={{ color: UI.sub, fontSize: 12 }}>{m.file}{m.line ? `#${m.line}` : ''}</div><div>{m.excerpt}</div></article>)}
            </div>
          </section>
        )}

        {tab === 'team' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🧑‍🚀 Team Structure + Roles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
              {team.map((t, i) => (
                <article key={t.id} style={{ border: `1px solid ${UI.border}`, borderRadius: 10, padding: 10, background: '#0f1730' }}>
                  <img src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(t.name)}`} alt={t.name} style={{ width: 68, height: 68 }} />
                  <div><b>{t.name}</b></div>
                  <div style={{ color: UI.sub, fontSize: 12 }}>{t.role} · {t.type}</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Capacidad: {Math.max(1, 5 - i)}/5</div>
                  <ul>{t.responsibilities.map(r => <li key={r}>{r}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'office' && (
          <section style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>🗺 Virtual Office (Pokémon style)</h3>
            <p style={{ color: UI.sub }}>Leyenda: 🟢 entrenando · 🟡 en review · 🔴 bloqueado · ⚪ idle</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {team.map((t, i) => {
                const status = i % 4 === 0 ? 'running' : i % 4 === 1 ? 'review' : i % 4 === 2 ? 'blocked' : 'idle';
                const badge = status === 'running' ? '🟢' : status === 'review' ? '🟡' : status === 'blocked' ? '🔴' : '⚪';
                const area = i % 3 === 0 ? 'Planning Gym' : i % 3 === 1 ? 'Dev Lab' : 'Content Studio';
                return (
                  <article key={t.id} style={{ border: `1px solid ${UI.border}`, borderRadius: 12, padding: 10, background: '#0f1730' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(t.name + '-trainer')}`} alt={t.name} style={{ width: 72, height: 72 }} />
                      <div>
                        <div><b>{t.name}</b> {badge}</div>
                        <div style={{ color: UI.sub, fontSize: 12 }}>{t.role}</div>
                        <div style={{ fontSize: 12 }}>Zona: {area}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
