import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE || 'http://127.0.0.1:3000';

async function json(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/json',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('health', async () => {
  const { status, data } = await json('/health');
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

test('login + save item without folderId + inventory + upgrade', async () => {
  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@trackvint.local', password: 'demo' }),
  });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
  const auth = { Authorization: `Bearer ${login.data.token}` };

  const save = await json('/api/extension/items/save', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ item: { vintedId: '42', title: 'Smoke' } }),
  });
  assert.equal(save.status, 201);
  assert.equal(save.data.folderId, 'folder_niches');

  const up = await json('/api/extension/subscription/upgrade', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ plan: 'pro' }),
  });
  assert.equal(up.status, 200);
  assert.equal(up.data.plan, 'pro');

  const radar = await json('/api/radar/sold-similar?brand=Nike', { headers: auth });
  assert.equal(radar.status, 200);
  assert.equal(radar.data.locked.priceStats, false);
  assert.ok(radar.data.avgPrice != null);

  const inv = await json('/api/inventory', { headers: auth });
  assert.equal(inv.status, 200);
  assert.ok(Array.isArray(inv.data.items));
  assert.ok(inv.data.summary);

  const seller = await json('/api/stats?sellerId=999888');
  assert.equal(seller.status, 200);
  assert.equal(seller.data.seller.login, 'vendeur-9888');
});
