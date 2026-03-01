import http from 'node:http';
import { bots as mockBots, subagents as mockSubagents } from './data.js';
import { getOpenClawStatus } from './openclaw.js';

const port = Number(process.env.API_PORT || 8790);

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS'
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

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  if (req.url === '/health') return send(res, 200, { ok: true, service: 'bot-subagents-ops-dashboard', now: Date.now() });

  if (req.url === '/gateway') {
    return send(res, 200, {
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      hasGatewayToken: Boolean(process.env.OPENCLAW_GATEWAY_TOKEN),
      mode: 'remote-only'
    });
  }

  if (req.url === '/api/openclaw/status') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { ok: true, connected: true, now: Date.now(), status });
    } catch (error) {
      return send(res, 500, { ok: false, connected: false, now: Date.now(), error: String(error?.message || error) });
    }
  }

  if (req.url === '/api/bots') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapBotsFromStatus(status), source: 'openclaw', now: Date.now() });
    } catch {
      return send(res, 200, { items: mockBots, source: 'mock', now: Date.now() });
    }
  }

  if (req.url === '/api/subagents') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapSubagentsFromStatus(status), source: 'openclaw', now: Date.now() });
    } catch {
      return send(res, 200, { items: mockSubagents, source: 'mock', now: Date.now() });
    }
  }

  return send(res, 404, { ok: false, error: 'Not found', now: Date.now() });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`[bot-subagents-dashboard] backend listening on :${port}`));
}
