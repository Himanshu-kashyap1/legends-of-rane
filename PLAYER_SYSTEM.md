# 🛡️ Legends of Rane — Player Core System & UI Architecture

## 1. Overview & Data Flow
The Player Core system implements the primary user-facing screens for Legends of Rane:
* **`/start`** — Realm entrance, character overview, and main menu navigation.
* **`/profile`** — Full character stats, level progress, coins, energy pool, and 5 mastery skill bars.
* **`/inventory` & `/backpack`** — Paginated resource backpack and durability-tracked unique tool instances.

```
                    Telegram Command / Callback Query
                                  │
                                  ▼
                     [Step 3 Middleware Chain]
              (ErrorBoundary → UserLoader → OwnershipGuard)
                                  │
                                  ▼
                          Command / Router
            (/start, /profile, /inventory, nav_profile, nav_inventory)
                                  │
                                  ▼
                         Services & Engines
          (profileService, inventoryService, progressionEngine)
                                  │
                                  ▼
                            Views & Formatters
        (mainMenuView, profileView, inventoryView, formatProgressBar)
                                  │
                                  ▼
                         Telegram Reply / Edit
```

---

## 2. Decoupled Service Architecture

### 2.1 Progression Engine (`src/engine/progression/progressionEngine.js`)
* **Player Level XP Formula**: $\text{XP Required}(L) = \lfloor 100 \times L^{1.5} \rfloor$
  * Level 1 $\to$ 2: 100 XP
  * Level 2 $\to$ 3: 282 XP
  * Level 3 $\to$ 4: 519 XP
* **Skill Mastery XP Formula**: $\text{Skill XP Required}(L) = \lfloor 60 \times L^{1.4} \rfloor$
* **Clamped Progress**: Guarantees $0\% \le \text{Progress} \le 100\%$, protecting against negative XP, zero divisor, NaN, and Infinity.

### 2.2 Profile Service (`src/services/profileService.js`)
* Transforms raw `ctx.state.user` into a structured, presentation-ready object.
* Calculates progress for all 5 core masteries:
  1. 🌲 **Woodcutting**
  2. ⛏️ **Mining**
  3. ⚒️ **Crafting**
  4. 🎣 **Fishing**
  5. 🧭 **Exploration**

### 2.3 Inventory Service (`src/services/inventoryService.js`)
* Resolves item names and emojis against the MongoDB `Item` catalog.
* **Separation of Concerns**:
  * **Stackable Resources**: Filtered for `quantity > 0` and aggregated.
  * **Unique Tools**: Preserves independent `instanceId`, `durability`, `maxDurability`, `durabilityPercent`, and `[EQUIPPED]` status.
* **Pagination**: Automatically paginates stackables (6 items/page) and computes `totalPages`, `hasPrevPage`, `hasNextPage`.

---

## 3. UI Formatters & Navigation Views

### 3.1 Progress Bar Formatter (`src/telegram/views/uiHelpers.js`)
* Generates clean Unicode progress bars:
  `██████░░░░ 60%`
* Clamps safely and ensures consistent width across all Telegram mobile and desktop clients.

### 3.2 Main Menu (`src/telegram/views/mainMenuView.js`)
* Displays player name, title, level, coins, energy, and a clean 2-column inline keyboard:
  * `👤 Profile` | `🎒 Inventory`
  * `🌲 Explore` | `⚒️ Workshop`
  * `🛠 Tools` | `📜 Quests`
  * `🐾 Pets` | `🏪 Market`
  * `🏆 Leaderboard` | `🌙 Offline`
  * `🏰 3D Voxel Base` (WebApp URL)
  * `❓ Help`
* Unimplemented features trigger informative temporary alerts without executing fake gameplay.

### 3.3 Profile View (`src/telegram/views/profileView.js`)
* Displays treasury, energy pool, character level bar, and detailed mastery progress bars.
* Includes quick navigation to `🎒 View Inventory` and `⬅️ Back to Main Menu`.

### 3.4 Inventory View (`src/telegram/views/inventoryView.js`)
* Displays total item counts, categorized resources, and tool durability meters.
* Renders pagination buttons (`◀️ Prev`, `📄 Page X/Y`, `Next ▶️`) when total items exceed page size.
* Includes quick navigation to `👤 View Profile` and `⬅️ Back to Main Menu`.

---

## 4. Security & Immutability Guarantees
1. **Strict Read-Only Operations**: Viewing `/start`, `/profile`, `/inventory`, or navigating pages does NOT alter coins, XP, inventory quantities, tool durability, or skill levels.
2. **Authoritative Server Data**: All displayed stats are calculated directly from MongoDB documents in `ctx.state.user`. No client-supplied or callback-supplied values are trusted.
3. **Anti-Hijacking in Group Chats**: All inline buttons encode the player's `ownerId`. `ownershipGuardMiddleware` stops third-party users from navigating or manipulating another adventurer's menus.
4. **No Identity Leaks**: MongoDB ObjectIds (`_id`) and internal Telegram chat tokens are never rendered in message text.
