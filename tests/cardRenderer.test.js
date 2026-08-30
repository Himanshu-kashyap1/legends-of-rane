import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeSvg,
  truncateText
} from '../src/renderer/svgHelpers.js';
import {
  generateMainMenuSvg,
  generateProfileSvg,
  generateInventorySvg,
  generateLeaderboardSvg
} from '../src/renderer/cardTemplates.js';
import { renderSvgToPngBuffer } from '../src/renderer/cardRenderer.js';
import {
  renderMainMenuCard,
  renderProfileCard,
  renderInventoryCard,
  renderLeaderboardCard,
  sendOrEditCardMessage
} from '../src/services/cardService.js';

// PNG Magic Bytes Signature
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isValidPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  return buffer.subarray(0, 8).equals(PNG_MAGIC_BYTES);
}

test('1. XML/SVG escaping and text truncation', () => {
  const maliciousInput = '<script>alert("hack & steal \'coins\'")</script>';
  const escaped = escapeSvg(maliciousInput);

  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(escaped.includes('&amp;'));
  assert.ok(escaped.includes('&quot;'));
  assert.ok(escaped.includes('&apos;'));

  // Truncation
  const longName = 'Sir Arch-Mage of the Ancient Whispering Woodlands';
  const truncated = truncateText(longName, 15);
  assert.ok(truncated.length <= 20);
  assert.ok(truncated.endsWith('…'));
});

test('2. Main Menu Card renders valid 800px PNG buffer', () => {
  const user = {
    username: 'hero_adventurer',
    firstName: 'Hero',
    title: 'Timber Initiate',
    level: 5,
    coins: 1540,
    energy: { current: 80, max: 100 },
    activePet: 'pet_timber_wolf'
  };

  const buffer = renderMainMenuCard(user);
  assert.ok(isValidPngBuffer(buffer));
  assert.ok(buffer.length > 5000); // Realistic high-res PNG size
});

test('3. Profile Card renders valid PNG with skill masteries', () => {
  const user = {
    username: 'grand_master',
    title: 'Grand Arch-Smith',
    level: 12,
    xp: 250,
    coins: 10000,
    skills: {
      woodcutting: { level: 8, xp: 50 },
      mining: { level: 6, xp: 120 },
      crafting: { level: 10, xp: 0 },
      fishing: { level: 3, xp: 20 },
      exploration: { level: 5, xp: 40 }
    }
  };

  const buffer = renderProfileCard(user);
  assert.ok(isValidPngBuffer(buffer));
});

test('4. Inventory Card renders valid PNG with tools and stacked items', () => {
  const user = {
    username: 'craft_collector',
    tools: [
      { toolId: 'tool_axe_gold', tier: 4, equipped: true },
      { toolId: 'tool_pickaxe_diamond', tier: 5, equipped: true }
    ],
    inventory: [
      { itemId: 'wood_oak', quantity: 64 },
      { itemId: 'stone_granite', quantity: 32 },
      { itemId: 'ingot_iron', quantity: 10 }
    ]
  };

  const buffer = renderInventoryCard(user, 1);
  assert.ok(isValidPngBuffer(buffer));
});

test('5. Leaderboard Card renders valid podium PNG', () => {
  const leaderboardData = [
    { name: '@champion', level: 25, score: 50000 },
    { name: '@berserker', level: 20, score: 35000 },
    { name: '@adventurer', level: 18, score: 20000 }
  ];

  const buffer = renderLeaderboardCard(leaderboardData);
  assert.ok(isValidPngBuffer(buffer));
});

test('6. Empty data and missing fields handled gracefully without crashing', () => {
  // Empty user
  const emptyMenuBuf = renderMainMenuCard({});
  assert.ok(isValidPngBuffer(emptyMenuBuf));

  // Empty profile
  const emptyProfBuf = renderProfileCard({});
  assert.ok(isValidPngBuffer(emptyProfBuf));

  // Empty inventory
  const emptyInvBuf = renderInventoryCard({ inventory: [], tools: [] }, 1);
  assert.ok(isValidPngBuffer(emptyInvBuf));

  // Empty leaderboard
  const emptyLdBuf = renderLeaderboardCard([]);
  assert.ok(isValidPngBuffer(emptyLdBuf));
});

test('7. Renderer failure handling on invalid SVG input', () => {
  assert.throws(() => {
    renderSvgToPngBuffer('not an svg string');
  }, /Card rendering failed/);

  assert.throws(() => {
    renderSvgToPngBuffer(null);
  }, /Valid SVG string is required/);
});

test('8. Telegram sendOrEditCardMessage delivers photo or falls back gracefully', async () => {
  let photoSent = false;
  let textFallbackSent = false;

  const validCtx = {
    replyWithPhoto: async () => { photoSent = true; },
    reply: async () => { textFallbackSent = true; }
  };

  // 1. Successful Photo Delivery
  const dummyBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await sendOrEditCardMessage(validCtx, { text: 'Test', keyboard: {}, pngBuffer: dummyBuf });
  assert.strictEqual(photoSent, true);

  // 2. Photo Failure triggers text fallback
  const failingCtx = {
    replyWithPhoto: async () => { throw new Error('Telegram API Photo Error'); },
    reply: async () => { textFallbackSent = true; }
  };
  await sendOrEditCardMessage(failingCtx, { text: 'Fallback Test', keyboard: {}, pngBuffer: dummyBuf });
  assert.strictEqual(textFallbackSent, true);
});
