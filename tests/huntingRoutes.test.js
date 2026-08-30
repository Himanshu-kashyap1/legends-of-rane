import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { createExpressApp } from '../src/server/app.js';
import { User } from '../src/models/User.js';

let server = null;
let baseUrl = '';

test.before(async () => {
  await connectDatabase();
  const app = createExpressApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
});

test('HTTP 1: GET /api/hunting/world-state returns player data, biomes and weapon progression', async () => {
  const telegramId = 'route_hunter_1';
  await User.deleteOne({ telegramId });

  const res = await fetch(`${baseUrl}/api/hunting/world-state?telegramId=${telegramId}`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.success, true);
  assert.ok(data.player);
  assert.strictEqual(data.player.telegramId, telegramId);
  assert.ok(data.biomes.FOREST);
  assert.ok(data.biomes.QUARRY);
  assert.ok(data.biomes.CAVERNS);
  assert.ok(data.biomes.VOLCANO);
  assert.ok(data.biomes.RUINS);
  assert.ok(data.monsters.forest_wolf);
  assert.ok(data.weapons.wpn_wood_blade);
});

test('HTTP 2: POST /api/hunting/start-session and POST /api/hunting/claim-kill workflow', async () => {
  const telegramId = 'route_hunter_kill_1';
  await User.deleteOne({ telegramId });

  const user = new User({ telegramId, level: 3, coins: 200, inventory: [] });
  await user.save();

  // 1. Start Session
  const sessRes = await fetch(`${baseUrl}/api/hunting/start-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, monsterId: 'stone_golem' })
  });
  assert.strictEqual(sessRes.status, 200);
  const sessData = await sessRes.json();
  assert.strictEqual(sessData.success, true);
  const sessionToken = sessData.session.sessionToken;
  assert.ok(sessionToken);

  // 2. Claim Kill
  const killRes = await fetch(`${baseUrl}/api/hunting/claim-kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegramId,
      sessionToken,
      monsterId: 'stone_golem',
      timeTakenMs: 3500
    })
  });
  assert.strictEqual(killRes.status, 200);
  const killData = await killRes.json();

  assert.strictEqual(killData.success, true);
  assert.strictEqual(killData.monsterName, 'Stone Golem');
  assert.ok(killData.coinsEarned > 0);
  assert.ok(killData.xpEarned > 0);
  assert.strictEqual(killData.updatedCoins, 200 + killData.coinsEarned);
});

test('HTTP 3: POST /api/hunting/craft-gear crafts and equips weapon via HTTP', async () => {
  const telegramId = 'route_hunter_gear_1';
  await User.deleteOne({ telegramId });

  const user = new User({
    telegramId,
    level: 4,
    inventory: [
      { itemId: 'ore_iron', quantity: 20 },
      { itemId: 'wood_oak', quantity: 40 }
    ]
  });
  await user.save();

  const craftRes = await fetch(`${baseUrl}/api/hunting/craft-gear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, weaponId: 'wpn_iron_greatsword' })
  });
  assert.strictEqual(craftRes.status, 200);
  const craftData = await craftRes.json();

  assert.strictEqual(craftData.success, true);
  assert.strictEqual(craftData.equippedWeapon.id, 'wpn_iron_greatsword');
  assert.strictEqual(craftData.equippedWeapon.attack, 65);
});
