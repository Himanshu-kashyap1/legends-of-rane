# 🏰 Legends of Rane — Architecture & System Design Document

## 1. Executive Summary & Purpose
**Legends of Rane** is a hybrid gaming ecosystem combining:
1. **Telegram Text & Card RPG**: An asynchronous/multiplayer bot driven by Telegraf, featuring resource gathering, crafting, dynamic SVG-to-PNG stats cards, player-to-player marketplace, companion pets, quests, and Colossus group raids.
2. **3D Voxel Mini App**: A Three.js WebGL creative sandbox inside Telegram WebApp with raycasted block manipulation, dynamic lighting, custom voxel textures, audio synthesis, and persistent cloud storage.

Both clients interact with a unified **MongoDB** database through a modular, decoupled Node.js (ESM) backend architecture.

---

## 2. Directory Tree Structure

```
i_am_rane/
├── .env                     # Environment variables (secrets, tokens, URIs)
├── .env.example             # Template for configuration
├── .gitignore               # Git exclusions (node_modules, .env, logs)
├── ARCHITECTURE.md          # System architecture, boundaries & design rules
├── BOT_BLUEPRINT.md         # Detailed specification and math formulas
├── TODO.md                  # Step-by-step roadmap for remaining phases
├── package.json             # NPM dependencies, scripts, ESM configuration
├── public/
│   └── webapp/              # Telegram Mini App static client
│       ├── index.html       # WebApp entrypoint & HUD layout
│       ├── style.css        # Cyberpunk / medieval dark theme HUD
│       └── game3d.js        # Three.js 3D Voxel engine
├── src/
│   ├── index.js             # Main bootstrap & graceful shutdown orchestrator
│   ├── config/
│   │   └── env.js           # Validated, sanitized configuration provider
│   ├── database/
│   │   ├── connection.js    # Mongoose connection manager & pool lifecycle
│   │   ├── seedData.js      # Initial catalog items, recipes, quests, pets
│   │   └── testConnection.js# Standalone DB healthcheck script
│   ├── engine/              # Pure game logic engines (No Telegram/UI dependencies)
│   │   ├── base/            # Block validation & grid computation
│   │   ├── economy/         # Crafting validation, tool durability, market math
│   │   ├── gathering/       # Energy, drop tables, critical roll calculations
│   │   ├── offline/         # Idle progress formula & earnings calculation
│   │   ├── pets/            # Pet perks & adoption multipliers
│   │   ├── progression/     # XP curves & skill mastery formulas
│   │   ├── quests/          # Quest completion conditions & rewards
│   │   └── social/          # Gifting validation & group boss damage ledger
│   ├── models/              # Mongoose data models & schemas
│   │   ├── Base.js          # Voxel world blocks & base structures
│   │   ├── Item.js          # Static item catalog (ores, wood, ingots, tools)
│   │   ├── MarketOrder.js   # Marketplace listings & escrow state
│   │   ├── Pet.js           # Companion pet definitions
│   │   ├── Quest.js         # Daily & story quest specifications
│   │   ├── Recipe.js        # Crafting & smelting recipes
│   │   ├── ResourceNode.js  # Gathering zones (Forest, Quarry, Mine)
│   │   └── User.js          # Player profile, inventory, skills, energy
│   ├── server/
│   │   └── app.js           # Express REST API, CORS, health & Mini App serving
│   ├── services/            # Cross-cutting orchestration & transactional services
│   ├── telegram/            # Telegram transport & UI presentation layer
│   │   ├── bot.js           # Telegraf instance & error boundary
│   │   ├── buttons/         # Inline keyboard callback router
│   │   ├── cards/           # @resvg/resvg-js SVG-to-PNG card generator
│   │   ├── commands/        # Telegram slash commands (/start, /explore, etc.)
│   │   ├── handlers/        # Message & event handlers
│   │   ├── middlewares/     # UserLoader, ActionLock, OwnershipGuard
│   │   └── views/           # UI formatters, buttons, response templates
│   └── utils/
│       ├── errors.js        # Domain & operational error hierarchy
│       └── logger.js        # Leveled logger with secret redaction
└── tests/
    ├── config.test.js       # Configuration & secret masking test
    ├── errors.test.js       # Custom error class tests
    ├── logger.test.js       # Logger level & safety tests
    └── server.test.js       # Express route & healthcheck tests
```

---

## 3. Architectural Boundaries & Responsibilities

### 3.1 Layer Responsibilities
```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  Telegram Chat UI (Buttons/Cards) │ Mini App (Three.js WebGL)│
└───────────────────────┬─────────────────────────────┬───────┘
                        │ HTTP / Webhook / Polling    │ REST API (/api/base/*)
                        ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     TRANSPORT LAYER                         │
│  Telegram Bot (Telegraf.js)       │ Express HTTP Server     │
│  - Middlewares (UserLoader,       │ - CORS & Security       │
│    ActionLock, OwnershipGuard)    │ - /health               │
│  - Card Renderer (@resvg/resvg-js)│ - Static File Server    │
└───────────────────────┬─────────────────────────────┬───────┘
                        │                             │
                        └──────────────┬──────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION SERVICES                    │
│  Orchestration, Transaction boundaries, Concurrency guards   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      PURE GAME ENGINES                      │
│  - GatheringEngine    - CraftingEngine    - MarketEngine    │
│  - ProgressionEngine  - OfflineCalculator - PetEngine       │
│  - QuestEngine        - GroupRaidEngine   - BaseEngine      │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                     │
│  Mongoose Models & Schemas (User, Base, Item, Market, etc.) │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                       │
│                     MongoDB Database                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Dependency Direction Rules
1. **Engines must NOT import Telegram modules**: Game engines contain pure math and logic (e.g. `calculateXp(level)`, `calculateYield(tier, petBonus)`). They return plain JavaScript objects.
2. **Views & Cards format data for presentation**: `src/telegram/views/` and `src/telegram/cards/` take engine outputs and render formatted text, buttons, or SVG graphics.
3. **Database access is centralized**: Models encapsulate schema validation. Services handle multi-document consistency.
4. **Mini App client is an untrusted presentation layer**: All block operations (`place`, `destroy`, `clear`) sent to `/api/base/*` are validated on the server against player grid bounds and player inventory/rules.

---

## 4. Concurrency & Security Architecture

### 4.1 Action Locking (`ActionLock` Middleware)
- **Problem**: Users double-tapping Telegram buttons or spamming commands can trigger parallel executions, causing duplicate coin/item rewards or double-spending.
- **Solution**: An in-memory/Redis lock per `telegramId` prevents simultaneous execution of state-changing bot operations.

### 4.2 Ownership Guard (`OwnershipGuard` Middleware)
- **Problem**: In group chats, User B could click an inline button belonging to User A's profile or exploration menu.
- **Solution**: Callbacks encode user ownership in `callback_data` (e.g., `act:explore:forest:123456789`). The middleware verifies `ctx.from.id == expectedOwnerId` before proceeding.

### 4.3 Atomic Marketplace Transactions
- **Escrow**: Listing an item deducts it immediately from the seller's inventory into the `MarketOrder` escrow.
- **Atomic Purchase**: Executed using MongoDB atomic conditional updates (`findOneAndUpdate` with balance check) or multi-document transactions to guarantee no double-selling or currency creation.

### 4.4 Client Mini App Validation
- The Mini App cannot send arbitrary block structures or modify coins/XP directly.
- Placement requests specify coordinates $(x, y, z)$ within the allowed grid boundary (e.g., $24 \times 24$). The server validates coordinate bounds and records the delta in MongoDB.

### 4.5 Secrets & Logging Sanitation
- Credentials (`BOT_TOKEN`, `MONGO_URI`) are strictly loaded via `src/config/env.js`.
- The logging utility automatically strips passwords and bot tokens from all outputs.

---

## 5. Technology Stack Summary
| Layer | Technology |
|---|---|
| **Runtime** | Node.js v20+ (ESM Native) |
| **Telegram Framework** | Telegraf.js 4.16+ |
| **HTTP & Static Server** | Express.js 4+ |
| **Database & ODM** | MongoDB Atlas / Mongoose 8+ |
| **Graphic Generation** | @resvg/resvg-js 2.6+ (High-performance SVG to PNG) |
| **3D Mini App Frontend** | Three.js (WebGL), Vanilla JS, CSS3 |
| **Testing** | Node Native Test Runner (`node:test`, `node:assert`) |
