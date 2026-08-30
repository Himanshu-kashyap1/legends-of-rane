# 🤖 Legends of Rane — Telegram Bot Architecture & Request Lifecycle

## 1. Overview & Framework Audit
* **Telegram Framework**: `telegraf` (v4.16.3)
* **Transport Modes**: Long-polling (`bot.launch()`) in development/local mode; webhook ready for production.
* **Architecture Pattern**: Decoupled Onion Middleware Pipeline with isolated Transport, Engine, and Persistence layers.

---

## 2. Telegram Request & Update Lifecycle

Every incoming Telegram message, command, or inline button callback query flows through the following sequential pipeline:

```
                  ┌─────────────────────────────────────────┐
                  │          Incoming Telegram Update       │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ 1. errorBoundaryMiddleware              │
                  │    - Catches all downstream errors      │
                  │    - Sanitizes logs & masks secrets     │
                  │    - Sends player-friendly alerts       │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ 2. userLoaderMiddleware                 │
                  │    - Extracts ctx.from identity         │
                  │    - Atomic findOrCreate in MongoDB     │
                  │    - Populates ctx.state.user           │
                  │    - Sets isPrivate vs isGroup flags    │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ 3. actionLockMiddleware                 │
                  │    - Checks if update is state-mutating │
                  │    - In-memory lock per telegramId      │
                  │    - Failsafe TTL timeout auto-release  │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ 4. ownershipGuardMiddleware             │
                  │    - Parses compact callback data       │
                  │    - Validates clicker == ownerId       │
                  │    - Blocks group menu hijacking        │
                  └────────────────────┬────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
        [Callback Query Update]                 [Message / Command Update]
                     │                                   │
                     ▼                                   ▼
      ┌─────────────────────────────┐     ┌─────────────────────────────┐
      │ 5. callbackRouter           │     │ 6. registerCommands         │
      │    - Dispatches to action   │     │    - /start, /profile, etc. │
      │      handlers               │     │    - Validates parameters   │
      └──────────────┬──────────────┘     └──────────────┬──────────────┘
                     │                                   │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Pure Game Engines & Models        │
                  │       (Mongoose Database Queries)       │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    Telegram Response / Inline Cards     │
                  │    (ctx.reply / ctx.answerCbQuery)      │
                  └─────────────────────────────────────────┘
```

---

## 3. Context State (`ctx.state`) Structure

The middleware pipeline guarantees that subsequent command and button handlers have access to a clean, well-defined state context:

```typescript
ctx.state = {
  // Loaded Mongoose Player Document (or null if update has no user)
  user: UserDocument | null,

  // Raw Telegram sender object (ctx.from)
  telegramUser: { id, username, first_name, last_name } | null,

  // Telegram Chat object (ctx.chat)
  chat: { id, type: 'private' | 'group' | 'supergroup' | 'channel' } | null,

  // Chat classification helpers
  isPrivate: boolean,
  isGroup: boolean,

  // Parsed callback data (present on callback_query updates)
  callback?: {
    action: string,    // e.g. 'gather', 'craft', 'menu'
    ownerId: string,   // e.g. '987654321' or 'pub'
    targetId: string,  // e.g. 'forest_oak'
    meta: string,      // optional metadata
    isPublic: boolean, // true if ownerId is 'pub' or '0'
    isValid: boolean   // true if format parsed correctly
  }
};
```

---

## 4. Middleware Specifications

### 4.1 `userLoaderMiddleware`
* **Atomic Registration**: Uses `User.findOneAndUpdate({ telegramId }, { $setOnInsert: initialData }, { upsert: true, new: true })` to eliminate race conditions when a user spam-starts the bot.
* **New Player Defaults**:
  * **Coins**: 100
  * **Level**: 1, **XP**: 0, **Title**: "Novice Adventurer"
  * **Energy**: 100 / 100
  * **Skills**: Woodcutting (Lv 1), Mining (Lv 1), Crafting (Lv 1), Fishing (Lv 1), Exploration (Lv 1)
  * **Starter Tools**: 1x Wooden Axe (30 durability), 1x Wooden Pickaxe (30 durability) with unique instance IDs.
  * **Starter Resources**: 5x Oak Wood, 5x Granite Stone.
* **Idempotency**: Existing players keep all stats, coins, inventory, and skills intact; only `lastActiveAt` and username changes are updated.

### 4.2 `actionLockMiddleware`
* **Purpose**: Serializes state-changing actions per `telegramId` to eliminate duplicate coin, item, or gathering transactions.
* **Mutating Actions Filter**: Applies only to state-mutating actions (`gather`, `craft`, `buy`, `sell`, `gift`, `attack`, etc.). Read-only operations (`profile`, `inventory`, `help`, `menu`) execute freely without holding locks.
* **Failsafe Timeout**: If a handler hangs or database slows down, the lock automatically expires after 6000ms.
* **Guaranteed Cleanup**: Lock release is wrapped in a `finally` block to guarantee release on both success and errors.

### 4.3 `ownershipGuardMiddleware`
* **Anti-Hijacking in Groups**: When a player generates an inline keyboard in a group chat, the callback data encodes their `ownerId`.
* **Verification**: When button is tapped, `ctx.from.id` is compared against `ownerId`. If they do not match, the callback is rejected with an instant alert (`⛔ This menu belongs to another adventurer!`) and downstream execution is halted.
* **Public Callbacks**: Group boss raids and public buttons use `ownerId = 'pub'`, allowing all group members to participate.

### 4.4 `errorBoundaryMiddleware`
* Catches all unhandled promise rejections and errors in Telegram handlers.
* Logs full stack traces server-side with credential masking.
* Delivers user-friendly feedback to the player without exposing technical or database details.

---

## 5. Callback Data Protocol

Telegram restricts `callback_data` to a strict **64-byte payload limit**.

### 5.1 Format
```
[action]:[ownerId]:[targetId]:[meta]
```

### 5.2 Examples
| Purpose | Callback Data | Byte Size |
|---|---|---|
| Private Menu Navigation | `menu:987654321:profile` | 23 bytes |
| Resource Gathering | `gather:987654321:forest_oak` | 27 bytes |
| Blacksmith Crafting | `craft:987654321:tool_axe_stone` | 31 bytes |
| Public Boss Raid Attack | `attack:pub:colossus` | 20 bytes |

---

## 6. Rate Limiting vs Action Locking Distinction
* **Action Locking (Implemented)**: Guarantees **atomicity** by ensuring a player cannot have two concurrent state-mutating operations running simultaneously (preventing race conditions / item dupes).
* **Rate Limiting (Future Step)**: Regulates **frequency over time** (e.g. max 20 commands per minute) to protect against API flooding and resource exhaustion.
