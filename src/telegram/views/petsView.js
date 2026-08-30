import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { PET_CONFIG, PETS, getPetDefinition } from '../../engine/pets/petConfig.js';
import { getActivePetBuff } from '../../engine/pets/petEngine.js';
import { formatNumber, formatProgressBar } from './uiHelpers.js';

/**
 * Screen 1: Companion Pet Sanctuary Main Hub (/pets)
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderPetsHub(user) {
  const ownerId = String(user.telegramId);
  user.pets = user.pets || [];

  const petBuff = getActivePetBuff(user);
  let activeStatusLine = `_Koi companion pet active nahi hai._`;

  if (petBuff.petDef) {
    const statusEmoji = petBuff.active ? '🟢 (Buff Active)' : '🔴 (Hungry - Feed to activate)';
    activeStatusLine = `${petBuff.petDef.emoji} *${petBuff.petDef.name}* (${petBuff.happiness}%) ${statusEmoji}\n  • ✨ *Perk:* ${petBuff.petDef.perkDisplay}`;
  }

  const text = [
    `🐾 *ROYAL COMPANION PET SANCTUARY* 🐾`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⭐ *Active Companion:*`,
    `  ${activeStatusLine}`,
    '',
    `🪙 *Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    `🐾 *Owned Pets:* ${user.pets.length}/${Object.keys(PETS).length}`,
    '',
    `_Select an option:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🐾 My Pets', encodeCallback({ action: 'pet_list', ownerId, targetId: '1' })),
      Markup.button.callback('🛒 Adopt Pets', encodeCallback({ action: 'pet_adopt_shop', ownerId, targetId: '1' }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Owned Pets List
 * @param {Object} user
 * @param {number} [page=1]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderMyPetsList(user, page = 1) {
  const ownerId = String(user.telegramId);
  user.pets = user.pets || [];

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(user.pets.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const visiblePets = user.pets.slice(startIndex, startIndex + pageSize);

  const textLines = [
    `🐾 *YOUR COMPANION PETS* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Select a companion to inspect, feed, or set active:_`,
    ''
  ];

  if (user.pets.length === 0) {
    textLines.push(
      `_Aapke paas abhi koi pet nahi hai._`,
      `_Sanctuary se adopt karne ke liye tap karein:_ *🛒 Adopt Pets*`
    );
  }

  const petButtons = visiblePets.map(p => {
    const petDef = getPetDefinition(p.petId);
    const activeBadge = user.activePet === p.petId ? '⭐' : '';
    const label = `${petDef?.emoji || '🐾'} ${petDef?.name || p.petId} ${activeBadge} (${p.happiness || 0}%)`;
    return Markup.button.callback(
      label,
      encodeCallback({ action: 'pet_detail', ownerId, targetId: p.petId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < petButtons.length; i += 2) {
    keyboardRows.push(petButtons.slice(i, i + 2));
  }

  // Pagination Controls
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'pet_list', ownerId, targetId: String(currentPage - 1) })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'pet_list', ownerId, targetId: String(currentPage + 1) })));
    }
    keyboardRows.push(navRow);
  }

  keyboardRows.push([
    Markup.button.callback('🛒 Adopt More', encodeCallback({ action: 'pet_adopt_shop', ownerId, targetId: '1' })),
    Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_pets', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 3: Pet Adoption Sanctuary Shop
 * @param {Object} user
 * @param {number} [page=1]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderPetAdoptionShop(user, page = 1) {
  const ownerId = String(user.telegramId);
  user.pets = user.pets || [];

  const allPets = Object.values(PETS);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(allPets.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const visiblePets = allPets.slice(startIndex, startIndex + pageSize);

  const textLines = [
    `🛒 *PET ADOPTION SANCTUARY* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Befriend magical beasts with unique perks:_`,
    '',
    `🪙 *Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    ''
  ];

  const petButtons = visiblePets.map(p => {
    const isOwned = user.pets.some(op => op && op.petId === p.petId);
    const label = isOwned
      ? `${p.emoji} ${p.name} ✅`
      : `${p.emoji} ${p.name} (${p.priceCoins}c)`;
    return Markup.button.callback(
      label,
      encodeCallback({ action: 'pet_detail', ownerId, targetId: p.petId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < petButtons.length; i += 2) {
    keyboardRows.push(petButtons.slice(i, i + 2));
  }

  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'pet_adopt_shop', ownerId, targetId: String(currentPage - 1) })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'pet_adopt_shop', ownerId, targetId: String(currentPage + 1) })));
    }
    keyboardRows.push(navRow);
  }

  keyboardRows.push([
    Markup.button.callback('🐾 My Pets', encodeCallback({ action: 'pet_list', ownerId, targetId: '1' })),
    Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_pets', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 4: Pet Details, Feeding, and Equip/Unequip
 * @param {Object} user
 * @param {string} petId
 * @returns {{ text: string, keyboard: any }}
 */
export function renderPetDetails(user, petId) {
  const ownerId = String(user.telegramId);
  user.pets = user.pets || [];

  const petDef = getPetDefinition(petId);
  if (!petDef) {
    return {
      text: `⚠️ *Pet nahi mila.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_pets', ownerId }))]])
    };
  }

  const ownedPet = user.pets.find(p => p && p.petId === petDef.petId);
  const isOwned = Boolean(ownedPet);
  const isActive = user.activePet === petDef.petId;

  let text = '';
  const actionRow = [];

  if (isOwned) {
    const happiness = ownedPet.happiness || 0;
    const bar = formatProgressBar(happiness, PET_CONFIG.MAX_HAPPINESS, 8);
    const buffActive = happiness >= PET_CONFIG.MIN_HAPPINESS_FOR_FULL_BUFF;
    const statusText = buffActive ? '🟢 Active' : '🔴 Hungry';

    text = [
      `${petDef.emoji} *${petDef.name.toUpperCase()}* (${petDef.rarity.toUpperCase()})`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_${petDef.description}_`,
      '',
      `✨ *Perk:* ${petDef.perkDisplay}`,
      `🍗 *Happiness:* ${bar} ${statusText}`,
      `⭐ *Equipped:* ${isActive ? '🌟 Currently Active' : 'Inactive'}`,
      '',
      happiness < PET_CONFIG.MIN_HAPPINESS_FOR_FULL_BUFF
        ? `⚠️ *Pet hungry hai! Buff activate karne ke liye feed karein.*`
        : `_Pet is happy and active!_`
    ].join('\n');

    // Feeding button
    if (happiness < PET_CONFIG.MAX_HAPPINESS) {
      actionRow.push(Markup.button.callback(`🍖 Feed (${PET_CONFIG.FEED_COIN_COST}c)`, encodeCallback({ action: 'pet_feed_do', ownerId, targetId: petDef.petId })));
    }

    // Equip / Unequip button
    if (isActive) {
      actionRow.push(Markup.button.callback('🛑 Unequip', encodeCallback({ action: 'pet_equip_do', ownerId, targetId: 'none' })));
    } else {
      actionRow.push(Markup.button.callback('⭐ Set Active', encodeCallback({ action: 'pet_equip_do', ownerId, targetId: petDef.petId })));
    }
  } else {
    // Adoption Preview
    const canAfford = (user.coins || 0) >= petDef.priceCoins;
    const coinsCheck = canAfford ? '✅' : '❌';

    text = [
      `${petDef.emoji} *${petDef.name.toUpperCase()}* (${petDef.rarity.toUpperCase()})`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_${petDef.description}_`,
      '',
      `✨ *Perk:* ${petDef.perkDisplay}`,
      `🪙 *Adoption Cost:* ${petDef.priceCoins} Coins`,
      `💳 *Treasury:* ${formatNumber(user.coins || 0)} Coins ${coinsCheck}`
    ].join('\n');

    if (canAfford) {
      actionRow.push(Markup.button.callback(`🐾 Adopt (${petDef.priceCoins}c)`, encodeCallback({ action: 'pet_adopt_do', ownerId, targetId: petDef.petId })));
    }
  }

  actionRow.push(Markup.button.callback('⬅️ Back', encodeCallback({ action: 'pet_list', ownerId, targetId: '1' })));

  const keyboard = Markup.inlineKeyboard([actionRow]);

  return { text, keyboard };
}

/**
 * Screen 5: Action Outcome View
 * @param {Object} user
 * @param {Object} result
 * @param {'adopt'|'feed'|'equip'} actionType
 * @returns {{ text: string, keyboard: any }}
 */
export function renderPetActionResult(user, result, actionType) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      INSUFFICIENT_COINS: `🪙 *Coins kam hain!* Required: ${result.requiredCoins}c, Current: ${result.currentCoins}c.`,
      ALREADY_OWNED: `🐾 *Aap already is pet ke owner hain.*`,
      PET_NOT_OWNED: `⚠️ *Aapke paas yeh pet nahi hai.* Pehle adopt karein.`,
      ALREADY_FULL_HAPPINESS: `🍗 *Pet already 100% happy hai!*`,
      PET_NOT_FOUND: `⚠️ *Unknown pet identifier.*`
    };

    const text = [
      `⚠️ *PET ACTION FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Pet action nahi ho paya: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Pets', encodeCallback({ action: 'pet_list', ownerId, targetId: '1' }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Outcome
  let header = '';
  let desc = '';

  if (actionType === 'adopt') {
    header = `🎉 *COMPANION PET ADOPTED!*`;
    desc = `✅ ${result.petDef.emoji} *${result.petDef.name}* is now your companion!\n✨ *Perk:* ${result.petDef.perkDisplay}`;
  } else if (actionType === 'feed') {
    header = `🍖 *PET FED & ENERGIZED!*`;
    desc = `✅ Fed *${result.petName}*! Happiness restored to *${result.newHappiness}%*.`;
  } else if (actionType === 'equip') {
    if (result.activePet) {
      header = `⭐ *COMPANION EQUIPPED!*`;
      desc = `✅ ${result.petDef.emoji} *${result.petDef.name}* is now active!`;
    } else {
      header = `🛑 *COMPANION UNEQUIPPED!*`;
      desc = `_Active companion has been sent back to sanctuary._`;
    }
  }

  const text = [
    header,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    desc,
    '',
    `🪙 *Remaining Treasury:* ${formatNumber(user.coins || 0)} Coins`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🐾 Manage Pets', encodeCallback({ action: 'pet_list', ownerId, targetId: '1' })),
      Markup.button.callback('🌲 Go Exploring', encodeCallback({ action: 'nav_explore', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderPetsHub,
  renderMyPetsList,
  renderPetAdoptionShop,
  renderPetDetails,
  renderPetActionResult
};
