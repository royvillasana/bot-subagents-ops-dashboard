import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bot-subagents-ops-dashboard/',
  server: {
    host: true,
    allowedHosts: true
  },
  preview: {
    host: true,
    allowedHosts: true
  }
});
