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
    { name: 'Woodcutting', emoji: '🪓', state: user.skills?.woodcutting || { level: 1, xp: 0 } },
    { name: 'Mining', emoji: '⛏️', state: user.skills?.mining || { level: 1, xp: 0 } },
    { name: 'Crafting', emoji: '⚒️', state: user.skills?.crafting || { level: 1, xp: 0 } },
    { name: 'Fishing', emoji: '🎣', state: user.skills?.fishing || { level: 1, xp: 0 } },
    { name: 'Exploration', emoji: '🧭', state: user.skills?.exploration || { level: 1, xp: 0 } }
  ];

  const skillRows = skills.map((s, idx) => {
    const sLevel = s.state.level || 1;
    const sXp = s.state.xp || 0;
    const sReq = getRequiredSkillXp(sLevel);
    const sPct = calculateProgressPercent(sXp, sReq);
    const yPos = 210 + (idx * 52);

    return `
      <g transform="translate(420, ${yPos})">
        <text x="0" y="16" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#f1f5f9">${s.emoji} ${escapeSvg(s.name)}</text>
        <text x="320" y="16" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" text-anchor="end">Lv ${sLevel}</text>
        <rect x="0" y="24" width="320" height="8" fill="#1e293b" rx="4" />
        <rect x="0" y="24" width="${Math.round((sPct / 100) * 320)}" height="8" fill="url(#barGradient)" rx="4" />
      </g>
    `;
  }).join('');

  return `
    <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      ${getCommonSvgDefs()}
      <rect width="800" height="500" fill="url(#bgGradient)" rx="24" />
      <rect x="2" y="2" width="796" height="496" fill="none" stroke="url(#goldBorder)" stroke-width="3" rx="22" opacity="0.8" />

      <!-- Header -->
      <text x="50" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" letter-spacing="2">CHARACTER PROFILE</text>
      <text x="750" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#facc15" text-anchor="end">🪙 ${coins} Coins</text>

      <!-- Left Hero Card -->
      <rect x="40" y="85" width="340" height="380" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />
      <circle cx="210" cy="170" r="55" fill="#312e81" stroke="#f59e0b" stroke-width="4" />
      <text x="210" y="185" font-family="sans-serif" font-size="44" text-anchor="middle">🧙‍♂️</text>

      <text x="210" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#f8fafc" text-anchor="middle">${truncateText(username, 16)}</text>
      <text x="210" y="285" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#fbbf24" text-anchor="middle">👑 ${truncateText(title, 20)}</text>

      <!-- Player Level & XP Bar -->
      <rect x="70" y="325" width="280" height="110" fill="#0f172a" fill-opacity="0.7" rx="12" stroke="#334155" stroke-width="1" />
      <text x="90" y="355" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#38bdf8">Player Level ${level}</text>
      <text x="330" y="355" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="end">${currentXp} / ${requiredXp} XP</text>
      <rect x="90" y="375" width="240" height="12" fill="#1e293b" rx="6" />
      <rect x="90" y="375" width="${Math.round((playerPercent / 100) * 240)}" height="12" fill="url(#goldBar)" rx="6" />
      <text x="210" y="415" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">${playerPercent}% To Next Level</text>

      <!-- Right Skill Masteries Panel -->
      <rect x="400" y="85" width="360" height="380" fill="url(#glassPanel)" rx="16" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5" />
      <text x="425" y="125" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#f8fafc" letter-spacing="1">SKILL MASTERIES</text>
      <text x="425" y="150" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#94a3b8">Independent realm craft disciplines</text>

      ${skillRows}
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
  const items = Array.isArray(user.inventory) ? user.inventory : [];
  const tools = Array.isArray(user.tools) ? user.tools : [];
  const allSlots = [
    ...tools.map(t => ({ name: t.toolId.replace(/_/g, ' '), emoji: '🛠️', quantity: `T${t.tier}`, isTool: true })),
    ...items.map(i => ({ name: i.itemId.replace(/_/g, ' '), emoji: '📦', quantity: `x${i.quantity}`, isTool: false }))
  ];

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(allSlots.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));
  const visible = allSlots.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const gridSlots = [];
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 50 + (col * 180);
    const y = 110 + (row * 145);
    const item = visible[i];

    if (item) {
      gridSlots.push(`
        <g transform="translate(${x}, ${y})">
          <rect width="160" height="130" fill="url(#glassPanel)" rx="12" stroke="${item.isTool ? '#f59e0b' : '#38bdf8'}" stroke-width="1.5" />
          <circle cx="80" cy="50" r="28" fill="#1e293b" />
          <text x="80" y="60" font-family="sans-serif" font-size="28" text-anchor="middle">${item.emoji}</text>
          <text x="80" y="96" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#f8fafc" text-anchor="middle">${truncateText(item.name, 12)}</text>
          <text x="80" y="116" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="${item.isTool ? '#facc15' : '#38bdf8'}" text-anchor="middle">${item.quantity}</text>
        </g>
      `);
    } else {
      gridSlots.push(`
        <g transform="translate(${x}, ${y})">
          <rect width="160" height="130" fill="#0f172a" fill-opacity="0.4" rx="12" stroke="#334155" stroke-width="1" stroke-dasharray="4" />
          <text x="80" y="72" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#475569" text-anchor="middle">Empty Slot</text>
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

export default {
  generateMainMenuSvg,
  generateProfileSvg,
  generateInventorySvg,
  generateLeaderboardSvg
};
