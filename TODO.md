# 📋 Legends of Rane — Development Roadmap (TODO)

## ✅ STEP 1 — Project Audit & Foundation (COMPLETED)
- [x] Full repository audit and dependency inspection
- [x] Package initialization with ES Modules (`type: "module"`)
- [x] Environment configuration validation with credential masking (`src/config/env.js`)
- [x] Leveled structured logger with token/URI sanitation (`src/utils/logger.js`)
- [x] Custom error hierarchy (`src/utils/errors.js`)
- [x] Robust MongoDB connection pool, reconnect handler, and health checks (`src/database/connection.js`)
- [x] Standalone DB verification script `npm run test:db` (`src/database/testConnection.js`)
- [x] Express HTTP server setup with `/health` and Mini App static hosting (`src/server/app.js`)
- [x] Telegraf bot setup and error catching boundary (`src/telegram/bot.js`)
- [x] Application entrypoint with graceful shutdown handling (`src/index.js`)
- [x] Scaffolding for `src/engine/`, `src/models/`, `src/services/`, `src/telegram/`, `public/webapp/`
- [x] Unit test suite (`npm test`) with 100% pass rate
- [x] Architectural documentation (`ARCHITECTURE.md`) and project roadmap (`TODO.md`)

---

## ✅ STEP 2 — Database Models & Data Catalogs (COMPLETED)
- [x] Implement Mongoose schemas in `src/models/`:
  - [x] `User.js` (telegramId, stats, coins, energy, skills, inventory, equippedTools, unique tool instances, activePet, gifting, offline, statistics)
  - [x] `Base.js` (telegramId, baseLevel, gridSize, blocks, structures)
  - [x] `Item.js` (itemId, displayName, emoji, category, tier, rarity, stackable, basePrice, toolMetadata)
  - [x] `Recipe.js` (recipeId, outputItemId, requiredMaterials, requiredSkill, requiredLevel, xpReward)
  - [x] `Quest.js` (questId, title, category, requirements, rewards)
  - [x] `Pet.js` (petId, name, emoji, perkType, perkValue, rarity, priceCoins)
  - [x] `ResourceNode.js` (nodeId, name, zone, skill, requiredToolType, toolTier, energyCost, dropTable)
  - [x] `MarketOrder.js` (orderId, sellerId, itemId, quantity, pricePerUnit, totalPrice, status, escrowHeld)
  - [x] `BossRaid.js` (bossInstanceId, chatId, currentHp, maxHp, status, participants damage ledger)
  - [x] `GiftRecord.js` (giftId, senderId, recipientId, itemId, quantity, sentAt)
- [x] Implement idempotent catalog seeder `src/database/seedData.js` (`npm run seed`) with 20 items, 6 recipes, 3 resource nodes, 4 pets, and 2 quests
- [x] Model validation test suite in `tests/models.test.js` (100% pass rate)

---

## ✅ STEP 16 — 3D Voxel Mini App — Three.js Base Builder (COMPLETED)
- [x] Three.js WebGL 3D Voxel scene in `public/webapp/app.js` with OrbitControls, zoom, pan, and camera centering
- [x] Snap-to-grid raycasting placement and block destruction modes
- [x] Selection highlight wireframe box (`highlightBox`)
- [x] 28+ Centralized Voxel Block Catalog across 5 categories in `src/engine/voxel/blockConfig.js`
- [x] 9-Slot Hotbar with keyboard shortcuts (1–9) and expandable full categorized block palette modal
- [x] Time-of-day lighting cycles (Day / Twilight / Night) with ambient, directional, and emissive block glows (lanterns, crystals, lava)
- [x] Procedural Web Audio SFX (click, place, destroy) with fallback
- [x] Telegram WebApp Haptic feedback integration
- [x] MongoDB Base Model in `src/models/Base.js` and Pure Voxel Base Engine in `src/engine/voxel/baseEngine.js`
- [x] Express REST APIs in `src/server/routes/baseRoutes.js` (`/api/base/blocks`, `/api/base/load`, `/api/base/save`, `/api/base/place`, `/api/base/destroy`, `/api/base/clear`)
- [x] Commands `/base` and `/build` with compact Telegram launch card in `src/telegram/commands/base.js`
- [x] Main menu navigation integration (`nav_base`)
- [x] Automated test suite with 130 passing tests across 13 test files (`tests/miniApp.test.js`, `tests/cardRenderer.test.js`, `tests/bossEngine.test.js`, `tests/offlineEngine.test.js`, `tests/progressionEngine.test.js`, `tests/petEngine.test.js`, `tests/questEngine.test.js`, `tests/giftingEngine.test.js`, `tests/marketEngine.test.js`, `tests/craftingEngine.test.js`, `tests/toolWorkshop.test.js`, `tests/gatheringEngine.test.js`, `tests/playerCore.test.js`, `tests/telegram.test.js`, `tests/models.test.js`)
- [x] Documentation in `MINI_APP_SYSTEM.md`

---

## ✅ STEP 4 — Player Core: /start + Profile + Inventory (COMPLETED)
- [x] Progression math formulas in `src/engine/progression/progressionEngine.js` ($\text{XP} = \lfloor 100 \times L^{1.5} \rfloor$)
- [x] UI Helpers and Progress Bar formatter in `src/telegram/views/uiHelpers.js`
- [x] Decoupled Profile Service in `src/services/profileService.js` (5 masteries: Woodcutting, Mining, Crafting, Fishing, Exploration)
- [x] Decoupled Inventory Service in `src/services/inventoryService.js` (Catalog mapping, unique tool instances, pagination)
- [x] Interactive Views:
  - [x] `src/telegram/views/mainMenuView.js` (Full interactive inline keyboard with ownership)
  - [x] `src/telegram/views/profileView.js` (Stats, level bar, mastery skill meters, back navigation)
  - [x] `src/telegram/views/inventoryView.js` (Stackable resources, durability meters, pagination)
- [x] Telegram Commands:
  - [x] `/start` (`src/telegram/commands/start.js`)
  - [x] `/profile` (`src/telegram/commands/profile.js`)
  - [x] `/inventory` and `/backpack` alias (`src/telegram/commands/inventory.js`)
- [x] Callback routing for `nav_main`, `nav_profile`, `nav_inventory`, `coming_soon` in `src/telegram/buttons/callbackRouter.js`
- [x] Automated test suite with 36 passing tests (`tests/playerCore.test.js`, `tests/telegram.test.js`, `tests/models.test.js`)
- [x] Documentation in `PLAYER_SYSTEM.md`

---

## ⏳ STEP 5 — 3D Voxel Mini App (Three.js WebGL) & REST API
- [ ] Implement Express REST endpoints in `src/server/app.js`:
  - [ ] `GET /api/base`
  - [ ] `POST /api/base/block/place`
  - [ ] `POST /api/base/block/destroy`
  - [ ] `POST /api/base/clear`
- [ ] Implement Mini App client in `public/webapp/`:
  - [ ] Three.js WebGL scene, OrbitControls, 24x24 terrain grid
  - [ ] 28+ procedural block textures (canvas generated)
  - [ ] Raycasting for Place Mode (normal offset) and Break Mode
  - [ ] Dynamic point lights (Lanterns, Lava, Crystals) with subtle pulsation
  - [ ] Web Audio API procedural sound effects (place, break, UI click)
  - [ ] Telegram WebApp SDK integration & haptic feedback

---

## ⏳ STEP 6 — End-to-End Testing, Security Hardening & Polish
- [ ] Concurrency and race-condition stress tests
- [ ] Economy balance and inflation testing
- [ ] Telegram group chat integration tests
- [ ] Mobile WebApp responsive design and performance audit
