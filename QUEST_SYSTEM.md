# 📜 Legends of Rane — Quest System (Story & Daily Bounties)

## 1. System Overview & Architecture
The Quest System guides player progression through sequential **Story Chronicles** and rewards active gameplay with rotating **Daily Bounties**. It uses an event-driven progress tracker integrated directly into the gathering, crafting, and marketplace engines.

```
            Gameplay Event (Gathering / Crafting / Trading)
                               │
                               ▼
               [Event Hook: trackQuestProgress]
              (src/engine/quests/questEngine.js)
                               │
                               ▼
          Check Active Quests in player profile (user.quests)
       - Matches requirement type (gather_item, craft_item)
       - Increments requirement progress counter
       - If all requirements met -> Marks status: 'completed'
                               │
                               ▼
              [Player Action: Claim Quest Reward]
                       (/quests or button)
                               │
                               ▼
                   [Atomic Reward Settlement]
       - Validates status === 'completed'
       - Sets status: 'claimed' (prevents double claims)
       - Credits coins, XP (calculates level ups), and items
       - Updates statistics.questsCompleted
```

---

## 2. Quest Categories & Definitions

### 📜 1. Story Quests (`story`)
Permanent linear storyline unlocking realm progression and rewards:
1. **`quest_story_first_steps`**: "First Steps into Rane"
   * *Requirement*: Harvest 10 Oak Wood (`wood_oak`, 10)
   * *Reward*: 50 Coins, 100 Player XP, 5x Oak Wood
2. **`quest_story_planks`**: "Master of Timber"
   * *Requirement*: Craft 4 Oak Planks (`plank_oak`, 4)
   * *Reward*: 80 Coins, 150 Player XP, 10x Granite Stone
3. **`quest_story_quarry`**: "Stone Age Excavator"
   * *Requirement*: Mine 15 Granite Stones (`stone_granite`, 15)
   * *Reward*: 120 Coins, 200 Player XP, 5x Coal
4. **`quest_story_smelter`**: "The Royal Smelter"
   * *Requirement*: Smelt 2 Iron Ingots (`ingot_iron`, 2)
   * *Reward*: 200 Coins, 300 Player XP, 1x Gold Ingot

### ☀️ 2. Daily Bounties (`daily`)
Refreshed automatically every UTC midnight:
1. **`quest_daily_woodcutter`**: "Daily Lumber Supply"
   * *Requirement*: Harvest 15 Oak Wood (`wood_oak`, 15)
   * *Reward*: 40 Coins, 80 Player XP
2. **`quest_daily_miner`**: "Quarry Work Order"
   * *Requirement*: Mine 10 Granite Stones (`stone_granite`, 10)
   * *Reward*: 40 Coins, 80 Player XP
3. **`quest_daily_refiner`**: "Daily Carpenter Craft"
   * *Requirement*: Craft 4 Oak Planks (`plank_oak`, 4)
   * *Reward*: 50 Coins, 100 Player XP

---

## 3. Daily Midnight Reset & Auto-Initialization
* When a player interacts with the bot (`/quests` or gathering/crafting), `ensurePlayerQuests` evaluates `quest.startedAt`.
* If a daily bounty was started on a previous UTC calendar date, its progress resets to `0`, `startedAt` is updated to the current date, and status returns to `'active'`.
* **Story Quests are Never Reset**: Completed and claimed story quests remain permanently archived.

---

## 4. Anti-Cheat & Concurrency Security
* **Single-Claim Guarantee**: `claimQuestReward` verifies `quest.status === 'completed'`. Upon execution, it is immediately flagged as `'claimed'`. Duplicate claim attempts are rejected with `QUEST_ALREADY_CLAIMED`.
* **Server-Side Authoritative Progress**: Progress counters can only be incremented by genuine server-side gameplay events (`executeGatherAction`, `executeCraftRecipe`).
* **ActionLock Protection**: The `qst_claim_do` callback is wrapped in `actionLockMiddleware` to eliminate double-tap exploits.

---

## 5. Hierarchical 2-Button per Row Telegram UI
```
/quests (or /quest)
      ↓
[📜 Story Quests]   [☀️ Daily Bounties]
[🎒 View Backpack]  [🏠 Main Menu]
      ↓ (Screen 2: Category List)
[🪵 First Steps 🎁]  [🪓 Daily Lumber 🔄]
[◀️ Prev]      [• 1/1 •]    [Next ▶️]
[⬅️ Quest Hub]             [🏠 Main Menu]
      ↓ (Screen 3: Quest Details & Progress Bar)
[🎁 Claim Reward]    [⬅️ Back]
[🏠 Main Menu]
      ↓ (Screen 4: Reward Claim Outcome)
[📜 More Quests]     [🎒 View Backpack]
[🏠 Main Menu]
```

* **Natural English + Hinglish Dialogue**:
  * *"🎉 QUEST REWARD CLAIMED! 🌟 First Steps into Rane (+50 Coins, +100 Player XP)!"*
  * *"⏳ Quest abhi complete nahi hua hai. Requirements complete karke wapas aayen!"*
  * *"✨ Yeh quest already claim ho chuka hai."*
