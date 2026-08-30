# 🌲 Legends of Rane — Gathering Engine & Energy System

## 1. System Overview & Architecture
The Gathering Engine is the core resource extraction system for Legends of Rane. It is structured as a pure, headless game engine isolated from Telegram transport and presentation logic.

```
                   Telegram User Interaction
             (/explore, /gather, or inline buttons)
                              │
                              ▼
                [Step 3 Middleware Pipeline]
         (ErrorBoundary → UserLoader → ActionLock → OwnershipGuard)
                              │
                              ▼
                      Telegram Router
                (explore.js / callbackRouter.js)
                              │
                              ▼
                 Gathering Engine Execution
             (src/engine/gathering/gatheringEngine.js)
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
         [Energy Check]  [Tool Check]  [Loot RNG & Crit]
               └──────────────┬──────────────┘
                              │
                              ▼
                 Atomic State Mutation (Mongoose)
          - Energy deduction & timestamp update
          - Tool durability wear (-1)
          - Inventory stack addition
          - Skill XP increment
                              │
                              ▼
                    Telegram View Render
                (src/telegram/views/gatheringView.js)
```

---

## 2. Gathering Zones & Resource Nodes

### 🌲 Zone 1: Lumberjack Forest (`zone_forest`)
* **Node ID**: `node_forest_oak`
* **Skill Trained**: Woodcutting
* **Tool Requirement**: Axe (Tier 1+ Wooden Axe)
* **Energy Cost**: 5 Energy
* **XP Awarded**: +10 Woodcutting XP
* **Drop Table**:
  * `wood_oak` (Weight: 70, Min: 2, Max: 5)
  * `wood_willow` (Weight: 25, Min: 1, Max: 3)
  * `wood_ancient` (Weight: 5, Min: 1, Max: 2)

### ⛏️ Zone 2: Stone Quarry (`zone_quarry`)
* **Node ID**: `node_quarry_granite`
* **Skill Trained**: Mining
* **Tool Requirement**: Pickaxe (Tier 1+ Wooden Pickaxe)
* **Energy Cost**: 5 Energy
* **XP Awarded**: +10 Mining XP
* **Drop Table**:
  * `stone_granite` (Weight: 65, Min: 2, Max: 5)
  * `stone_marble` (Weight: 25, Min: 1, Max: 3)
  * `coal` (Weight: 10, Min: 1, Max: 2)

### 💎 Zone 3: Deep Mines (`zone_mines`)
* **Node ID**: `node_mine_iron`
* **Skill Trained**: Mining
* **Tool Requirement**: Pickaxe (Tier 2+ Stone/Iron Pickaxe)
* **Energy Cost**: 8 Energy
* **XP Awarded**: +25 Mining XP
* **Drop Table**:
  * `iron_ore` (Weight: 50, Min: 1, Max: 4)
  * `coal` (Weight: 30, Min: 2, Max: 4)
  * `gold_ore` (Weight: 15, Min: 1, Max: 2)
  * `gem_vein` (Weight: 5, Min: 1, Max: 1)

---

## 3. Energy System & Real-Time Regeneration
* **Default Maximum Energy**: 100
* **Regeneration Rate**: 1 Energy point per 60 seconds (1 minute).
* **On-Demand Calculation**: Rather than running resource-heavy background timers across all database records, energy is computed on-demand from the elapsed interval since `lastRegen`:
  $$\text{elapsedMinutes} = \lfloor (\text{now} - \text{lastRegen}) / 60000 \rfloor$$
  $$\text{currentEnergy} = \min(\text{maxEnergy}, \text{storedEnergy} + \text{elapsedMinutes} \times \text{regenRate})$$
* **Capping**: Energy strictly caps at `maxEnergy` and never exceeds the maximum or dips below 0.
* **Insufficient Energy**: If `currentEnergy < energyCost`, gathering is halted immediately. Durability is NOT reduced and no items/XP are granted.

---

## 4. Tool Durability & Tier Requirements
* **Durability Loss**: Each valid gathering strike consumes exactly **1 durability point**.
* **Integrity Protection**:
  * If a gathering attempt fails (e.g. out of energy, wrong tool, invalid zone), tool durability is **not consumed**.
  * When durability reaches 0, the tool becomes broken and gathering is blocked (`TOOL_BROKEN`).
  * Durability is clamped at `min: 0` at both schema and engine levels.
* **Tier Gating**: Deep Mines requires Tier 2 (Stone) or higher. Attempting to enter with a Tier 1 (Wooden) Pickaxe returns `TOOL_REQUIREMENT_NOT_MET`.

---

## 5. Loot RNG & Bounded Gaussian Distribution
* **Weighted Drop Selection**:
  * Computes total table weight $W = \sum w_i$.
  * Generates random float $[0, W)$ and maps into cumulative weight slices.
* **Gaussian Approximation for Quantity**:
  * Uses a 3-sample average (Central Limit Theorem approximation) to produce a natural bell curve:
    $$\text{normalApprox} = \frac{\text{rnd}_1 + \text{rnd}_2 + \text{rnd}_3}{3}$$
    $$\text{quantity} = \text{round}(\min + \text{normalApprox} \times (\max - \min))$$
  * Clamped strictly between $\min$ and $\max$. Guarantees positive integer output with zero possibility of NaN, Infinity, or negative values.
* **Critical Harvest**:
  * Base chance: **10%** (`CRITICAL_CONFIG.BASE_CHANCE = 0.10`).
  * On trigger: Yield is **doubled ($2\times$)**.
  * Critical strikes do NOT double energy cost or tool wear.

---

## 6. Atomic State Mutation & Concurrency Guards
* **Single Logical Transaction**: The state mutation modifies `energy`, `tools`, `inventory`, `skills`, and `statistics` in a single synchronized atomic write via Mongoose `user.save()`.
* **Action Locking (`ActionLock` Middleware)**: Per-user concurrency lock prevents double-click race conditions and inventory duplication from rapid button taps.
* **Group Ownership Guard**: All `/explore` and `/gather` buttons encode `ownerId`, preventing third-party players in group chats from manipulating another adventurer's gathering session.

---

## 7. Structured Engine Responses & Failure Codes
* **Success Output**:
  ```json
  {
    "success": true,
    "zoneId": "zone_forest",
    "zoneName": "Lumberjack Forest",
    "reward": { "itemId": "wood_oak", "quantity": 4 },
    "isCritical": false,
    "xpGained": 10,
    "skill": "woodcutting",
    "energySpent": 5,
    "remainingEnergy": 95,
    "maxEnergy": 100,
    "tool": { "toolId": "tool_axe_wood", "durability": 29, "maxDurability": 30 }
  }
  ```
* **Failure Reasons**:
  * `INSUFFICIENT_ENERGY`
  * `MISSING_TOOL`
  * `TOOL_REQUIREMENT_NOT_MET`
  * `TOOL_BROKEN`
  * `INVALID_ZONE`
  * `INVALID_LOOT_TABLE`
