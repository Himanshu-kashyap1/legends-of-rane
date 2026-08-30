import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderHelpView,
  renderGatheringCategoryView,
  renderBlacksmithCategoryView,
  renderEconomyCategoryView,
  renderBaseCategoryView,
  renderCategoryDetailView,
  renderCommandDetailView
} from '../src/telegram/views/helpView.js';
import {
  renderGatheringCard,
  renderBlacksmithCard,
  renderEconomyCard,
  renderBaseCard,
  renderCategoryCard
} from '../src/services/cardService.js';
import { getDynamicBannerBuffer } from '../src/telegram/commands/start.js';
import { parseCallback } from '../src/telegram/buttons/callbackData.js';

const mockUser = {
  telegramId: '123456789',
  username: 'test_hero',
  firstName: 'TestHero',
  level: 5,
  coins: 1250,
  skills: {
    woodcutting: { level: 3, xp: 120 },
    mining: { level: 4, xp: 240 },
    crafting: { level: 2, xp: 50 },
    fishing: { level: 1, xp: 0 }
  },
  inventory: [
    { itemId: 'wood_oak', quantity: 15 },
    { itemId: 'stone_granite', quantity: 20 }
  ]
};

test('1. Command Guide: renderHelpView lists the 4 category commands and clean navigation', () => {
  const { text, keyboard } = renderHelpView(mockUser);

  assert.ok(text.includes('/gatheringharvest'));
  assert.ok(text.includes('/blacksmithequipment'));
  assert.ok(text.includes('/economytrading'));
  assert.ok(text.includes('/3dvoxelbasemultiplayer'));

  assert.ok(keyboard && keyboard.reply_markup && keyboard.reply_markup.inline_keyboard);
  const rows = keyboard.reply_markup.inline_keyboard;
  assert.ok(rows.length >= 3);

  // Validate callback data lengths under 64 bytes
  for (const row of rows) {
    for (const btn of row) {
      if (btn.callback_data) {
        assert.ok(Buffer.byteLength(btn.callback_data, 'utf8') <= 64);
        const parsed = parseCallback(btn.callback_data);
        assert.strictEqual(parsed.isValid, true);
      }
    }
  }
});

test('2. Category 1: Gathering & Harvest View renders max 3 action buttons + Back + Home', () => {
  const { text, keyboard } = renderGatheringCategoryView(mockUser);

  assert.ok(text.includes('GATHERING & HARVEST'));
  assert.ok(text.includes('/chop'));
  assert.ok(text.includes('/mine'));

  const rows = keyboard.reply_markup.inline_keyboard;
  // Row 1: Forest & Quarry
  assert.strictEqual(rows[0][0].text, '🌳 Forest');
  assert.strictEqual(rows[0][1].text, '🪨 Quarry');
  // Row 2: Deep Mines
  assert.strictEqual(rows[1][0].text, '⛏️ Deep Mines');
  // Row 3: Back & Home
  assert.strictEqual(rows[2][0].text, '⬅️ Back');
  assert.strictEqual(rows[2][1].text, '🏠 Home');

  for (const row of rows) {
    for (const btn of row) {
      if (btn.callback_data) {
        assert.ok(Buffer.byteLength(btn.callback_data, 'utf8') <= 64);
      }
    }
  }
});

test('3. Category 2: Blacksmith & Equipment View renders max 4 action buttons + Back + Home', () => {
  const { text, keyboard } = renderBlacksmithCategoryView(mockUser);

  assert.ok(text.includes('BLACKSMITH & EQUIPMENT'));
  assert.ok(text.includes('/craft'));
  assert.ok(text.includes('/tools'));

  const rows = keyboard.reply_markup.inline_keyboard;
  assert.strictEqual(rows[0][0].text, '🔨 Craft');
  assert.strictEqual(rows[0][1].text, '🛠️ Repair');
  assert.strictEqual(rows[1][0].text, '⬆️ Upgrade');
  assert.strictEqual(rows[1][1].text, '🎒 Tools');
  assert.strictEqual(rows[2][0].text, '⬅️ Back');
  assert.strictEqual(rows[2][1].text, '🏠 Home');
});

test('4. Category 3: Economy & Trading View renders max 4 action buttons + Back + Home', () => {
  const { text, keyboard } = renderEconomyCategoryView(mockUser);

  assert.ok(text.includes('ECONOMY & TRADING'));
  assert.ok(text.includes('/bag'));
  assert.ok(text.includes('/market'));

  const rows = keyboard.reply_markup.inline_keyboard;
  assert.strictEqual(rows[0][0].text, '🏪 Market');
  assert.strictEqual(rows[0][1].text, '💰 Sell');
  assert.strictEqual(rows[1][0].text, '🎁 Gift');
  assert.strictEqual(rows[1][1].text, '🏆 Leaderboard');
  assert.strictEqual(rows[2][0].text, '⬅️ Back');
  assert.strictEqual(rows[2][1].text, '🏠 Home');
});

test('5. Category 4: 3D Voxel Base View renders Open Base + Raid + Multiplayer + Back + Home', () => {
  const { text, keyboard } = renderBaseCategoryView(mockUser);

  assert.ok(text.includes('3D VOXEL BASE & MULTIPLAYER'));
  assert.ok(text.includes('/base'));

  const rows = keyboard.reply_markup.inline_keyboard;
  assert.strictEqual(rows[0][0].text, '🏗️ Open Base');
  assert.strictEqual(rows[1][0].text, '⚔️ Group Raid');
  assert.strictEqual(rows[1][1].text, '👥 Multiplayer');
  assert.strictEqual(rows[2][0].text, '⬅️ Back');
  assert.strictEqual(rows[2][1].text, '🏠 Home');
});

test('6. Category Dispatcher: renderCategoryDetailView routes all aliases correctly', () => {
  const g = renderCategoryDetailView(mockUser, 'gatheringharvest');
  assert.ok(g.text.includes('GATHERING & HARVEST'));

  const b = renderCategoryDetailView(mockUser, 'blacksmithequipment');
  assert.ok(b.text.includes('BLACKSMITH & EQUIPMENT'));

  const e = renderCategoryDetailView(mockUser, 'economytrading');
  assert.ok(e.text.includes('ECONOMY & TRADING'));

  const v = renderCategoryDetailView(mockUser, '3dvoxelbasemultiplayer');
  assert.ok(v.text.includes('3D VOXEL BASE & MULTIPLAYER'));
});

test('7. Multi-Moment Dynamic Scenery Banner: Resolves Morning, Noon, Sunset, and Midnight images', () => {
  // Morning (07:00)
  const morningDate = new Date('2026-08-30T07:00:00');
  const morningBuf = getDynamicBannerBuffer(morningDate);
  assert.ok(Buffer.isBuffer(morningBuf));
  assert.ok(morningBuf.length > 100000);

  // Noon (12:00)
  const noonDate = new Date('2026-08-30T12:00:00');
  const noonBuf = getDynamicBannerBuffer(noonDate);
  assert.ok(Buffer.isBuffer(noonBuf));
  assert.ok(noonBuf.length > 100000);

  // Sunset (18:00)
  const sunsetDate = new Date('2026-08-30T18:00:00');
  const sunsetBuf = getDynamicBannerBuffer(sunsetDate);
  assert.ok(Buffer.isBuffer(sunsetBuf));
  assert.ok(sunsetBuf.length > 100000);

  // Midnight (23:00)
  const midnightDate = new Date('2026-08-30T23:00:00');
  const midnightBuf = getDynamicBannerBuffer(midnightDate);
  assert.ok(Buffer.isBuffer(midnightBuf));
  assert.ok(midnightBuf.length > 100000);
});

test('8. Visual Cards: Renders 800px PNG buffers for all 4 RPG category cards', () => {
  // 1. Gathering & Harvest
  const gBuf = renderGatheringCard(mockUser);
  assert.ok(Buffer.isBuffer(gBuf));
  assert.ok(gBuf.length > 10000);

  // 2. Blacksmith & Equipment
  const bBuf = renderBlacksmithCard(mockUser);
  assert.ok(Buffer.isBuffer(bBuf));
  assert.ok(bBuf.length > 10000);

  // 3. Economy & Trading
  const eBuf = renderEconomyCard(mockUser);
  assert.ok(Buffer.isBuffer(eBuf));
  assert.ok(eBuf.length > 10000);

  // 4. 3D Voxel World
  const vBuf = renderBaseCard(mockUser);
  assert.ok(Buffer.isBuffer(vBuf));
  assert.ok(vBuf.length > 10000);

  // Generic router
  const routedBuf = renderCategoryCard('gatheringharvest', mockUser);
  assert.ok(Buffer.isBuffer(routedBuf));
  assert.ok(routedBuf.length > 10000);
});
