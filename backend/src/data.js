export const bots = [
  { id: 'bot-main', name: 'main-assistant', status: 'running', queue: 2, updatedAt: new Date().toISOString() },
  { id: 'bot-ux', name: 'ux-ops-agent', status: 'running', queue: 5, updatedAt: new Date().toISOString() },
  { id: 'bot-shorts', name: 'shorts-agent', status: 'queued', queue: 3, updatedAt: new Date().toISOString() }
];

export const subagents = [
  { id: 'sa-1', task: 'L123 matrix validation', status: 'running', owner: 'ux-ops-agent', updatedAt: new Date().toISOString() },
  { id: 'sa-2', task: 'video pipeline QA', status: 'queued', owner: 'shorts-agent', updatedAt: new Date().toISOString() }
];
