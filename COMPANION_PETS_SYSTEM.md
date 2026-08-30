# 🐾 Legends of Rane — Companion Pets System

## 1. System Overview & Architecture
The Companion Pets System introduces magical creatures and loyal beasts that adventurers can adopt, feed, and bond with. Active companion pets provide powerful passive perks that amplify gathering yields, grant skill XP boosts, discover rare gems, and boost offline earnings.

```
                    Player Action (/pets)
                              │
                              ▼
            [Step 3 Middleware & ActionLock]
                              │
                              ▼
                    Companion Pet Engine
             (src/engine/pets/petEngine.js)
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
        [Adopt Pet]      [Feed Pet]     [Equip Active]
               └──────────────┬──────────────┘
                              │
                              ▼
           [Server-Side Buff & Happiness Gate]
      - If Happiness >= 50% -> 100% Buff Active
      - If Happiness < 50%  -> Pet is Hungry (Buff Paused)
                              │
                              ▼
             [Gathering Engine Integration]
     - Timber Wolf   -> +15% Woodcutting XP
     - Crystal Mole  -> +5% Lucky Gem Discovery
     - River Otter   -> +20% Fishing Yield & Offline Boost
     - Solar Drake   -> +25% All Gathering Yield
```

---

## 2. Initial Companion Pet Catalog

| Pet | Emoji | Rarity | Price | Passive Perk | Description |
|---|---|---|---|---|---|
| **Timber Wolf** | 🐺 | Rare | 500c | `+15% Woodcutting XP` | Guides your strikes, boosting Woodcutting XP by +15%. |
| **Crystal Mole** | 🦡 | Rare | 500c | `+5% Lucky Gem Discovery` | Unearths bonus raw gemstone clusters while mining. |
| **River Otter** | 🦦 | Rare | 750c | `+20% Fishing Yield` | Catches surplus fish and enhances offline treasury progress. |
| **Solar Drake** | 🐲 | Legendary | 1500c | `+25% All Gathering Yield` | Radiates solar energy, boosting resource yields by +25% across all zones. |

---

## 3. Feeding & Happiness Mechanics
* **Happiness Meter**: Bounded between `0%` and `100%`.
* **Happiness Decay**: Active companion pets gradually lose `2%` happiness per gathering expedition.
* **Buff Threshold (50% Rule)**:
  * When happiness $\ge 50\%$: Companion is energized and provides its **full passive buff**.
  * When happiness $< 50\%$: Companion becomes **Hungry**, pausing the buff until fed.
* **Feeding**:
  * Costs `15 Coins`.
  * Instantly restores `+30%` happiness (clamped to max `100%`).
  * Already full pets (100%) cannot be fed to prevent accidental coin waste.

---

## 4. Commands & Interaction

### `/pets` (or `/pet`)
Opens the Companion Pet Sanctuary Hub:
* **`🐾 My Pets`**: View and manage owned companions, inspect happiness meters, and equip active pets.
* **`🛒 Adopt Pets`**: Browse the sanctuary catalog and unlock new magical beasts.

---

## 5. Hierarchical 2-Button per Row Telegram UI
```
/pets (or /pet)
      ↓
[🐾 My Pets]        [🛒 Adopt Pets]
[🎒 Backpack]       [🏠 Main Menu]
      ↓ (Screen 2: Owned Pets / Adoption List)
[🐺 Timber Wolf ⭐]  [🦡 Crystal Mole]
[◀️ Prev]      [• 1/1 •]    [Next ▶️]
[🛒 Adopt More]             [🏠 Main Menu]
      ↓ (Screen 3: Pet Inspection & Details)
[🍖 Feed (15c)]     [⭐ Set Active / 🛑 Unequip]
[⬅️ Back]           [🏠 Main Menu]
      ↓ (Screen 4: Outcome View)
[🐾 Manage Pets]    [🌲 Go Exploring]
[🏠 Main Menu]
```

* **Natural English + Hinglish Dialogue**:
  * *"🎉 COMPANION PET ADOPTED! 🐺 Timber Wolf is now your loyal companion! Active Perk: +15% Woodcutting XP."*
  * *"🍖 Fed Timber Wolf! Happiness restored to 100%. Active buffs have been restored!"*
  * *"⚠️ Pet hungry hai! Buff activate karne ke liye feed karein."*
