# 🏰 Legends of Rane — Complete Project Blueprint & Build Guide

> **A comprehensive, step-by-step specification to rebuild the entire Telegram-first Multiplayer RPG & 3D Voxel Mini App from scratch.**

---

## 📑 Table of Contents
1. [Project Overview & Architecture](#-1-project-overview--architecture)
2. [Tech Stack & Dependencies](#-2-tech-stack--dependencies)
3. [Directory Tree Structure](#-3-directory-tree-structure)
4. [Environment Setup & Configuration](#-4-environment-setup--configuration)
5. [Database Schema Specifications (MongoDB/Mongoose)](#-5-database-schema-specifications)
6. [Core Engine Implementations](#-6-core-engine-implementations)
7. [Telegram Bot Layer (Telegraf & Middlewares)](#-7-telegram-bot-layer)
8. [SVG-to-PNG Card Generator (@resvg/resvg-js)](#-8-svg-to-png-card-generator)
9. [3D Voxel Mini App (Three.js WebGL & REST API)](#-9-3d-voxel-mini-app)
10. [Step-by-Step Setup & Launch Guide](#-10-step-by-step-setup--launch-guide)

---

## 🌍 1. Project Overview & Architecture

**Legends of Rane** is a hybrid Telegram gaming experience combining:
- **Telegram Bot RPG (Telegraf.js)**: Text, inline buttons, dynamic PNG graphics, gathering, crafting, quests, pet companions, player-to-player marketplace, gifting, group raids, and offline idle progression.
- **3D Voxel Mini App (Three.js WebGL + Express)**: A 3D Minecraft-style creative sandbox rendered inside Telegram WebApp with raycasted block placement/destruction, dynamic point lighting, 28+ blocks, procedural audio, and cloud persistence.

```
┌─────────────────────────────────────────────────────────────┐
│                       TELEGRAM CLIENT                       │
│    Chat / Groups (Bot Commands)   │   Mini App (3D WebGL)   │
└──────────────────┬──────────────────────────┬───────────────┘
                   │                          │
                   ▼                          ▼
     ┌───────────────────────────┐  ┌───────────────────┐
     │      Telegraf Engine      │  │ Express REST API  │
     │ - UserLoader & ActionLock │  │ - /api/base/place │
     │ - OwnershipGuard          │  │ - /api/base/break │
     │ - SVG Card Renderer       │  │ - /webapp static  │
     └─────────────┬─────────────┘  └─────────┬─────────┘
                   │                          │
                   └───────────┬──────────────┘
                               ▼
     ┌──────────────────────────────────────────────────┐
     │                CORE RPG ENGINES                  │
     │ Gathering │ Crafting │ Market │ Pets │ Quests    │
     │ Progression │ Offline Idle │ Group Raids │ Base  │
     └─────────────────────────┬────────────────────────┘
                               ▼
     ┌──────────────────────────────────────────────────┐
     │              MONGODB ATLAS DATABASE              │
     │ Users, Items, Recipes, Quests, Pets, Bases, Orders│
     └──────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Tech Stack & Dependencies

### `package.json`
```json
{
  "name": "legends-of-rane",
  "version": "1.0.0",
  "description": "Legends of Rane — Telegram-first Multiplayer Resource RPG & 3D Mini App",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test:db": "node src/database/testConnection.js"
  },
  "dependencies": {
    "@resvg/resvg-js": "^2.6.2",
    "cors": "^2.8.6",
    "dotenv": "^16.4.7",
    "express": "^5.2.1",
    "mongoose": "^8.9.5",
    "telegraf": "^4.16.3"
  }
}
```

---

## 📂 3. Directory Tree Structure

```
rane_bot/
├── .env
├── .env.example
├── BOT_BLUEPRINT.md
├── package.json
├── public/
│   └── webapp/
│       ├── index.html        # Mini App HTML container & HUD layout
│       ├── style.css         # Cyberpunk/medieval dark HUD styles
│       └── game3d.js         # Three.js 3D Voxel sandbox engine
└── src/
    ├── index.js              # Application entrypoint & graceful shutdown
    ├── config/
    │   └── env.js            # Environment validation & configuration
    ├── database/
    │   ├── connection.js     # Mongoose connection & pool config
    │   ├── seedData.js       # Initial items, recipes, quests, pets, nodes
    │   └── testConnection.js # Healthcheck script for DB
    ├── models/
    │   ├── Base.js           # 3D Voxel blocks & base structure schema
    │   ├── Item.js           # Item catalog (ores, wood, ingots, tools)
    │   ├── MarketOrder.js    # Player marketplace listing schema
    │   ├── Pet.js            # Companion pets & perk schemas
    │   ├── Quest.js          # Story and daily quest schema
    │   ├── Recipe.js         # Blacksmith & crafting recipes
    │   ├── ResourceNode.js   # Gathering nodes (trees, mines, quarries)
    │   └── User.js           # Player profile, inventory, skills, energy
    ├── engine/
    │   ├── base/
    │   │   └── baseEngine.js         # Block placement & canvas logic
    │   ├── economy/
    │   │   ├── craftingEngine.js     # Crafting validation & inventory swap
    │   │   ├── marketEngine.js       # Atomic player-to-player market
    │   │   └── toolService.js        # Tool durability & tier calculations
    │   ├── gathering/
    │   │   └── gatheringEngine.js    # Drop tables, energy, critical harvests
    │   ├── offline/
    │   │   └── offlineCalculator.js  # Idle earnings calculation
    │   ├── pets/
    │   │   └── petEngine.js          # Pet adoption & buff calculations
    │   ├── progression/
    │   │   └── progressionEngine.js  # XP curves & skill leveling math
    │   ├── quests/
    │   │   └── questEngine.js        # Quest progress tracking & claim logic
    │   └── social/
    │       ├── giftEngine.js         # Anti-abuse player-to-player gifting
    │       └── groupEngine.js        # Group raid Colossus boss engine
    ├── server/
    │   └── app.js            # Express server & /api/base REST endpoints
    └── telegram/
        ├── bot.js            # Telegraf instance initialization & setup
        ├── buttons/
        │   └── callbackRouter.js     # Router for all inline button clicks
        ├── cards/
        │   └── cardRenderer.js       # SVG template to PNG generator
        ├── handlers/
        │   └── commandHandlers.js    # Telegram commands (/start, /explore...)
        ├── middlewares/
        │   ├── actionLock.js         # Race condition / anti-spam guard
        │   ├── ownershipGuard.js     # Group chat message button protection
        │   └── userLoader.js         # Auto user registration & context loader
        └── views/
            ├── craftingView.js
            ├── exploreView.js
            ├── gatheringView.js
            ├── giftView.js
            ├── groupNodeView.js
            ├── inventoryView.js
            ├── leaderboardView.js
            ├── mainMenuView.js
            ├── marketView.js
            ├── offlineView.js
            ├── petView.js
            ├── profileView.js
            ├── questView.js
            ├── toolsView.js
            └── uiHelpers.js
```

---

## ⚙️ 4. Environment Setup & Configuration

### `.env`
```ini
# Telegram Bot API Token (from @BotFather)
BOT_TOKEN=123456789:ABCDefGhIjKlMnOpQrStUvWxYz

# MongoDB Connection URI (Local or MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/legends_of_rane?retryWrites=true&w=majority

# Application Environment
NODE_ENV=development

# 3D Base Telegram Mini App URL (HTTPS Cloudflare Tunnel or Hosted Domain)
WEBAPP_URL=https://your-tunnel-url.trycloudflare.com/webapp

# Optional: Admin Telegram User IDs (comma-separated)
ADMIN_IDS=123456789
```

---

## 🗄️ 5. Database Schema Specifications

### `User.js`
* **Fields**:
  * `telegramId`: `String` (Indexed, Unique)
  * `username`: `String`, `firstName`: `String`
  * `level`: `Number` (Default 1), `xp`: `Number` (Default 0), `title`: `String`
  * `coins`: `Number` (Default 100)
  * `energy`: `{ current: Number, max: Number, lastRegen: Date }`
  * `skills`: `{ woodcutting: { level, xp }, mining: { level, xp }, crafting: { level, xp }, fishing: { level, xp } }`
  * `inventory`: `[{ itemId: String, quantity: Number }]`
  * `equippedTools`: `{ axe: { toolId, durability }, pickaxe: { toolId, durability } }`
  * `activePet`: `String` (petId)
  * `lastActive`: `Date`

### `Base.js`
* **Fields**:
  * `telegramId`: `String` (Indexed, Unique)
  * `baseLevel`: `Number` (Default 1)
  * `gridSize`: `Number` (Default 24)
  * `blocks`: `[{ x: Number, y: Number, z: Number, blockType: String }]`
  * `structures`: `[{ structureId: String, x: Number, y: Number, level: Number }]`

### `Item.js`
* `itemId`: `String` (Unique, e.g. `wood_oak`, `ore_iron`, `tool_pickaxe_iron`)
* `name`: `String`, `emoji`: `String`, `category`: `String` (`raw`, `refined`, `tool`, `special`)
* `tier`: `Number`, `basePrice`: `Number`, `description`: `String`

### `MarketOrder.js`
* `orderId`: `String` (Unique)
* `sellerId`: `String`, `sellerName`: `String`
* `itemId`: `String`, `quantity`: `Number`, `pricePerUnit`: `Number`, `totalPrice`: `Number`
* `status`: `String` (`active`, `sold`, `cancelled`), `createdAt`: `Date`

### `Quest.js`
* `questId`: `String` (Unique), `title`: `String`, `category`: `String`
* `requirements`: `[{ type: 'gather_item' | 'reach_skill_level', targetId: String, count: Number }]`
* `rewards`: `{ coins: Number, playerXp: Number, items: [{ itemId, quantity }], unlockedTitle: String }`

---

## ⚙️ 6. Core Engine Implementations

### A. Gathering Engine (`gatheringEngine.js`)
1. **Validation**: Checks if user has $\ge$ node energy cost and required tool tier.
2. **Energy Deduct & Tool Wear**: Deducts energy; reduces equipped tool durability by 1.
3. **Drop Calculation**:
   $$\text{Yield} = \text{baseDrop} + \text{ToolTierBonus} + \text{PetBonus}$$
4. **Critical Roll**: 10% base chance for $2\times$ loot multiplier.
5. **Skill XP**: Awards skill XP and character XP; triggers level-up checks.

### B. Progression & XP Math (`progressionEngine.js`)
* Player Level Curve:
  $$\text{PlayerXP}(L) = \lfloor 100 \times L^{1.5} \rfloor$$
* Skill Mastery Curve:
  $$\text{SkillXP}(L) = \lfloor 60 \times L^{1.4} \rfloor$$

### C. Player Marketplace (`marketEngine.js`)
* **Listing**: Validates inventory count, subtracts items to escrow, creates `MarketOrder`.
* **Buying**: Validates buyer coin balance, deducts coins, awards coins to seller, transfers items to buyer inventory.
* **Cancelling**: Restores escrowed items to seller inventory, marks order `cancelled`.

### D. Offline Idle Calculator (`offlineCalculator.js`)
* Calculates elapsed hours since `user.lastActive` (capped at 12 hours).
* Computes passive coins & wood/stone generation from player's Base structures.

---

## 🤖 7. Telegram Bot Layer

### All Commands Implemented

| Command | Action |
|---|---|
| `/start` | Welcome card, player stats, main menu inline keyboard, persistent bottom keyboard |
| `/base` | Generates 3D Mini App launch button with Telegram WebApp URL |
| `/profile` | High-res SVG-to-PNG player profile card with skill progress bars |
| `/explore` | Node selection (Lumberjack Forest, Granite Quarry, Iron Mine) |
| `/inventory` | Dynamic inventory grid card with resource quantities |
| `/craft` | Blacksmith workshop with recipes, material requirements, and craft buttons |
| `/tools` | Tool overview with durability meters |
| `/quests` | Quest log with claimable rewards |
| `/pets` | Adoptable pets, active companion switcher, happiness feeding |
| `/market` | Active market listings with 1-click buy buttons |
| `/sell` | `/sell [item] [qty] [price]` command parser |
| `/gift` | `/gift @user [item] [qty]` with level-3 limit & daily cap |
| `/leaderboard` | Top 10 rankings by Level and Wealth |
| `/offline` | Displays idle earnings summary and claims rewards |
| `/groupnode` | Group-chat Colossus boss with shared HP bar |
| `/help` | Complete in-game command cheat-sheet |

---

## 🖼️ 8. SVG-to-PNG Card Generator

Using `@resvg/resvg-js`:
1. Build an SVG template string with gradients, modern typography, progress bars, and badges.
2. Render to PNG buffer:
```javascript
import { Resvg } from '@resvg/resvg-js';

export function svgToPng(svgString) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: 800 }
  });
  return resvg.render().asPng();
}
```
3. Send to Telegram via `ctx.replyWithPhoto({ source: pngBuffer })`.

---

## 🏰 9. 3D Voxel Mini App (Three.js WebGL)

### A. Engine Architecture (`game3d.js`)
* **Renderer**: `THREE.WebGLRenderer` with shadows and antialiasing.
* **Camera**: `THREE.PerspectiveCamera` with `OrbitControls` (pan, rotate, zoom).
* **Grid**: $24 \times 24$ voxel terrain with dynamic bounding limits.
* **Textures**: Procedurally generated $64 \times 64$ pixel canvases for 28+ block types (Grass, Ores, Woods, Bricks, Lights).
* **Lighting**: Directional sunlight + ambient sky light + dynamic `THREE.PointLight` on Lanterns, Lava, and Crystals with subtle pulsing.
* **Raycasting**:
  * In **🔨 Place Mode**: Intersects meshes; calculates normal offset $\vec{n}$; places block at $(x + n_x, y + n_y, z + n_z)$.
  * In **⛏️ Break Mode**: Intersects target mesh; removes from scene and database.
* **Audio**: Procedural `Web Audio API` oscillator for place (`triangle 220Hz`), break (`sawtooth 120Hz`), and click sounds.

### B. REST API Endpoints (`src/server/app.js`)
* `GET /api/base?telegramId=...` — Returns user profile & saved 3D voxel coordinates.
* `POST /api/base/block/place` — `{ telegramId, x, y, z, blockType }`
* `POST /api/base/block/destroy` — `{ telegramId, x, y, z }`
* `POST /api/base/clear` — `{ telegramId }`

---

## 🚀 10. Step-by-Step Setup & Launch Guide

### Step 1: Clone & Install Dependencies
```bash
git clone <your-repo>
cd rane_bot
npm install
```

### Step 2: Create Telegram Bot via @BotFather
1. Open [@BotFather](https://t.me/BotFather) on Telegram.
2. Send `/newbot`, choose a name and username (e.g. `legends_of_rane_bot`).
3. Copy the HTTP API Token to `BOT_TOKEN` in `.env`.
4. (Optional) Set Menu Button:
   * Send `/setmenubutton` to @BotFather.
   * Choose your bot and enter your Mini App HTTPS URL.

### Step 3: Configure Database
1. Create a free MongoDB Atlas cluster or start local MongoDB (`mongodb://localhost:27017/legends_of_rane`).
2. Put connection URI into `MONGO_URI` in `.env`.

### Step 4: Start Cloudflare HTTPS Tunnel (For Mini App)
```bash
cloudflared tunnel --url http://localhost:3000
```
Copy the generated `https://xxxx.trycloudflare.com` URL and set `WEBAPP_URL=https://xxxx.trycloudflare.com/webapp` in `.env`.

### Step 5: Start the Bot & Server
```bash
npm run dev
```

The bot is now live! Open your Telegram bot and send `/start` to begin your journey.
