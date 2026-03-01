import http from 'node:http';
const port = Number(process.env.API_PORT || 8790);
const server = http.createServer((req, res) => {
  if (req.url === '/health') return res.end(JSON.stringify({ ok:true, service:'bot-subagents-ops-dashboard' }));
  if (req.url === '/gateway') return res.end(JSON.stringify({ openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || null, hasGatewayToken: Boolean(process.env.OPENCLAW_GATEWAY_TOKEN) }));
  res.statusCode=404; res.end(JSON.stringify({ ok:false }));
});
server.listen(port, ()=>console.log(`[bot-dashboard] backend :${port}`));
