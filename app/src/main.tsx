import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Bot = { id: string; name: string; status: string; queue: number; updatedAt: string };
type Subagent = { id: string; task: string; status: string; owner: string; updatedAt: string };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [subs, setSubs] = useState<Subagent[]>([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8790/api/bots').then((r) => r.json()).then((d) => setBots(d.items || []));
    fetch('http://127.0.0.1:8790/api/subagents').then((r) => r.json()).then((d) => setSubs(d.items || []));
  }, []);

  return (
    <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Bot & Subagents Ops Dashboard</h1>
      <p>Control operativo central de bots y subagentes.</p>

      <Card title="Bots">
        <ul>
          {bots.map((b) => (
            <li key={b.id}><strong>{b.name}</strong> — {b.status} — queue {b.queue}</li>
          ))}
        </ul>
      </Card>

      <Card title="Subagentes">
        <ul>
          {subs.map((s) => (
            <li key={s.id}><strong>{s.task}</strong> — {s.status} — owner {s.owner}</li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
