# 🗿 Legends of Rane — Group Colossus Raid System

## 1. System Overview & Architecture
The Group Colossus Raid System introduces group-coordinated titan battles exclusively within Telegram Groups and Supergroups. Guild members unite to chip away at a shared, high-durability boss health pool using server-calculated damage, earning proportional rewards and rare gemstone drops upon victory.

```
                  /boss or /groupnode (Telegram Group)
                                   │
                                   ▼
                   [Group-Only Verification Check]
              - Rejects private chats with guidance
                                   │
                                   ▼
                    Group Colossus Raid Engine
                 (src/engine/combat/bossEngine.js)
                                   │
                                   ▼
                     [Shared Boss HP Lifecycle]
              - Ancient Granite Colossus (5,000 HP)
              - Tied to chatId (cross-group isolation)
                                   │
                                   ▼
                    [Player Attack Action (10⚡)]
              - Server calculates damage: 50 + (Lv * 10) + (ToolTier * 25)
              - 15% Critical strike roll (2x Damage)
              - Atomic HP deduction & participant tracking
                                   │
                                   ▼
                     [Boss Defeat & Distribution]
              - When HP reaches 0 -> Status: 'defeated'
              - Proportional coin & XP payout:
                  share = participantDamage / totalDamage
              - Top contributors receive rare Diamond & Emerald gems
              - Single-payout guarantee prevents duplicate rewards
```

---

## 2. Boss Catalog & Raid Configuration

Centralized in `src/engine/combat/bossConfig.js`:

| Boss | Emoji | Max HP | Attack Cost | Rewards Pool | Rare Drops |
|---|---|---|---|---|---|
| **Ancient Granite Colossus** | 🗿 | `5,000 HP` | `10 Energy` | 5,000 Coins, 2,500 XP | 💎 Diamond Gem ($\ge 15\%$ share), 🟢 Emerald Gem ($\ge 10\%$ share) |

---

## 3. Server-Side Damage & Combat Rules
* **Server-Authoritative Damage Formula**:
  $$\text{Base Damage} = 50 + (\text{PlayerLevel} \times 10)$$
  $$\text{Tool Tier Modifier} = \text{EquippedToolTier} \times 25$$
  $$\text{Raw Damage} = \text{Base Damage} + \text{Tool Tier Modifier}$$
  $$\text{Critical Strike (15\% Chance)} = \text{Raw Damage} \times 2.0$$
* **Energy Consumption**: Each strike consumes `10 Energy`.
* **HP Clamping**: Boss HP can never drop below `0`. Damage is clamped to remaining HP on the final lethal blow.

---

## 4. Proportional Rewards & Defeat Payouts
* **Proportional Formula**:
  $$\text{Player Share} = \frac{\text{Player Damage Dealt}}{\text{Total Boss Damage Dealt}}$$
  $$\text{Coins Earned} = \max(10, \lfloor 5,000 \times \text{Player Share} \rfloor)$$
  $$\text{XP Earned} = \max(20, \lfloor 2,500 \times \text{Player Share} \rfloor)$$
* **Rare Gemstone Drops**:
  * **Diamond Gem (`gem_diamond`)**: Awarded to players contributing $\ge 15\%$ total raid damage.
  * **Emerald Gem (`gem_emerald`)**: Awarded to players contributing $\ge 10\%$ total raid damage.
* **Single-Payout Guarantee**: `rewardsDistributed` flag is atomically locked upon defeat to prevent double distribution.

---

## 5. Hierarchical 2-Button per Row Telegram UI

### Raid Battle Status Card
```
🗿 ANCIENT GRANITE COLOSSUS 🗿
━━━━━━━━━━━━━━━━━━━━━━
A colossal titan has arisen! Warriors of this realm must unite to shatter its granite defenses!

❤️ Boss Health: 3,450 / 5,000
  [███████░░░ 69%]

⚔️ Your Contribution: 420 DMG (12% share)
👥 Warriors Engaged: 4 fighters
⚡ Attack Cost: 10 Energy

[⚔️ Attack (10⚡)]    [📊 Leaderboard]
[🔄 Refresh Status]   [📜 Boss Info]
```

### Raid Leaderboard View
```
📊 COLOSSUS RAID LEADERBOARD 📊
━━━━━━━━━━━━━━━━━━━━━━
🏆 Top Damage Contributors:
🥇 @champion: 2,100 DMG (42%)
🥈 @berserker: 1,450 DMG (29%)
🥉 @adventurer: 420 DMG (12%)
⚔️ @scout: 350 DMG (7%)

💥 Total Raid Damage Dealt: 4,320 DMG
Rewards are automatically distributed proportionally upon defeat!

[⚔️ Return to Battle]    [🔄 Refresh Board]
```

### Defeat Victory Report
```
🎊 COLOSSUS HAS BEEN SHATTERED! 🎊
━━━━━━━━━━━━━━━━━━━━━━
🗿 Ancient Granite Colossus has fallen under the combined might of your guild!

🎁 Raid Rewards Distributed:
• 👑 MVP @champion: +2,100c, +1,050XP + 💎 Diamond Gem (42%)
• #2 @berserker: +1,450c, +725XP + 💎 Diamond Gem (29%)
• #3 @adventurer: +600c, +300XP + 🟢 Emerald Gem (12%)

Coins, XP, and rare gemstone drops have been delivered directly to participants' accounts!

[⚔️ Awaken New Titan]    [📊 View Final Board]
```
