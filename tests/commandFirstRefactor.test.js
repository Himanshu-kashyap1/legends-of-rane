import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { renderMainMenu } from '../src/telegram/views/mainMenuView.js';
import { renderHelpView } from '../src/telegram/views/helpView.js';
import { renderExploreMenu, renderZoneView, renderNodeDetailView } from '../src/telegram/views/gatheringView.js';
import { renderCraftingCategories, renderCategoryRecipes, renderRecipeDetails } from '../src/telegram/views/craftingView.js';
import { renderMarketHub, renderMarketCategories, renderListingDetails } from '../src/telegram/views/marketView.js';
import { renderPetsHub, renderMyPetsList, renderPetDetails } from '../src/telegram/views/petsView.js';
import { renderQuestHub, renderCategoryQuests, renderQuestDetails } from '../src/telegram/views/questView.js';
import { renderEquippedTools } from '../src/telegram/views/toolsView.js';
import { renderProfile } from '../src/telegram/views/profileView.js';
import { callbackRouter } from '../src/telegram/buttons/callbackRouter.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await disconnectDatabase();
});

test('1. Main Menu is clean and premium RPG-style (6 direct navigation buttons)', () => {
  const user = {
    telegramId: '12345',
    username: 'tester',
    level: 5,
    coins: 1000,
    title: 'Novice Adventurer',
    energy: { current: 100, max: 100 }
  };

  const { text, keyboard } = renderMainMenu(user);
  assert.ok(text.includes('Hero:'));
  assert.ok(text.includes('Level:'));
  assert.ok(text.includes('Coins:'));
  assert.ok(text.includes('Energy:'));
  assert.ok(text.includes('/help'));

  // 6 buttons in 3 rows
  const rows = keyboard.reply_markup.inline_keyboard;
  assert.strictEqual(rows.length, 3);
  const buttonCount = rows.flat().length;
  assert.strictEqual(buttonCount, 6);
});

test('2. Help View renders comprehensive command guide with natural English + Hinglish', () => {
  const user = { telegramId: '12345' };
  const { text, keyboard } = renderHelpView(user);

  assert.ok(text.includes('COMMAND GUIDE'));
  assert.ok(text.includes('/explore'));
  assert.ok(text.includes('/craft'));
  assert.ok(text.includes('/tools repair'));
  assert.ok(text.includes('/pets equip'));
  assert.ok(text.includes('/market'));
  assert.ok(text.includes('/boss'));

  const buttonCount = keyboard.reply_markup.inline_keyboard.flat().length;
  assert.ok(buttonCount <= 2);
});

test('3. Exploration, Workshop, Marketplace, Pets, Quests have compact layouts and <= 6 buttons', async () => {
  const user = {
    telegramId: '12345',
    coins: 500,
    level: 3,
    tools: [{ toolId: 'tool_axe_wood', instanceId: 'axe1', tier: 1, durability: 20, maxDurability: 30, equipped: true }],
    skills: { crafting: { level: 2 } },
    pets: [{ petId: 'pet_timber_wolf', happiness: 80 }],
    quests: []
  };

  // 1. Explore Menu
  const exp = renderExploreMenu(user);
  assert.ok(exp.keyboard.reply_markup.inline_keyboard.flat().length <= 4);

  // 2. Zone View
  const zone = renderZoneView(user, 'zone_forest');
  assert.ok(zone.keyboard.reply_markup.inline_keyboard.flat().length <= 4);

  // 3. Crafting Categories
  const crCat = renderCraftingCategories(user);
  assert.ok(crCat.keyboard.reply_markup.inline_keyboard.flat().length <= 5);

  // 4. Market Hub
  const mkt = renderMarketHub(user);
  assert.ok(mkt.keyboard.reply_markup.inline_keyboard.flat().length <= 4);

  // 5. Pets Hub
  const pets = renderPetsHub(user);
  assert.ok(pets.keyboard.reply_markup.inline_keyboard.flat().length <= 3);

  // 6. Quest Hub
  const quests = renderQuestHub(user);
  assert.ok(quests.keyboard.reply_markup.inline_keyboard.flat().length <= 3);

  // 7. Profile
  const prof = renderProfile(user);
  assert.ok(prof.keyboard.reply_markup.inline_keyboard.flat().length <= 2);
});

test('4. Stale/Unknown callback gracefully responds with helpful Hindi/English message', async () => {
  let alertMsg = '';
  let isAlert = false;

  const ctx = {
    callbackQuery: { data: 'unknown_old_action_123:0' },
    state: {
      callback: { action: 'unknown_old_action_123', ownerId: '0' }
    },
    answerCbQuery: async (msg, opts) => {
      alertMsg = msg;
      isAlert = opts?.show_alert;
    }
  };

  await callbackRouter(ctx, async () => {});

  assert.ok(alertMsg.includes('Ye menu purana ho gaya hai'));
  assert.strictEqual(isAlert, true);
});
