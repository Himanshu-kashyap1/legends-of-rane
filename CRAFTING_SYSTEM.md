# 🔨 Legends of Rane — Crafting Engine & Blueprint Recipe System

## 1. System Overview & Architecture
The Crafting Engine is the manufacturing backbone of Legends of Rane. It enables players to refine raw lumber and ores into construction planks and ingots, forge tools & equipment, brew energy potions, and build voxel base structures.

```
                  Telegram User Interaction
                (/craft, /workshop, or buttons)
                              │
                              ▼
                [Step 3 Middleware Pipeline]
         (ErrorBoundary → UserLoader → ActionLock → OwnershipGuard)
                              │
                              ▼
                       Callback Router
                              │
                              ▼
                       Crafting Engine
              (src/engine/economy/craftingEngine.js)
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
       [Skill Level Check] [Coin Check] [Materials Check]
               └──────────────┬──────────────┘
                              │
                              ▼
                 Atomic MongoDB Mutation (user.save())
          - Deduct input materials from inventory
          - Deduct coin cost from player treasury
          - Add crafted item stack OR create unique ToolInstance
          - Award Crafting Skill XP
          - Increment player statistics
                              │
                              ▼
                     Telegram View Render
               (src/telegram/views/craftingView.js)
```

---

## 2. Recipe Categories & Centralized Catalog

### 🪵 1. Refined Materials (`refining`)
* **`recipe_plank_oak`**: 2 Oak Wood $\to$ **2 Oak Planks** (0c, Crafting Lv 1, +10 XP)
* **`recipe_stone_brick`**: 3 Granite Stone $\to$ **2 Stone Bricks** (0c, Crafting Lv 1, +10 XP)
* **`recipe_ingot_iron`**: 2 Iron Ore + 1 Coal $\to$ **1 Iron Ingot** (5c, Crafting Lv 2, +25 XP)
* **`recipe_ingot_gold`**: 2 Gold Ore + 2 Coal $\to$ **1 Gold Ingot** (15c, Crafting Lv 3, +50 XP)
* **`recipe_diamond_cut`**: 2 Raw Gems $\to$ **1 Cut Diamond** (50c, Crafting Lv 4, +100 XP)

### 🛠️ 2. Tools & Equipment (`tools`)
* **`recipe_axe_stone`**: 3 Granite + 2 Oak Planks $\to$ **1 Stone Axe** (25c, Crafting Lv 1, +30 XP, 60 Durability)
* **`recipe_pickaxe_stone`**: 3 Granite + 2 Oak Planks $\to$ **1 Stone Pickaxe** (25c, Crafting Lv 1, +30 XP, 60 Durability)
* **`recipe_rod_wood`**: 2 Oak Planks + 2 Willow Wood $\to$ **1 Wooden Fishing Rod** (20c, Crafting Lv 1, +25 XP, 40 Durability)
* **`recipe_axe_iron`**: 3 Iron Ingot + 2 Oak Planks $\to$ **1 Iron Axe** (75c, Crafting Lv 2, +60 XP, 120 Durability)
* **`recipe_pickaxe_iron`**: 3 Iron Ingot + 2 Oak Planks $\to$ **1 Iron Pickaxe** (75c, Crafting Lv 2, +60 XP, 120 Durability)

### 🧪 3. Consumables (`consumables`)
* **`recipe_energy_brew`**: 2 Willow Wood + 1 Oak Wood $\to$ **1 Energy Brew** (+25 Energy, 10c, Crafting Lv 1, +15 XP)
* **`recipe_miners_snack`**: 2 Oak Planks + 1 Coal $\to$ **1 Miner's Rations** (+40 Energy, 20c, Crafting Lv 2, +30 XP)

### 🧱 4. Base Structures (`structures`)
* **`recipe_wooden_chest`**: 6 Oak Planks $\to$ **1 Wooden Storage Chest** (15c, Crafting Lv 1, +25 XP)
* **`recipe_stone_pillar`**: 4 Stone Bricks $\to$ **1 Stone Pillar** (10c, Crafting Lv 1, +20 XP)
* **`recipe_forge_lantern`**: 2 Iron Ingot + 1 Coal $\to$ **1 Forge Lantern** (25c, Crafting Lv 2, +40 XP)

---

## 3. Server-Side Validation & Security
Before modifying player state, the engine strictly verifies:
1. **Recipe Integrity**: Recipe ID must exist in `RECIPES` catalog.
2. **Skill Level Gating**: Player Crafting Mastery level must meet `minCraftingLevel`.
3. **Coin Balance**: Player must possess sufficient coins for `coinCost * quantity`.
4. **Material Inventory**: Exact input quantities are verified in `user.inventory`.

If any check fails, **zero materials or coins are consumed**, and a friendly error is returned.

---

## 4. Atomic Execution & Tool Creation
* **Stackable Items**: Increments existing stack in `user.inventory` or appends a new stack.
* **Tool Equipment**: Instantiates a unique `ToolInstance` with its own UUID `instanceId`, full `maxDurability`, and `equipped: false` status in `user.tools`.
* **Crafting XP**: Awards `xpReward * quantity` directly to `user.skills.crafting.xp`.
* **Atomic Save**: Modified properties are persisted in a single synchronized MongoDB write (`user.save()`).

---

## 5. Hierarchical Telegram UI & English + Hinglish Dialogue
Adheres strictly to the **2 buttons per row** layout:
```
/workshop (or /craft)
      ↓
[🔨 Craft Recipes]  [🛠 My Tools]
[🎒 View Inventory]  [⬅️ Main Menu]
      ↓ (Screen 1: Category Selection)
[🪵 Refined Materials] [🛠️ Tools & Gear]
[🧪 Consumables]       [🧱 Base Structures]
[⬅️ Workshop]          [🏠 Main Menu]
      ↓ (Screen 2: Category Recipe List)
[🪵 Oak Planks ✅]    [🔩 Iron Ingot 🔒]
[◀️ Prev]    [• 1/1 •]   [Next ▶️]
[⬅️ Categories]        [🏠 Main Menu]
      ↓ (Screen 3: Recipe Details & Checklist)
[✅ Craft Item]        [❌ Cancel]
[⬅️ Back to Category]  [🎒 Backpack]
[🏠 Main Menu]
      ↓ (Screen 4: Crafting Result & Loop)
[🔨 Craft Again]       [🎒 View Backpack]
[⬅️ Recipe List]       [🏠 Main Menu]
```

* **Natural English + Hinglish Dialogue**:
  * *"🔨 Recipe craft karne ke liye enough materials nahi hain. Please gather or refine ingredients first."*
  * *"⭐ Crafting Mastery Level kam hai! Required Level: 2, Current: 1."*
  * *"🎉 Congratulations! Crafted Iron Ingot x1 (+25 Crafting XP)!"*
