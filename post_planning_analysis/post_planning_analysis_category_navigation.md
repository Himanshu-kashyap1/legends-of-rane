# Post-Planning Analysis: Category Command Navigation System

## Questions Asked
- System design for category navigation and button clutter reduction.
- Clean separation of 4 main gameplay categories into standalone commands (`/gatheringharvest`, `/blacksmithequipment`, `/economytrading`, `/3dvoxelbasemultiplayer`).
- Clear 2-button navigation footer (`[⬅️ Back] [🏠 Home]`) on all category menus.

## User Decisions
- `/help` and `/guide` become a concise **Command Guide** listing the 4 commands.
- Typing any of the 4 category commands renders ONLY that category's interactive buttons (max 4 action buttons + Back & Home).
- Buttons must NEVER all be dumped into a single overwhelming menu.
- `⬅️ Back` returns to the Command Guide (`/help`).
- `🏠 Home` returns to the main menu (`/start`).

## Assumptions Made
- Existing sub-actions (`explore_zone`, `cr_menu`, `ws_repair_req`, `ws_upgrade_req`, `ws_tools`, `nav_market`, `mkt_help_sell`, `nav_gift_help`, `nav_base`) are already implemented and will be directly wired into the category button callbacks.
- All callback data remains strictly bounded ($\le 64$ bytes) using `encodeCallback({ action, ownerId, targetId })`.
- `ownershipGuardMiddleware` and `actionLockMiddleware` protect every callback.

## Permissions
- Files allowed to be modified:
  - `src/telegram/views/helpView.js`
  - `src/telegram/commands/categoryCommands.js` (NEW)
  - `src/telegram/commands/index.js`
  - `src/telegram/commands/help.js`
  - `src/telegram/buttons/callbackRouter.js`
  - `tests/categoryNavigation.test.js` (NEW)

## Out of Scope
- Modifying underlying gathering RNG, crafting recipes, tool repair costs, or 3D voxel base logic.
- Breaking existing individual command handlers (`/chop`, `/mine`, `/craft`, `/tools`, `/market`, `/sell`, `/gift`, `/base`, `/boss`).

## Execution Roadmap
1. **Views**: Update `src/telegram/views/helpView.js` to render the clean Command Guide and the 4 dedicated category button menus.
2. **Commands**: Create `src/telegram/commands/categoryCommands.js` and register `/gatheringharvest`, `/blacksmithequipment`, `/economytrading`, `/3dvoxelbasemultiplayer` in `src/telegram/commands/index.js`.
3. **Callbacks**: Wire category navigation callbacks (`cat_gathering`, `cat_blacksmith`, `cat_economy`, `cat_base`) in `callbackRouter.js`.
4. **Verification**: Add automated unit and integration tests in `tests/categoryNavigation.test.js` and run `npm test`.

## Approval Timestamp
- **Date & Time:** 2026-08-30T15:10:00+05:30
