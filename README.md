# bot-subagents-ops-dashboard

Dashboard operativo para bots/subagentes.

## Regla clave
No instala OpenClaw localmente. Se conecta a Gateway remoto (Hostinger VPS).

## Quickstart
```bash
npm install --workspaces
npm run dev:backend
npm run dev:web
```

Backend endpoints:
- `GET /health`
- `GET /gateway`
- `GET /api/bots`
- `GET /api/subagents`
