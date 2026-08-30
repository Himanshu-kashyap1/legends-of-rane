# Post Planning Analysis: 3D Monster Hunting World

## 1. Questions Asked & Alignment
- **Architecture**: Expand existing 3D Mini App without deleting the player's saved voxel base.
- **Biomes**: 5 distinct hunting biomes (Whispering Forest, Ironfang Quarry, Crystal Caverns, Ashen Volcano, Ancient Ruins) with 15 unique fantasy monsters.
- **Performance**: Use `ChunkManager` and `THREE.InstancedMesh` to smoothly support 10,000+ blocks on mobile.
- **Economy**: Server-authoritative loot & weapon crafting directly using MongoDB Telegram inventory materials (Wood, Stone, Iron, Gold, Diamond).

## 2. User Decisions
- **Full Energy in 3D**: Combat, movement, and hunting are unrestricted without energy timers.
- **Mobile-First UX**: Virtual touch joystick, glowing action buttons (Attack, Target Lock, Sprint), and in-game Equipment Drawer.
- **Security**: Anti-cheat session nonces and time-to-kill validation on backend.

## 3. Assumptions Made
- Existing voxel base coordinates remain centered around the Sanctuary ($X: -16 \dots 16, Z: -16 \dots 16$).
- Biomes occupy surrounding coordinates extending out to $X, Z \in [-80, 80]$.
- Equipment crafted inside the 3D Mini App modifies the player's tools and inventory in MongoDB.

## 4. Permissions
- Create new backend engine modules in `src/engine/hunting/`.
- Create new Express routing in `src/server/routes/huntingRoutes.js`.
- Update Mini App frontend in `public/webapp/` (`index.html`, `style.css`, `app.js`).
- Add comprehensive test suites in `tests/`.

## 5. Out of Scope
- Modifying core Telegram bot commands unless explicitly needed for 3D world launch.
- Creating a duplicate secondary economy that bypasses MongoDB.

## 6. Execution Roadmap
1. `src/engine/hunting/huntingConfig.js` — Biomes, 15 monster archetypes, drop tables, weapon tiers.
2. `src/engine/hunting/huntingEngine.js` — Combat verification, session nonces, loot distribution, gear crafting.
3. `src/server/routes/huntingRoutes.js` — Express APIs for world state, combat sessions, kill claims, and crafting.
4. `src/server/app.js` — Mount `/api/hunting` router.
5. `public/webapp/index.html` & `public/webapp/style.css` — Mobile joystick, action buttons, combat HUD, and gear drawer.
6. `public/webapp/app.js` — 10,000+ block `ChunkManager`, 3D player, 15 monsters with AI, combat system, audio & particles.
7. `tests/huntingEngine.test.js` & `tests/huntingRoutes.test.js` — Automated unit and integration testing.
8. Full regression verification (`npm test`), Git commit, and deployment push.

## 7. Approval Timestamp
- **Date & Time**: 2026-08-30T13:12:35+05:30
