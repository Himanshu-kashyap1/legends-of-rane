# 🛠️ Legends of Rane — Tool Management & Blacksmith Workshop System

## 1. System Overview & Architecture
The Tool & Blacksmith Workshop system governs adventurer equipment, durability wear, restoration at the forge, and permanent tier progression across all five tiers.

```
                    Telegram Command / Callback
                     (/tools, /workshop, /craft)
                                │
                                ▼
                  [Step 3 Middleware Pipeline]
          (ErrorBoundary → UserLoader → ActionLock → OwnershipGuard)
                                │
                                ▼
                         Callback Router
                                │
                                ▼
                       Tool & Blacksmith Engine
                 (src/engine/economy/toolService.js)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
       [Tool Repair Logic]            [Tier Upgrade Forge]
        - Damaged validation           - Tier progression (1->5)
        - Material & Coin check        - Skill Level requirements
        - Durability restoration       - Restores max durability
                └───────────────┬───────────────┘
                                │
                                ▼
                     Atomic MongoDB Update
                - Deducts materials & coins
                - Updates tool state/modifiers
                - Awards Crafting Skill XP
                                │
                                ▼
                      Telegram View Render
                (src/telegram/views/workshopView.js)
```

---

## 2. Tool Tiers & Gathering Modifiers

| Tier | Name | Emoji | Max Durability | Yield Bonus | Critical Bonus | Energy Discount | Upgrade Prerequisites |
|---|---|---|---|---|---|---|---|
| **1** | **Wooden** | 🪵 | 30 | +0 | +0% | -0 Energy | Starter Tool |
| **2** | **Stone** | 🪨 | 60 | +1 | +5% | -0 Energy | 15 Granite Stone, 50 Coins, Crafting Lv 1 |
| **3** | **Iron** | 🔩 | 120 | +2 | +10% | -1 Energy | 10 Iron Ore, 150 Coins, Crafting Lv 2 |
| **4** | **Gold** | 🪙 | 80 | +3 | +20% | -1 Energy | 10 Gold Ore, 350 Coins, Crafting Lv 3 |
| **5** | **Diamond** | 💎 | 250 | +4 | +25% | -2 Energy | 5 Raw Gems, 1000 Coins, Crafting Lv 5 |

* **Diamond Cap**: Tier 5 (Diamond) is the **maximum tool tier** and cannot be upgraded further.

---

## 3. Durability Status & Broken Tool Rules
Durability strictly obeys $0 \le \text{durability} \le \text{maxDurability}$.

* **Durability Condition Levels**:
  * `90% – 100%`: ✅ **Excellent**
  * `50% – 89%`: 🟢 **Good**
  * `20% – 49%`: ⚠️ **Damaged**
  * `1% – 19%`: 🔴 **Critical**
  * `0%`: ❌ **Broken**
* **Broken Tool Safeguard**: When durability reaches `0`, the tool is marked Broken. All gathering actions requiring this tool fail immediately (`TOOL_BROKEN`). No energy is consumed, no items are awarded, and no XP is gained until repaired.

---

## 4. Repair System & Costs
* **Full Repair Mechanics**: Restores tool durability from its damaged state back to `100% (maxDurability)`.
* **Zero Waste Protection**: Tools already at `maxDurability` cannot be repaired or charged.
* **Repair Cost Matrix**:
  * **Wooden Tool (Tier 1)**: 3 Oak Wood, 5 Coins
  * **Stone Tool (Tier 2)**: 4 Granite Stone, 15 Coins
  * **Iron Tool (Tier 3)**: 4 Iron Ore, 35 Coins
  * **Gold Tool (Tier 4)**: 4 Gold Ore, 75 Coins
  * **Diamond Tool (Tier 5)**: 2 Raw Gems, 150 Coins

---

## 5. Upgrade System & Progression
* **Instant Max Durability Restoration**: When a tool is upgraded to a higher tier, its durability is automatically restored to the **new tier's full max durability** (e.g. 60 for Stone, 120 for Iron).
* **Crafting XP Rewards**: Upgrading awards `+25 * newTier` Crafting Mastery XP to the player.
* **Unique Instance Preservation**: The unique `instanceId` is preserved throughout upgrades, preventing tool duplication or loss.

---

## 6. Gathering Integration
Upgraded tool modifiers are dynamically read by the Step 5 Gathering Engine:
* **Yield Bonus**: Added directly to loot quantity ($\text{Quantity} = \text{BaseRNG} + \text{YieldBonus}$).
* **Critical Bonus**: Added to base critical chance ($\text{CritRate} = 10\% + \text{CritBonus}$).
* **Energy Discount**: Reduces zone energy cost ($\text{EffectiveEnergy} = \max(1, \text{BaseCost} - \text{Discount})$).

---

## 7. Hierarchical 2-Button per Row Telegram UI
Strictly adheres to the Telegram chat ergonomics and ownership rules:
```
/workshop (or /craft)
      ↓
[🛠 My Tools]      [🎒 View Inventory]
[⬅️ Main Menu]
      ↓
[🪓 Wooden Axe]   [⛏️ Wooden Pickaxe]
[⬅️ Back to Workshop] [🏠 Main Menu]
      ↓
[🔧 Repair Tool]   [⬆️ Upgrade Tier]
[⬅️ Back to Tools] [🏠 Main Menu]
      ↓
[✅ Confirm Repair / Upgrade]
[❌ Cancel]
      ↓
[🛠 Inspect Tool]   [🎒 View Backpack]
[⚒️ Workshop]      [🏠 Main Menu]
```

* **Natural English + Hinglish Dialogue**: Communicates status, requirements, and confirmation clearly (`"🔧 Tool repair ke liye enough materials nahi hain."`, `"✨ Congratulations! Tool successfully upgraded to Tier 2 (Stone)!"`).
* **Security & Concurrency**: All repair and upgrade requests are guarded by `actionLockMiddleware` (`ws_repair_do`, `ws_upgrade_do`) and validated against `ownershipGuardMiddleware`.
