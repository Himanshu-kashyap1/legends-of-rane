# 🌙 Legends of Rane — Offline Idle Earnings System

## 1. System Overview & Architecture
The Offline Idle Earnings System ensures players are rewarded for their time away from the realm. Automated realm structures—**Royal Lumber Mills**, **Quarry Derricks**, and **Gold Forges**—continue continuous harvest cycles while the adventurer is logged off.

```
                    Player Away from Realm
                              │
                              ▼
            [Authoritative Server Timestamp]
       - Calculates elapsed time: now - lastLogoutAt
       - Enforces Minimum Time: 5 Minutes
       - Clamps Maximum Simulation Time: 12 Hours
                              │
                              ▼
              [Companion Pet Multiplier Check]
       - River Otter active -> +20% Bonus Yields
                              │
                              ▼
               [Offline Calculation Engine]
              (src/engine/offline/offlineEngine.js)
       - Royal Lumber Mill -> 4 Wood / hr
       - Quarry Derrick    -> 3 Granite Stone / hr
       - Gold Forge        -> 10 Coins / hr
                              │
                              ▼
                [/offline Telegram Command]
                              │
                              ▼
                 [Atomic Deposit & Reset]
       - Deposits resources to Inventory & coins to Treasury
       - Resets user.offline.lastLogoutAt = now
       - Prevents duplicate claims immediately
```

---

## 2. Base Structures & Production Rates

Centralized in `src/engine/offline/structureConfig.js`:

| Structure | Emoji | Resource | Base Rate | Description |
|---|---|---|---|---|
| **Royal Lumber Mill** | 🪵 | Oak Wood (`wood_oak`) | `4 / hour` | Automated timber saws harvesting sturdy oak logs continuously. |
| **Quarry Derrick** | 🪨 | Granite Stone (`stone_granite`) | `3 / hour` | Winches and pulleys lifting stone blocks from the quarry depths. |
| **Treasury Gold Forge** | 🪙 | Coins | `10 / hour` | Autonomous smelters coining royal currency around the clock. |

---

## 3. Simulation Cap & Anti-Cheat Rules
* **Authoritative Timestamps**: Elapsed time is strictly computed using `now - user.offline.lastLogoutAt`. Client-provided timestamps are completely ignored.
* **Minimum Duration (5 Minutes)**: Prevents reward-spamming.
* **12-Hour Maximum Cap**: Idle simulation is capped at 12 hours ($12 \times 3600 \times 1000\text{ ms}$). Time beyond 12 hours yields no additional resources until claimed.
* **Single-Claim Guarantee**: When rewards are claimed, `user.offline.lastLogoutAt` is updated to the current timestamp. Subsequent claim attempts immediately encounter $<5$ minutes elapsed time and are safely rejected.
* **ActionLock Protection**: `claim_offline_do` is locked by `actionLockMiddleware` to eliminate double-tap race conditions.

---

## 4. Companion Pet Multiplier
* If an adventurer equips the **River Otter** (`pet_river_otter`) with $\ge 50\%$ happiness:
  * All offline resource and coin yields receive an additional **+20% bonus**!

---

## 5. Hierarchical 2-Button per Row Telegram UI

### Inspection View (`/offline`)
```
🌙 OFFLINE IDLE TREASURY 🌙
━━━━━━━━━━━━━━━━━━━━━━
While you rested outside Rane, your realm structures continued working tirelessly!

⏳ Time Away: 4h 32m
✨ Pet Bonus: 🦦 +20% (River Otter)

📦 Harvested Resources & Wealth:
  • 🪵 Oak Wood: +21
  • 🪨 Granite Stone: +16
  • 🪙 Treasury Coins: +54 Coins

[✅ Claim Earnings]    [🎒 Backpack]
[🏠 Main Menu]
```

### Claim Outcome View
```
🎉 OFFLINE TREASURY CLAIMED!
━━━━━━━━━━━━━━━━━━━━━━
Your idle earnings have been deposited into your vaults and backpacks!

🎁 Rewards Deposited:
  • 🪙 +54 Coins
  • 📦 🪵 +21 Oak Wood, 🪨 +16 Granite Stone

🪙 Total Treasury Balance: 15,474 Coins
Your automated structures have begun a new production cycle!

[🎒 View Backpack]    [🌲 Go Exploring]
[🏠 Main Menu]
```
