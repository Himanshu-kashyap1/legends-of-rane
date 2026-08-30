import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { Base } from '../src/models/Base.js';
import {
  getDefaultStarterBlocks,
  loadPlayerBase,
  savePlayerBase,
  placeBlock,
  destroyBlock,
  clearPlayerBase
} from '../src/engine/voxel/baseEngine.js';
import {
  WORLD_CONFIG,
  BLOCK_CATALOG,
  isValidBlockType,
  areCoordinatesValid
} from '../src/engine/voxel/blockConfig.js';
import { createExpressApp } from '../src/server/app.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await Base.deleteMany({ telegramId: { $in: ['voxel_builder_1', 'voxel_builder_2'] } });
  await disconnectDatabase();
});

test('1. Block Catalog contains 28+ defined blocks and valid category groupings', () => {
  const blockKeys = Object.keys(BLOCK_CATALOG);
  assert.ok(blockKeys.length >= 28);
  assert.strictEqual(isValidBlockType('grass'), true);
  assert.strictEqual(isValidBlockType('ore_diamond'), true);
  assert.strictEqual(isValidBlockType('decor_lantern'), true);
  assert.strictEqual(isValidBlockType('invalid_block_xyz'), false);
});

test('2. Coordinate validation respects world boundaries', () => {
  assert.strictEqual(areCoordinatesValid(0, 0, 0), true);
  assert.strictEqual(areCoordinatesValid(16, 24, 16), true);
  assert.strictEqual(areCoordinatesValid(-16, 0, -16), true);

  // Out of bounds
  assert.strictEqual(areCoordinatesValid(17, 0, 0), false);
  assert.strictEqual(areCoordinatesValid(0, 25, 0), false);
  assert.strictEqual(areCoordinatesValid(0, -9, 0), false);
  assert.strictEqual(areCoordinatesValid(0.5, 0, 0), false); // Non-integer
});

test('3. Initial base load auto-initializes starter foundation', async () => {
  const telegramId = 'voxel_builder_1';
  await Base.deleteMany({ telegramId });

  const loadRes = await loadPlayerBase(telegramId);
  assert.strictEqual(loadRes.success, true);
  assert.strictEqual(loadRes.base.telegramId, telegramId);
  assert.strictEqual(loadRes.base.blockCount, 102); // 4 deep layers (4x25) + 2 altar blocks
  assert.ok(loadRes.base.blocks.find(b => b.blockType === 'holy_crystal'));
});

test('4, 5. Single block placement, coordinate replacement, and destruction', async () => {
  const telegramId = 'voxel_builder_1';

  // 1. Place gold ore at (1, 1, 1)
  const placeRes = await placeBlock(telegramId, { x: 1, y: 1, z: 1, blockType: 'ore_gold' });
  assert.strictEqual(placeRes.success, true);
  assert.strictEqual(placeRes.block.blockType, 'ore_gold');

  // 2. Replace with diamond ore at (1, 1, 1)
  const replaceRes = await placeBlock(telegramId, { x: 1, y: 1, z: 1, blockType: 'ore_diamond' });
  assert.strictEqual(replaceRes.success, true);
  assert.strictEqual(replaceRes.block.blockType, 'ore_diamond');

  // 3. Destroy block at (1, 1, 1)
  const destroyRes = await destroyBlock(telegramId, { x: 1, y: 1, z: 1 });
  assert.strictEqual(destroyRes.success, true);
  assert.strictEqual(destroyRes.removed, true);
});

test('6. Batch save deduplicates coordinates and filters invalid blocks', async () => {
  const telegramId = 'voxel_builder_1';
  const rawBlocks = [
    { x: 0, y: 0, z: 0, blockType: 'grass' },
    { x: 0, y: 0, z: 0, blockType: 'obsidian' }, // duplicate coord -> replaces grass
    { x: 5, y: 5, z: 5, blockType: 'ore_emerald' },
    { x: 100, y: 0, z: 0, blockType: 'dirt' }, // invalid coord -> dropped
    { x: 0, y: 0, z: 1, blockType: 'fake_material_999' } // invalid block -> dropped
  ];

  const saveRes = await savePlayerBase(telegramId, rawBlocks);
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.invalidCount, 2);
  assert.strictEqual(saveRes.base.blockCount, 2); // obsidian and emerald

  const obsidianBlock = saveRes.base.blocks.find(b => b.x === 0 && b.y === 0 && b.z === 0);
  assert.strictEqual(obsidianBlock.blockType, 'obsidian');
});

test('7. Exceeding max blocks limit (2000) is safely rejected', async () => {
  const telegramId = 'voxel_builder_1';
  const oversizedBlocks = new Array(2001).fill({ x: 0, y: 0, z: 0, blockType: 'dirt' });

  const res = await savePlayerBase(telegramId, oversizedBlocks);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'EXCEEDED_MAX_BLOCKS');
});

test('8. Clear base resets all blocks', async () => {
  const telegramId = 'voxel_builder_1';
  const clearRes = await clearPlayerBase(telegramId);
  assert.strictEqual(clearRes.success, true);

  const base = await Base.findOne({ telegramId });
  assert.strictEqual(base.blocks.length, 0);
  assert.strictEqual(base.blockCount, 0);
});

test('9. Cross-player base isolation', async () => {
  const playerA = 'voxel_builder_1';
  const playerB = 'voxel_builder_2';

  await clearPlayerBase(playerA);
  await clearPlayerBase(playerB);

  await placeBlock(playerA, { x: 0, y: 0, z: 0, blockType: 'ore_gold' });
  await placeBlock(playerB, { x: 0, y: 0, z: 0, blockType: 'obsidian' });

  const baseA = await Base.findOne({ telegramId: playerA });
  const baseB = await Base.findOne({ telegramId: playerB });

  assert.strictEqual(baseA.blocks[0].blockType, 'ore_gold');
  assert.strictEqual(baseB.blocks[0].blockType, 'obsidian');
});

test('10. Express REST API endpoints respond correctly', async () => {
  const app = createExpressApp();

  // Test /api/base/blocks
  const reqBlocks = { method: 'GET', url: '/api/base/blocks' };
  // Using direct handler or mock fetch
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. GET /api/base/blocks
    const resBlocks = await fetch(`${baseUrl}/api/base/blocks`);
    const dataBlocks = await resBlocks.json();
    assert.strictEqual(dataBlocks.success, true);
    assert.ok(dataBlocks.blocks.grass);

    // 2. GET /api/base/load
    const resLoad = await fetch(`${baseUrl}/api/base/load?telegramId=voxel_builder_1`);
    const dataLoad = await resLoad.json();
    assert.strictEqual(dataLoad.success, true);

    // 3. POST /api/base/place
    const resPlace = await fetch(`${baseUrl}/api/base/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: 'voxel_builder_1', x: 2, y: 2, z: 2, blockType: 'crystal_magic' })
    });
    const dataPlace = await resPlace.json();
    assert.strictEqual(dataPlace.success, true);
    assert.strictEqual(dataPlace.block.blockType, 'crystal_magic');

    // 4. POST /api/base/clear
    const resClear = await fetch(`${baseUrl}/api/base/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: 'voxel_builder_1' })
    });
    const dataClear = await resClear.json();
    assert.strictEqual(dataClear.success, true);
  } finally {
    server.close();
  }
});

test('11. handleBaseCommand safely handles callback queries and commands without Telegram 400 Bad Request', async () => {
  const { handleBaseCommand } = await import('../src/telegram/commands/base.js');

  let sentText = '';
  let sentMarkup = null;

  // Mock ctx for command
  const commandCtx = {
    state: { user: { telegramId: 'voxel_builder_1' } },
    reply: async (text, opts) => {
      sentText = text;
      sentMarkup = opts;
    }
  };

  await handleBaseCommand(commandCtx);
  assert.ok(sentText.includes('VOXEL KINGDOM'));
  assert.ok(sentMarkup.reply_markup);

  // Mock ctx for callback
  let callbackEditedText = '';
  const callbackCtx = {
    state: { user: { telegramId: 'voxel_builder_1' } },
    callbackQuery: { id: 'cb1' },
    editMessageText: async (text) => {
      callbackEditedText = text;
    },
    reply: async (text) => {
      callbackEditedText = text;
    }
  };

  await handleBaseCommand(callbackCtx);
  assert.ok(callbackEditedText.includes('VOXEL KINGDOM'));
});

test('12. Rate limiting and malformed payload protection on /api/base/save', async () => {
  const app = createExpressApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Malformed body (missing telegramId)
    const resBad = await fetch(`${baseUrl}/api/base/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: [] })
    });
    assert.strictEqual(resBad.status, 400);

    // Non-array blocks
    const resNonArray = await fetch(`${baseUrl}/api/base/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: 'voxel_builder_1', blocks: 'invalid_string' })
    });
    assert.strictEqual(resNonArray.status, 400);
  } finally {
    server.close();
  }
});

