import http from 'node:http';
import { bots, subagents } from './data.js';

const port = Number(process.env.API_PORT || 8790);

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

export const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  if (req.url === '/health') return send(res, 200, { ok: true, service: 'bot-subagents-ops-dashboard' });
  if (req.url === '/gateway') {
    return send(res, 200, {
      openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null,
      hasGatewayToken: Boolean(process.env.OPENCLAW_GATEWAY_TOKEN),
      mode: 'remote-only'
    });
  }

  if (req.url === '/api/bots') return send(res, 200, { items: bots });
  if (req.url === '/api/subagents') return send(res, 200, { items: subagents });

  return send(res, 404, { ok: false, error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`[bot-subagents-dashboard] backend listening on :${port}`));
}
