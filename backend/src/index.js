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

function mapBotsFromStatus(status) {
  const byAgent = status?.sessions?.byAgent || [];
  if (!byAgent.length) return mockBots;
  return byAgent.map((a, idx) => ({
    id: `bot-${idx + 1}`,
    name: a.agentId || `agent-${idx + 1}`,
    status: 'running',
    queue: Math.max(0, (a.count || 0) - 1),
    updatedAt: new Date().toISOString()
  }));
}

function mapSubagentsFromStatus(status) {
  const recent = status?.sessions?.recent || [];
  if (!recent.length) return mockSubagents;
  return recent.slice(0, 12).map((s, idx) => ({
    id: `sa-${idx + 1}`,
    task: s.key || 'session',
    status: s.percentUsed != null ? (s.percentUsed > 80 ? 'running' : 'queued') : 'queued',
    owner: s.agentId || 'main',
    updatedAt: new Date(s.updatedAt || Date.now()).toISOString()
  }));
}

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  if (req.url === '/health') return send(res, 200, { ok: true, service: 'bot-subagents-ops-dashboard' });

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
      return send(res, 200, { ok: true, connected: true, status });
    } catch (error) {
      return send(res, 500, { ok: false, connected: false, error: String(error?.message || error) });
    }
  }

  if (req.url === '/api/bots') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapBotsFromStatus(status), source: 'openclaw' });
    } catch {
      return send(res, 200, { items: mockBots, source: 'mock' });
    }
  }

  if (req.url === '/api/subagents') {
    try {
      const status = await getOpenClawStatus();
      return send(res, 200, { items: mapSubagentsFromStatus(status), source: 'openclaw' });
    } catch {
      return send(res, 200, { items: mockSubagents, source: 'mock' });
    }
  }

  return send(res, 404, { ok: false, error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`[bot-subagents-dashboard] backend listening on :${port}`));
}
