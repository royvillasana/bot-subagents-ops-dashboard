import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
      <h1>Bot & Subagents Ops Dashboard</h1>
      <p>Vista inicial para monitoreo operativo.</p>
      <ul>
        <li>Bots activos / inactivos</li>
        <li>Subagentes en ejecución</li>
        <li>Errores y bloqueos recientes</li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
