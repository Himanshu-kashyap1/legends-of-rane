# 👑 Legends of Rane — Progression, Levels, Titles & Skill Mastery

## 1. System Overview & Architecture
The Progression System governs player level advancement, skill mastery progression, and prestigious title unlocks. All XP additions and level calculations pass through a single centralized mathematical engine, preventing formula divergence and ensuring fair gameplay.

```
       Gameplay XP Sources (Gathering / Crafting / Quests / Bounties)
                                │
                                ▼
         [Authoritative APIs: addPlayerXp & addSkillXp]
            (src/engine/progression/progressionEngine.js)
                                │
                                ▼
         [Multi-Level-Up Evaluation & XP Carryover Loop]
       - Player Level Curve: floor(100 * Level^1.5)
       - Skill Mastery Curve: floor(60 * Level^1.4)
       - Level-up bonuses (+coins, full energy pool refill)
                                │
                                ▼
           [Title Unlock Engine: checkEligibleTitles]
            (src/engine/progression/titleConfig.js)
       - Unlocks titles based on skill/level thresholds
       - Updates user.unlockedTitles & active title badge
                                │
                                ▼
                   [/profile Telegram View]
```

---

## 2. Mathematical XP Curves

### 1. Player Level XP Curve
$$\text{Required XP} = \lfloor 100 \times \text{Level}^{1.5} \rfloor$$

* **Level 1 $\to$ 2**: `100 XP`
* **Level 2 $\to$ 3**: `282 XP`
* **Level 3 $\to$ 4**: `519 XP`
* **Level 4 $\to$ 5**: `800 XP`
* **Level 5 $\to$ 6**: `1,118 XP`

### 2. Skill Mastery Curve
$$\text{Required Skill XP} = \lfloor 60 \times \text{SkillLevel}^{1.4} \rfloor$$

* **Level 1 $\to$ 2**: `60 XP`
* **Level 2 $\to$ 3**: `158 XP`
* **Level 3 $\to$ 4**: `279 XP`
* **Level 4 $\to$ 5**: `416 XP`

---

## 3. Independent Skill Masteries

Every adventurer masters 5 distinct disciplines:
1. 🪓 **Woodcutting**: Leveled by harvesting trees and timber groves in Lumberjack Forest.
2. ⛏️ **Mining**: Leveled by extracting stones, coals, and ore veins in Stone Quarry and Deep Mines.
3. ⚒️ **Crafting**: Leveled by refining raw wood, smelting ingots, and forging tools.
4. 🎣 **Fishing**: Leveled by fishing expeditions and river harvests.
5. 🧭 **Exploration**: Leveled by discovering new biomes, zones, and dungeon depths.

---

## 4. Prestigious Titles Catalog

Centralized in `src/engine/progression/titleConfig.js`:

| Title | Emoji | Category | Unlock Requirement | Description |
|---|---|---|---|---|
| **Novice Adventurer** | 🌱 | General | Player Level 1 | Newly arrived wanderer in the realm of Rane. |
| **Timber Initiate** | 🪓 | Woodcutting | Woodcutting Lv 3 | Aspiring woodcutter learning ancient grains. |
| **Forest Lumberjack** | 🌲 | Woodcutting | Woodcutting Lv 10 | Seasoned master of deep woodlands. |
| **Quarry Excavator** | ⛏️ | Mining | Mining Lv 3 | Sturdy digger cracking granite slabs. |
| **Deep Earth Delver** | 💎 | Mining | Mining Lv 10 | Intrepid miner unearthing gems and gold. |
| **Apprentice Crafter** | 🔨 | Crafting | Crafting Lv 3 | Diligent builder crafting foundational tools. |
| **Grand Arch-Smith** | ⚒️ | Crafting | Crafting Lv 10 | Legendary smith shaping diamond gear. |
| **Angler of Rane** | 🎣 | Fishing | Fishing Lv 3 | Patient fisher casting lines in tranquil rivers. |
| **Master of the Tides** | 🌊 | Fishing | Fishing Lv 10 | Master angler commanding ocean waters. |
| **Realm Voyager** | 🧭 | Exploration | Exploration Lv 5 | Fearless explorer charting unseen lands. |
| **Lord of Rane** | 👑 | Realm Prestige | Player Level 20 | Legendary hero governing the realm. |

---

## 5. Telegram Profile View (`/profile`)
Compact 2-button per row layout displaying active title, player level progress, energy, treasury, and all 5 skill masteries:

```
👤 CHARACTER PROFILE 👤
━━━━━━━━━━━━━━━━━━━━━━
⚔️ Hero: @adventurer
🎖️ Title: 👑 Grand Arch-Smith
⭐ Player Level: Level 12
📈 Level Progress: [██████░░░░] 60% (2,450/4,156 XP)

🪙 Treasury: 15,420 Coins
⚡ Energy: 100 / 100
━━━━━━━━━━━━━━━━━━━━━━
🔮 SKILL MASTERIES
━━━━━━━━━━━━━━━━━━━━━━
🌲 Woodcutting (Lv 8): [████████░░ 80%] (1,200/1,500 XP)
⛏️ Mining (Lv 6): [████░░░░░░ 40%] (400/1,000 XP)
⚒️ Crafting (Lv 10): [██████████ 100%] (0/2,500 XP)
🎣 Fishing (Lv 3): [██░░░░░░░░ 20%] (50/250 XP)
🧭 Exploration (Lv 5): [██████░░░░ 60%] (300/500 XP)

🏆 Unlocked Titles: 5 titles unlocked
```
