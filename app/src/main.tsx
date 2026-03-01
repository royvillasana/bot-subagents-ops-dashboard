import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Bot = { id: string; name: string; status: string; queue: number; updatedAt: string };
type Subagent = { id: string; task: string; status: string; owner: string; updatedAt: string };

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8790';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [subs, setSubs] = useState<Subagent[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'queued' | 'success' | 'failed'>('all');
  const [ocConnected, setOcConnected] = useState<boolean | null>(null);

  async function load() {
    const [b, s, oc] = await Promise.all([
      fetch(`${API_BASE}/api/bots`).then((r) => r.json()),
      fetch(`${API_BASE}/api/subagents`).then((r) => r.json()),
      fetch(`${API_BASE}/api/openclaw/status`).then((r) => r.json()).catch(() => ({ ok: false }))
    ]);
    setBots(b.items || []);
    setSubs(s.items || []);
    setOcConnected(Boolean(oc?.ok));
  }

  useEffect(() => {
    load().catch(() => void 0);
    const i = setInterval(() => load().catch(() => void 0), 10000);
    return () => clearInterval(i);
  }, []);

  const filteredSubs = useMemo(
    () => subs.filter((s) => (filter === 'all' ? true : s.status === filter)),
    [subs, filter]
  );

  return (
    <main style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Bot & Subagents Ops Dashboard v2</h1>
      <p style={{ color: '#4b5563' }}>Monitoreo operativo de bots, subagentes y carga de trabajo.</p>
      <p style={{ marginTop: 0, fontSize: 13, color: ocConnected ? '#15803d' : '#b91c1c' }}>OpenClaw: {ocConnected === null ? 'verificando...' : ocConnected ? 'conectado' : 'sin conexión'}</p>

      <Panel title="Bots activos">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Bot</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Queue</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => (
              <tr key={b.id}>
                <td style={{ borderTop: '1px solid #f3f4f6', padding: 8 }}>{b.name}</td>
                <td style={{ borderTop: '1px solid #f3f4f6', padding: 8 }}>{b.status}</td>
                <td style={{ borderTop: '1px solid #f3f4f6', padding: 8 }}>{b.queue}</td>
                <td style={{ borderTop: '1px solid #f3f4f6', padding: 8 }}>{new Date(b.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Subagentes">
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, color: '#374151', marginRight: 8 }}>Filtrar por estado:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ padding: 8, borderRadius: 8 }}>
            <option value="all">all</option>
            <option value="running">running</option>
            <option value="queued">queued</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <ul style={{ paddingLeft: 18 }}>
          {filteredSubs.map((s) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              <strong>{s.task}</strong> — {s.status} — owner: {s.owner}
            </li>
          ))}
          {!filteredSubs.length && <li>Sin resultados</li>}
        </ul>
      </Panel>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
