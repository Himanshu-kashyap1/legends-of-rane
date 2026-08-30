# 🎨 Legends of Rane — SVG/PNG High-Res Card Renderer

## 1. System Overview & Architecture
The SVG/PNG Card Rendering Engine generates crisp, high-resolution (800px width) Telegram-ready graphics using `@resvg/resvg-js`. It creates rich visual cards for character sheets, main menu banners, backpack inventories, and raid leaderboards while maintaining strict XML escaping, data sanitization, and fallback delivery mechanisms.

```
            Game State / Server-Side Player Data
                             │
                             ▼
                 [SVG Template Generator]
            (src/renderer/cardTemplates.js)
        - Strict XML text escaping (escapeSvg)
        - Truncates long names (truncateText)
        - Glassmorphism & Fantasy Dark Palette
                             │
                             ▼
             [High-Performance Resvg Engine]
             (src/renderer/cardRenderer.js)
        - Renders 800px high-resolution PNG Buffer
                             │
                             ▼
              [Telegram Delivery Service]
             (src/services/cardService.js)
        - replyWithPhoto(buffer, caption)
        - Automatic fallback to text message on API error
```

---

## 2. Implemented Card Templates

### 1. 🏰 Main Menu Banner Card (`renderMainMenuCard` — 800x400)
* **Visual Elements**: Realm header ("LEGENDS OF RANE"), player avatar circle, active title badge, Level, Treasury Coins, real-time Energy progress bar, and active Companion Pet.

### 2. 🧙‍♂️ Player Profile Card (`renderProfileCard` — 800x500)
* **Visual Elements**: Character avatar, Hero username, Active Title badge, Player Level & XP progress bar, Treasury coins, and **5 Skill Mastery progress bars** (Woodcutting, Mining, Crafting, Fishing, Exploration).

### 3. 🎒 Inventory Grid Card (`renderInventoryCard` — 800x450)
* **Visual Elements**: 2x4 visual item slot grid. Displays equipped tool tiers with golden borders and stackable resources with cyan borders and quantities. Handles empty slots gracefully with dashed outlines.

### 4. 🏆 Leaderboard Podium Card (`renderLeaderboardCard` — 800x500)
* **Visual Elements**: 3D-styled podium columns for Top 3 adventurers:
  * 🥇 Gold Champion (Center MVP)
  * 🥈 Silver Contender (Left)
  * 🥉 Bronze Challenger (Right)
  Displays player avatars, levels, and total wealth/score metrics.

---

## 3. Security & Sanitization Rules
* **XML / SVG Escaping**: All user-supplied strings (usernames, first names, custom titles) are rigorously sanitized via `escapeSvg` (`&`, `<`, `>`, `"`, `'`) before template interpolation.
* **Layout Overflow Prevention**: `truncateText` clamps strings to safe maximum lengths with ellipsis (`…`) to avoid visual clipping.
* **Controlled Assets Only**: Pure vector graphics, system fonts, and Unicode glyphs; no unsafe arbitrary user file paths.
* **Resilience**: Empty data structures, missing skills, or empty inventories render clean placeholder slots without crashing.

---

## 4. Delivery & Fallback Service
* **`sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer })`**:
  * Delivers the graphical PNG card buffer directly as a Telegram photo.
  * If photo transmission fails (e.g. rate limits or network constraints), it smoothly falls back to a clean Markdown text response.
