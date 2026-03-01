import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from './index.js';

test('bots endpoint returns items', async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/bots`);
  const body = await res.json();
  assert.equal(Array.isArray(body.items), true);
  assert.equal(body.items.length > 0, true);
  server.close();
});
