# 🏰 Legends of Rane — 3D Voxel Mini App System

## 1. System Overview & Architecture
The Legends of Rane 3D Voxel Mini App provides a sandbox base-building experience powered by Three.js (WebGL) and served directly inside the Telegram WebApp environment or standard modern browsers. Players can orbit, pan, zoom, snap blocks to a 32×32 grid, break voxels, cycle lighting (Day/Twilight/Night), and save their creations to MongoDB.

```
                    /base or /build in Telegram Chat
                                  │
                                  ▼
                 [Compact Telegram Launch Card]
              - Displays current block count
              - [🏗️ Open 3D Base] WebApp Button
                                  │
                                  ▼
                Three.js 3D WebGL Mini App Canvas
                     (public/webapp/app.js)
        - OrbitControls (smooth damping, zoom, pan, recenter)
        - Raycast Snap-to-Grid Placement & Voxel Destruction
        - Selection & Hover Highlight Box
        - Procedural Web Audio SFX (Click, Place, Destroy)
        - Telegram Haptic Feedback (Light, Medium, Heavy)
        - 9-Slot Hotbar & 28+ Categorized Block Palette
                                  │
                                  ▼
                 [REST APIs & Cloud Persistence]
                  (src/server/routes/baseRoutes.js)
        - GET  /api/base/blocks -> Full catalog & categories
        - GET  /api/base/load   -> Restore base on refresh
        - POST /api/base/save   -> Debounced cloud auto-save
        - POST /api/base/place  -> Single block placement
        - POST /api/base/destroy-> Single block deletion
        - POST /api/base/clear  -> Full base reset
```

---

## 2. Centralized 28+ Voxel Block Catalog

Centralized in `src/engine/voxel/blockConfig.js`:

| Category | Blocks | Visual Properties |
|---|---|---|
| **🌿 Nature & Earth** | `grass`, `dirt`, `sand`, `water`, `lava`, `oak_leaves` | Translucent water, emissive lava glow, natural foliage textures |
| **🏛️ Building & Stone** | `smooth_stone`, `cobblestone`, `stone_brick`, `mossy_stone`, `obsidian`, `red_brick`, `wool_white`, `wool_red`, `wool_blue` | Emissive void obsidian, vibrant wools, classical stone masonry |
| **🪵 Woods & Timber** | `wood_oak_plank`, `wood_oak_log`, `wood_birch_plank`, `wood_birch_log`, `wood_dark_oak` | Realistic grain tones, rough bark surfaces |
| **💎 Minerals & Ores** | `ore_coal`, `ore_iron`, `ore_gold`, `ore_diamond`, `ore_emerald`, `crystal_magic` | Sparkling specular highlights, emissive crystal glows |
| **🛠️ Decor & Utility** | `decor_bookshelf`, `decor_crafting_table`, `decor_tnt`, `decor_lantern`, `decor_glass` | High-intensity lantern point lights, transparent glass |

---

## 3. Server-Side Security & Validation
* **Coordinate Bounds**: $X \in [-16, 16]$, $Y \in [0, 24]$, $Z \in [-16, 16]$ (maximum bounding volume $32 \times 24 \times 32$).
* **Block Limit**: Clamped to a maximum of `2,000` blocks per base to preserve server memory and WebGL performance.
* **Palette Integrity**: All placed blocks are validated against `BLOCK_CATALOG`. Unknown block IDs are dropped.
* **Coordinate Deduplication**: Multiple blocks at the same coordinate automatically overwrite rather than duplicating entities in MongoDB.

---

## 4. UI Layout & Telegram Compatibility

### Telegram Chat Launch Card
```
🏰 YOUR VOXEL KINGDOM 🏰
━━━━━━━━━━━━━━━━━━━━━━
Step into your personal 3D voxel sandbox in the Realm of Rane!

🧱 Blocks Placed: 26 / 2,000 blocks
📐 Canvas Boundary: 32×32 Grid
🎨 Palette: 28+ nature, stone, wood, ore & decor blocks

Tap below to launch the interactive 3D WebGL builder:

[🏗️ Open 3D Base]
[🎒 View Backpack]    [🏠 Main Menu]
```

### In-App 3D Builder UI (`public/webapp/`)
* **Top Bar**: Base title, real-time block counter (`26 / 2000`), Time-of-Day button (`☀️ Day` $\to$ `🌆 Twilight` $\to$ `🌙 Night`), Recenter Camera button (`🎯 Center`), Clear Base button (`🗑️ Clear`).
* **Mode Bar**: `[🔨 Place Block]` vs `[⛏️ Break Block]`.
* **Bottom Section**: 9-Slot Hotbar with numeric keyboard bindings (1–9) and active slot highlight.
* **Palette Modal (`[📦 All Blocks]` button)**: Opens the categorized grid to equip any of the 28+ materials directly into the active hotbar slot.

---

## 5. Audio, Haptics & Performance
* **Procedural Web Audio**: Synthesizes real-time sound effects (no large audio asset files needed):
  * **Click**: 800Hz sine blip
  * **Place**: 320Hz–520Hz rising chirp
  * **Destroy**: 160Hz–40Hz sawtooth crunch
* **Telegram Haptics**: Triggers native device vibration via `Telegram.WebApp.HapticFeedback.impactOccurred`.
* **Rendering Optimizations**: Shared `BoxGeometry(1,1,1)` across all blocks with centralized material caching to maintain 60 FPS on mobile devices.
