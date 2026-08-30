import { escapeSvg, truncateText, getCommonSvgDefs } from './svgHelpers.js';
import { getRequiredPlayerXp, getRequiredSkillXp, calculateProgressPercent } from '../engine/progression/progressionEngine.js';
import { getPetDefinition } from '../engine/pets/petConfig.js';
import { formatNumber } from '../telegram/views/uiHelpers.js';

/**
 * 1. Main Menu Banner Card (800x400)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateMainMenuSvg(user = {}) {
  const username = user.username ? `@${escapeSvg(user.username)}` : escapeSvg(user.firstName || 'Adventurer');
  const title = escapeSvg(user.title || 'Novice Adventurer');
  const level = Math.max(1, user.level || 1);
  const coins = formatNumber(user.coins || 0);
  const energy = user.energy?.current ?? 100;
  const maxEnergy = user.energy?.max ?? 100;
  const activePetDef = getPetDefinition(user.activePet);
  const petName = activePetDef ? `${escapeSvg(activePetDef.name)}` : 'None';

  return `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <!-- Background Canvas -->
      <rect width="800" height="400" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="396" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Realm Header Title -->
      <text x="400" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="4">LEGENDS OF RANE</text>
      <text x="400" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle" letter-spacing="2">MULTIPLAYER REALM &amp; RESOURCE RPG</text>

      <!-- Player Glass Banner -->
      <rect x="40" y="125" width="720" height="235" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" filter="url(#cardShadow)" />

      <!-- Player Avatar Placeholder & Identity -->
      <circle cx="110" cy="195" r="45" fill="#312e81" stroke="#f59e0b" stroke-width="3" />
      <text x="110" y="206" font-family="sans-serif" font-size="36" text-anchor="middle">👑</text>

      <text x="180" y="185" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#f8fafc">${truncateText(username, 18)}</text>
      <rect x="180" y="198" width="180" height="26" fill="#f59e0b" fill-opacity="0.2" rx="6" stroke="#f59e0b" stroke-width="1" />
      <text x="270" y="216" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#fde68a" text-anchor="middle">${truncateText(title, 20)}</text>

      <!-- Stats Grid -->
      <!-- Level -->
      <rect x="400" y="160" width="160" height="75" fill="#0f172a" fill-opacity="0.7" rx="12" stroke="#334155" stroke-width="1" />
      <text x="480" y="188" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">HERO LEVEL</text>
      <text x="480" y="220" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#38bdf8" text-anchor="middle">Lv ${level}</text>

      <!-- Coins -->
      <rect x="580" y="160" width="160" height="75" fill="#0f172a" fill-opacity="0.7" rx="12" stroke="#334155" stroke-width="1" />
      <text x="660" y="188" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">TREASURY</text>
      <text x="660" y="220" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#facc15" text-anchor="middle">${truncateText(coins, 10)}c</text>

      <!-- Energy Bar & Companion Row -->
      <rect x="60" y="265" width="340" height="70" fill="#0f172a" fill-opacity="0.7" rx="12" stroke="#334155" stroke-width="1" />
      <text x="80" y="292" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">ENERGY POOL</text>
      <text x="380" y="292" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="end">${energy} / ${maxEnergy}</text>
      <rect x="80" y="304" width="300" height="12" fill="#1e293b" rx="6" />
      <rect x="80" y="304" width="${Math.min(300, Math.max(0, Math.round((energy / maxEnergy) * 300)))}" height="12" fill="url(#barGradient)" rx="6" />

      <!-- Companion Pet -->
      <rect x="420" y="265" width="320" height="70" fill="#0f172a" fill-opacity="0.7" rx="12" stroke="#334155" stroke-width="1" />
      <text x="440" y="292" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">ACTIVE COMPANION</text>
      <text x="440" y="318" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#a78bfa">🐾 ${truncateText(petName, 18)}</text>
    </svg>
  `;
}

/**
 * 2. Player Profile Card (800x500)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateProfileSvg(user = {}) {
  const username = user.username ? `@${escapeSvg(user.username)}` : escapeSvg(user.firstName || 'Adventurer');
  const title = escapeSvg(user.title || 'Novice Adventurer');
  const level = Math.max(1, user.level || 1);
  const currentXp = user.xp || 0;
  const requiredXp = getRequiredPlayerXp(level);
  const playerPercent = calculateProgressPercent(currentXp, requiredXp);
  const coins = formatNumber(user.coins || 0);

  const skills = [
    { name: 'Woodcutting', icon: '🌲', data: user.skills?.woodcutting || { level: 1, xp: 0 } },
    { name: 'Mining', icon: '⛏️', data: user.skills?.mining || { level: 1, xp: 0 } },
    { name: 'Crafting', icon: '🔨', data: user.skills?.crafting || { level: 1, xp: 0 } },
    { name: 'Fishing', icon: '🎣', data: user.skills?.fishing || { level: 1, xp: 0 } }
  ];

  const skillCards = skills.map((s, index) => {
    const x = 50 + (index % 2) * 360;
    const y = 260 + Math.floor(index / 2) * 105;
    const skLevel = s.data.level || 1;
    const skXp = s.data.xp || 0;
    const reqXp = getRequiredSkillXp(skLevel);
    const skPercent = calculateProgressPercent(skXp, reqXp);

    return `
      <g transform="translate(${x}, ${y})">
        <rect width="340" height="90" fill="url(#glassPanel)" rx="12" stroke="#334155" stroke-width="1" />
        <circle cx="45" cy="45" r="25" fill="#1e293b" stroke="#64748b" stroke-width="1.5" />
        <text x="45" y="52" font-family="sans-serif" font-size="20" text-anchor="middle">${s.icon}</text>
        <text x="85" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">${s.name}</text>
        <text x="315" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#38bdf8" text-anchor="end">Lv ${skLevel}</text>
        <rect x="85" y="52" width="230" height="8" fill="#0f172a" rx="4" />
        <rect x="85" y="52" width="${Math.round((skPercent / 100) * 230)}" height="8" fill="url(#barGradient)" rx="4" />
        <text x="85" y="74" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#94a3b8">XP: ${formatNumber(skXp)} / ${formatNumber(reqXp)} (${skPercent}%)</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="500" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="496" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Top Identity Header -->
      <rect x="40" y="30" width="720" height="195" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />
      <circle cx="110" cy="110" r="48" fill="#312e81" stroke="#f59e0b" stroke-width="3" />
      <text x="110" y="122" font-family="sans-serif" font-size="38" text-anchor="middle">👑</text>

      <text x="180" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#f8fafc">${truncateText(username, 16)}</text>
      <text x="180" y="120" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#fde68a">${truncateText(title, 24)}</text>
      <text x="180" y="150" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#facc15">🪙 ${coins} Coins</text>

      <!-- Overall Level & Progress -->
      <rect x="520" y="55" width="220" height="140" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#334155" stroke-width="1" />
      <text x="630" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#94a3b8" text-anchor="middle">HERO MASTERY</text>
      <text x="630" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#38bdf8" text-anchor="middle">Lv ${level}</text>
      <rect x="540" y="148" width="180" height="8" fill="#1e293b" rx="4" />
      <rect x="540" y="148" width="${Math.round((playerPercent / 100) * 180)}" height="8" fill="url(#barGradient)" rx="4" />
      <text x="630" y="172" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle">XP: ${formatNumber(currentXp)} / ${formatNumber(requiredXp)}</text>

      <!-- Skills Grid Section Title -->
      <text x="50" y="248" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#94a3b8" letter-spacing="1">REALM CRAFTS &amp; GATHERING PROFICIENCIES</text>

      <!-- Skills Matrix -->
      ${skillCards}
    </svg>
  `;
}

/**
 * 3. Inventory Grid Card (800x450)
 * @param {Object} user
 * @param {number} [page=1]
 * @returns {string} SVG String
 */
export function generateInventorySvg(user = {}, page = 1) {
  const username = user.username ? `@${escapeSvg(user.username)}` : escapeSvg(user.firstName || 'Adventurer');
  const inventory = Array.isArray(user.inventory) ? user.inventory : [];
  const tools = Array.isArray(user.tools) ? user.tools : [];

  const allSlots = [
    ...tools.map(t => ({ name: t.toolType || 'Tool', qty: `T${t.tier}`, icon: '⚒️', sub: `${t.durability}/${t.maxDurability} Dur` })),
    ...inventory.map(i => ({ name: i.itemId.replace(/_/g, ' '), qty: `x${i.quantity}`, icon: '📦', sub: 'Resource' }))
  ];

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(allSlots.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const offset = (currentPage - 1) * pageSize;
  const currentSlots = allSlots.slice(offset, offset + pageSize);

  const gridSlots = [];
  for (let i = 0; i < pageSize; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 50 + col * 180;
    const y = 90 + row * 140;
    const slot = currentSlots[i];

    if (slot) {
      gridSlots.push(`
        <g transform="translate(${x}, ${y})">
          <rect width="165" height="125" fill="url(#glassPanel)" rx="12" stroke="#334155" stroke-width="1.5" />
          <circle cx="82" cy="40" r="22" fill="#1e293b" stroke="#64748b" stroke-width="1" />
          <text x="82" y="47" font-family="sans-serif" font-size="18" text-anchor="middle">${slot.icon}</text>
          <text x="82" y="78" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#f8fafc" text-anchor="middle">${truncateText(slot.name, 14)}</text>
          <text x="82" y="96" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#38bdf8" text-anchor="middle">${slot.qty}</text>
          <text x="82" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">${slot.sub}</text>
        </g>
      `);
    } else {
      gridSlots.push(`
        <g transform="translate(${x}, ${y})">
          <rect width="165" height="125" fill="#0f172a" fill-opacity="0.4" rx="12" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
          <text x="82" y="68" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#475569" text-anchor="middle">Empty Slot</text>
        </g>
      `);
    }
  }

  return `
    <svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="450" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="446" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Header -->
      <text x="50" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#f8fafc" letter-spacing="2">BACKPACK INVENTORY</text>
      <text x="750" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#94a3b8" text-anchor="end">Page ${currentPage} / ${totalPages}</text>

      ${gridSlots.join('')}

      <!-- Footer Bar -->
      <rect x="40" y="395" width="720" height="35" fill="url(#glassPanel)" rx="8" />
      <text x="60" y="418" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">Owner: ${truncateText(username, 16)}</text>
      <text x="740" y="418" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#facc15" text-anchor="end">Total Stored: ${allSlots.length} Items</text>
    </svg>
  `;
}

/**
 * 4. Leaderboard Podium Card (800x500)
 * @param {Array<Object>} leaderboardData
 * @returns {string} SVG String
 */
export function generateLeaderboardSvg(leaderboardData = []) {
  const list = Array.isArray(leaderboardData) ? leaderboardData : [];
  const top1 = list[0] || { name: 'Champion', score: 0, level: 1 };
  const top2 = list[1] || { name: 'Contender', score: 0, level: 1 };
  const top3 = list[2] || { name: 'Challenger', score: 0, level: 1 };

  return `
    <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="500" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="496" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Header -->
      <text x="400" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="3">HALL OF LEGENDS</text>
      <text x="400" y="80" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="middle">TOP REALM ADVENTURERS</text>

      <!-- Podium Columns -->
      <!-- Rank 2: Silver (Left) -->
      <rect x="100" y="220" width="180" height="230" fill="url(#glassPanel)" rx="16" stroke="#94a3b8" stroke-width="2" />
      <circle cx="190" cy="180" r="38" fill="#1e293b" stroke="#cbd5e1" stroke-width="3" />
      <text x="190" y="192" font-family="sans-serif" font-size="28" text-anchor="middle">🥈</text>
      <text x="190" y="255" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#f8fafc" text-anchor="middle">${truncateText(top2.name, 12)}</text>
      <text x="190" y="280" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="middle">Lv ${top2.level || 1}</text>
      <text x="190" y="320" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#e2e8f0" text-anchor="middle">${formatNumber(top2.score)}</text>

      <!-- Rank 1: Gold (Center MVP) -->
      <rect x="310" y="160" width="180" height="290" fill="url(#glassPanel)" rx="16" stroke="#f59e0b" stroke-width="3" />
      <circle cx="400" cy="115" r="44" fill="#312e81" stroke="#f59e0b" stroke-width="4" />
      <text x="400" y="128" font-family="sans-serif" font-size="34" text-anchor="middle">🥇</text>
      <text x="400" y="200" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#fef08a" text-anchor="middle">${truncateText(top1.name, 12)}</text>
      <text x="400" y="225" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#fcd34d" text-anchor="middle">👑 Lv ${top1.level || 1}</text>
      <text x="400" y="270" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#facc15" text-anchor="middle">${formatNumber(top1.score)}</text>

      <!-- Rank 3: Bronze (Right) -->
      <rect x="520" y="250" width="180" height="200" fill="url(#glassPanel)" rx="16" stroke="#d97706" stroke-width="2" />
      <circle cx="610" cy="210" r="38" fill="#1e293b" stroke="#f59e0b" stroke-width="3" />
      <text x="610" y="222" font-family="sans-serif" font-size="28" text-anchor="middle">🥉</text>
      <text x="610" y="285" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#f8fafc" text-anchor="middle">${truncateText(top3.name, 12)}</text>
      <text x="610" y="310" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="middle">Lv ${top3.level || 1}</text>
      <text x="610" y="350" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#f59e0b" text-anchor="middle">${formatNumber(top3.score)}</text>
    </svg>
  `;
}

/**
 * 5. Category Card 1: Gathering & Harvest (800x400)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateGatheringCategorySvg(user = {}) {
  const woodLvl = user?.skills?.woodcutting?.level || 1;
  const mineLvl = user?.skills?.mining?.level || 1;
  const fishLvl = user?.skills?.fishing?.level || 1;

  return `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="400" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="396" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Main Category Banner Header -->
      <text x="400" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#4ade80" text-anchor="middle" letter-spacing="3">🌲 GATHERING &amp; HARVEST</text>
      <text x="400" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#fde68a" text-anchor="middle" letter-spacing="2">Explore • Gather • Discover</text>

      <!-- Glass Content Showcase -->
      <rect x="40" y="115" width="720" height="200" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />

      <!-- 4 Gathering Biome Badges -->
      <g transform="translate(65, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#22c55e" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#14532d" stroke="#4ade80" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🌳</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Forest</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#86efac" text-anchor="middle">Oak &amp; Birch</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/chop • Wood</text>
      </g>

      <g transform="translate(235, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#64748b" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#1e293b" stroke="#94a3b8" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🪨</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Quarry</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle">Granite &amp; Iron</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/mine • Stone</text>
      </g>

      <g transform="translate(405, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">⛏️</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Deep Mines</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#7dd3fc" text-anchor="middle">Mithril &amp; Gold</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Vein Delve</text>
      </g>

      <g transform="translate(575, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#06b6d4" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#164e63" stroke="#22d3ee" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🌊</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">River Rane</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#67e8f9" text-anchor="middle">Fish &amp; Relics</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/fish • Aquatic</text>
      </g>

      <!-- Footer Masteries Bar -->
      <rect x="40" y="330" width="720" height="45" fill="#090d16" fill-opacity="0.9" rx="10" stroke="#1e293b" stroke-width="1" />
      <text x="70" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#cbd5e1">🌲 Woodcutting Lv ${woodLvl}</text>
      <text x="320" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#cbd5e1">⛏️ Mining Lv ${mineLvl}</text>
      <text x="560" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#cbd5e1">🎣 Fishing Lv ${fishLvl}</text>
    </svg>
  `;
}

/**
 * 6. Category Card 2: Blacksmith & Equipment (800x400)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateBlacksmithCategorySvg(user = {}) {
  const craftLvl = user?.skills?.crafting?.level || 1;

  return `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="400" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="396" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Main Category Banner Header -->
      <text x="400" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#f97316" text-anchor="middle" letter-spacing="3">⚒️ BLACKSMITH &amp; EQUIPMENT</text>
      <text x="400" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#fde68a" text-anchor="middle" letter-spacing="2">Craft • Repair • Upgrade</text>

      <!-- Glass Content Showcase -->
      <rect x="40" y="115" width="720" height="200" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />

      <!-- 5-Tier Tool Progression Pipeline -->
      <g transform="translate(60, 135)">
        <rect width="115" height="155" fill="#0f172a" fill-opacity="0.85" rx="10" stroke="#78350f" stroke-width="1.5" />
        <circle cx="57" cy="40" r="22" fill="#451a03" stroke="#b45309" stroke-width="1.5" />
        <text x="57" y="47" font-family="sans-serif" font-size="20" text-anchor="middle">🪵</text>
        <text x="57" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc" text-anchor="middle">Tier 1</text>
        <text x="57" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#fcd34d" text-anchor="middle">Wooden</text>
        <text x="57" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">30 Max Dur</text>
      </g>

      <g transform="translate(195, 135)">
        <rect width="115" height="155" fill="#0f172a" fill-opacity="0.85" rx="10" stroke="#64748b" stroke-width="1.5" />
        <circle cx="57" cy="40" r="22" fill="#334155" stroke="#94a3b8" stroke-width="1.5" />
        <text x="57" y="47" font-family="sans-serif" font-size="20" text-anchor="middle">🪨</text>
        <text x="57" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc" text-anchor="middle">Tier 2</text>
        <text x="57" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle">Stone</text>
        <text x="57" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">60 Max Dur</text>
      </g>

      <g transform="translate(330, 135)">
        <rect width="115" height="155" fill="#0f172a" fill-opacity="0.85" rx="10" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="57" cy="40" r="22" fill="#075985" stroke="#38bdf8" stroke-width="1.5" />
        <text x="57" y="47" font-family="sans-serif" font-size="20" text-anchor="middle">⚔️</text>
        <text x="57" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc" text-anchor="middle">Tier 3</text>
        <text x="57" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#7dd3fc" text-anchor="middle">Iron</text>
        <text x="57" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">120 Max Dur</text>
      </g>

      <g transform="translate(465, 135)">
        <rect width="115" height="155" fill="#0f172a" fill-opacity="0.85" rx="10" stroke="#eab308" stroke-width="1.5" />
        <circle cx="57" cy="40" r="22" fill="#854d0e" stroke="#facc15" stroke-width="1.5" />
        <text x="57" y="47" font-family="sans-serif" font-size="20" text-anchor="middle">👑</text>
        <text x="57" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc" text-anchor="middle">Tier 4</text>
        <text x="57" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#fde047" text-anchor="middle">Gold</text>
        <text x="57" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">240 Max Dur</text>
      </g>

      <g transform="translate(600, 135)">
        <rect width="115" height="155" fill="#0f172a" fill-opacity="0.85" rx="10" stroke="#a855f7" stroke-width="1.5" />
        <circle cx="57" cy="40" r="22" fill="#581c87" stroke="#c084fc" stroke-width="1.5" />
        <text x="57" y="47" font-family="sans-serif" font-size="20" text-anchor="middle">💎</text>
        <text x="57" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc" text-anchor="middle">Tier 5</text>
        <text x="57" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#e9d5ff" text-anchor="middle">Diamond</text>
        <text x="57" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">500 Max Dur</text>
      </g>

      <!-- Footer Crafting Stats Bar -->
      <rect x="40" y="330" width="720" height="45" fill="#090d16" fill-opacity="0.9" rx="10" stroke="#1e293b" stroke-width="1" />
      <text x="80" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#fb923c">🔨 Crafting Mastery: Lv ${craftLvl}</text>
      <text x="700" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#fde68a" text-anchor="end">🛠️ Instant Tool Repair Available</text>
    </svg>
  `;
}

/**
 * 7. Category Card 3: Economy & Trading (800x400)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateEconomyCategorySvg(user = {}) {
  const coins = formatNumber(user?.coins || 0);
  const invCount = user?.inventory?.length || 0;

  return `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="400" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="396" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Main Category Banner Header -->
      <text x="400" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#facc15" text-anchor="middle" letter-spacing="3">🎒 ECONOMY &amp; TRADING</text>
      <text x="400" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#fde68a" text-anchor="middle" letter-spacing="2">Trade • Sell • Gift</text>

      <!-- Glass Content Showcase -->
      <rect x="40" y="115" width="720" height="200" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />

      <!-- 4 Economy Pillars -->
      <g transform="translate(65, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#f59e0b" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#78350f" stroke="#fbbf24" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🏪</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Market Hub</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#fde68a" text-anchor="middle">Global Orders</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/market</text>
      </g>

      <g transform="translate(235, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#10b981" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#064e3b" stroke="#34d399" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">💰</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Sell Items</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#a7f3d0" text-anchor="middle">List for Coins</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/sell &lt;item&gt; &lt;qty&gt;</text>
      </g>

      <g transform="translate(405, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#ec4899" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#831843" stroke="#f472b6" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🎁</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Friend Gifts</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#fbcfe8" text-anchor="middle">Share Materials</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/gift @user &lt;item&gt;</text>
      </g>

      <g transform="translate(575, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#8b5cf6" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#4c1d95" stroke="#a78bfa" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🏆</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Leaderboard</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#ddd6fe" text-anchor="middle">Realm Champions</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Rankings</text>
      </g>

      <!-- Footer Treasury Bar -->
      <rect x="40" y="330" width="720" height="45" fill="#090d16" fill-opacity="0.9" rx="10" stroke="#1e293b" stroke-width="1" />
      <text x="70" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#facc15">🪙 Treasury Balance: ${coins} Coins</text>
      <text x="710" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#94a3b8" text-anchor="end">📦 Backpack: ${invCount} Resource Stacks</text>
    </svg>
  `;
}

/**
 * 8. Category Card 4: 3D Voxel Base & Multiplayer (800x400)
 * @param {Object} user
 * @returns {string} SVG String
 */
export function generateBaseCategorySvg(user = {}) {
  const level = user?.level || 1;
  const activePetDef = getPetDefinition(user?.activePet);
  const petName = activePetDef ? activePetDef.name : 'No Companion';

  return `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="400" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="396" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Main Category Banner Header -->
      <text x="400" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="3">🏰 3D VOXEL WORLD</text>
      <text x="400" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#fde68a" text-anchor="middle" letter-spacing="2">Build • Explore • Raid</text>

      <!-- Glass Content Showcase -->
      <rect x="40" y="115" width="720" height="200" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />

      <!-- 4 Voxel World Modules -->
      <g transform="translate(65, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#0ea5e9" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#075985" stroke="#38bdf8" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🏗️</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">3D Voxel Base</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#7dd3fc" text-anchor="middle">10,000+ Blocks</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Mini App Sandbox</text>
      </g>

      <g transform="translate(235, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#ef4444" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#7f1d1d" stroke="#f87171" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">⚔️</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Titan Raid</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#fca5a5" text-anchor="middle">Colossus Boss</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/boss • Group Chat</text>
      </g>

      <g transform="translate(405, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#10b981" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#064e3b" stroke="#34d399" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🗺️</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">5 Biomes</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#6ee7b7" text-anchor="middle">15 Monster AI</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Combat Hunting</text>
      </g>

      <g transform="translate(575, 135)">
        <rect width="145" height="160" fill="#0f172a" fill-opacity="0.8" rx="12" stroke="#a855f7" stroke-width="1.5" />
        <circle cx="72" cy="45" r="26" fill="#581c87" stroke="#c084fc" stroke-width="2" />
        <text x="72" y="54" font-family="sans-serif" font-size="26" text-anchor="middle">🐾</text>
        <text x="72" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc" text-anchor="middle">Companion</text>
        <text x="72" y="118" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#e9d5ff" text-anchor="middle">${truncateText(petName, 12)}</text>
        <text x="72" y="138" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">/pets • Sanctuary</text>
      </g>

      <!-- Footer Multiplayer Bar -->
      <rect x="40" y="330" width="720" height="45" fill="#090d16" fill-opacity="0.9" rx="10" stroke="#1e293b" stroke-width="1" />
      <text x="70" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#38bdf8">👑 Hero Level: ${level}</text>
      <text x="710" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#fde68a" text-anchor="end">🎮 Telegram Mini App Synchronized</text>
    </svg>
  `;
}

export default {
  generateMainMenuSvg,
  generateProfileSvg,
  generateInventorySvg,
  generateLeaderboardSvg,
  generateGatheringCategorySvg,
  generateBlacksmithCategorySvg,
  generateEconomyCategorySvg,
  generateBaseCategorySvg
};
