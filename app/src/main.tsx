import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Task = { id: string; title: string; status: string; assignee: string; priority: string; dueAt: string | null; notes: string };
type Pipeline = { id: string; stage: string; title: string; script: string; imageUrls: string[]; status: string; assignee: string; updatedAt: string };
type Cal = { id: string; title: string; startsAt: string; source: string; status: string };
type MemoryHit = { file: string; line?: number; excerpt: string };
type Team = { id: string; name: string; role: string; type: string; responsibilities: string[] };
type Office = { id: string; name: string; role: string; avatar: string; desk: string; atComputer: boolean; status: string };

const API = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8790';

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
  const [oc, setOc] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [calendar, setCalendar] = useState<Cal[]>([]);
  const [memories, setMemories] = useState<MemoryHit[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [office, setOffice] = useState<Office[]>([]);

  const [qMem, setQMem] = useState('');

  // forms
  const [newTask, setNewTask] = useState({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
  const [newPipe, setNewPipe] = useState({ title: '', stage: 'ideas', assignee: 'Roy' });
  const [newEvent, setNewEvent] = useState({ title: '', startsAt: '' });

  async function loadAll() {
    const [s, t, p, c, m, tm, of] = await Promise.all([
      fetch(`${API}/api/openclaw/status`).then(r => r.json()).catch(() => ({ ok: false })),
      fetch(`${API}/api/tasks`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${API}/api/pipeline`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${API}/api/calendar`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${API}/api/memories`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${API}/api/team`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${API}/api/office`).then(r => r.json()).catch(() => ({ items: [] }))
    ]);
    setOc(Boolean(s?.ok));
    setTasks(t.items || []);
    setPipeline(p.items || []);
    setCalendar(c.items || []);
    setMemories(m.items || []);
    setTeam(tm.items || []);
    setOffice(of.items || []);
    setLastSync(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    loadAll().catch(() => void 0);
    const i = setInterval(() => loadAll().catch(() => void 0), 6000);
    return () => clearInterval(i);
  }, []);

  async function createTask() {
    await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newTask, dueAt: newTask.dueAt || null }) });
    setNewTask({ title: '', assignee: 'Stanley', priority: 'medium', dueAt: '' });
    await loadAll();
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    await fetch(`${API}/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
    await loadAll();
  }

  async function createPipeline() {
    await fetch(`${API}/api/pipeline`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(newPipe) });
    setNewPipe({ title: '', stage: 'ideas', assignee: 'Roy' });
    await loadAll();
  }

  async function patchPipeline(id: string, patch: Partial<Pipeline>) {
    await fetch(`${API}/api/pipeline/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
    await loadAll();
  }

  async function createEvent() {
    await fetch(`${API}/api/calendar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...newEvent, source: 'manual' }) });
    setNewEvent({ title: '', startsAt: '' });
    await loadAll();
  }

  async function searchMem() {
    const d = await fetch(`${API}/api/memories?q=${encodeURIComponent(qMem)}`).then(r => r.json()).catch(() => ({ items: [] }));
    setMemories(d.items || []);
  }

  const tasksByStatus = useMemo(() => {
    const g: Record<string, number> = {};
    tasks.forEach(t => { g[t.status] = (g[t.status] || 0) + 1; });
    return g;
  }, [tasks]);

  return (
    <main style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Mission Control Dashboard v3</h1>
      <p style={{ marginTop: 0, color: '#4b5563' }}>OpenClaw: <strong style={{ color: oc ? '#15803d' : '#b91c1c' }}>{oc === null ? 'verificando...' : oc ? 'conectado' : 'sin conexión'}</strong> · último refresh: {lastSync || '-'}</p>

      <Tabs tab={tab} setTab={setTab} />

      {tab === 'tasks' && (
        <>
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
        </>
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
