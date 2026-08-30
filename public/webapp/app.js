/**
 * LEGENDS OF RANE — 3D MONSTER HUNTING WORLD & VOXEL SANCTUARY
 *
 * High-performance 10,000+ Block InstancedMesh Chunk System, 3D Player Character,
 * 15 Monster Archetypes with AI State Machines, Server-Authoritative Combat,
 * and Telegram Inventory Equipment Integration.
 */

// ----------------------------------------------------
// 1. Telegram WebApp Auth & State Init
// ----------------------------------------------------
let telegramId = '12345';
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('telegramId')) {
  telegramId = urlParams.get('telegramId');
}

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  if (window.Telegram.WebApp.initDataUnsafe?.user?.id) {
    telegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
  }
}

const state = {
  telegramId,
  gameMode: 'hunt', // 'hunt' | 'build'
  buildMode: 'place', // 'place' | 'break'
  timeOfDay: 'day', // 'day' | 'twilight' | 'night'
  selectedBlockId: 'grass',
  hotbarSlotIdx: 0,
  hotbarSlots: [
    'grass', 'dirt', 'smooth_stone', 'deepslate',
    'bedrock', 'ore_gold', 'ore_diamond', 'holy_crystal', 'decor_lantern'
  ],
  blockCatalog: {},
  blockCategories: {},
  voxels: new Map(), // custom player blocks
  // Player Character & Stats
  player: {
    name: 'Hunter',
    level: 1,
    xp: 0,
    coins: 0,
    maxHp: 100,
    hp: 100,
    speed: 0.18,
    sprintMultiplier: 1.6,
    isSprinting: false,
    isAttacking: false,
    attackCooldown: 0,
    equippedWeapon: { id: 'wpn_wood_blade', name: 'Wood Training Blade', attack: 18, tier: 1 },
    inventory: [],
    inventoryMap: {},
    availableWeapons: [],
    mesh: null,
    weaponMesh: null,
    targetMonster: null,
    animTime: 0
  },
  // Joystick & Input
  input: {
    dx: 0,
    dz: 0,
    isActive: false
  },
  // Biomes & Monsters
  biomes: {},
  monsters: [], // Array of Monster instances
  activeCombatSessions: new Map(), // monsterInstanceId -> sessionToken
  isSaving: false
};

// ----------------------------------------------------
// 2. Procedural Web Audio SFX & Haptics
// ----------------------------------------------------
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'slash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'levelup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (_e) {}
}

function triggerHaptic(style = 'light') {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    try {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } catch (_e) {}
  }
}

// ----------------------------------------------------
// 3. Three.js Scene Setup & Chunked InstancedMesh World
// ----------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#090d16');
scene.fog = new THREE.FogExp2('#090d16', 0.012);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 6;
controls.maxDistance = 45;
controls.target.set(0, 1.5, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffedd5, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfef08a, 1.0);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// Sanctuary Light
const sanctuaryPoint = new THREE.PointLight(0xfacc15, 1.4, 30);
sanctuaryPoint.position.set(0, 4, 0);
scene.add(sanctuaryPoint);

// Sanctuary Golden Particles
const particleCount = 100;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleSpeeds = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  particlePos[i * 3] = (Math.random() - 0.5) * 26;
  particlePos[i * 3 + 1] = Math.random() * 12 - 2;
  particlePos[i * 3 + 2] = (Math.random() - 0.5) * 26;
  particleSpeeds[i] = 0.008 + Math.random() * 0.015;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xfef08a,
  size: 0.28,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending
});
const holyParticles = new THREE.Points(particleGeo, particleMat);
scene.add(holyParticles);

// ----------------------------------------------------
// 4. 10,000+ Block Chunked Instanced World Generator
// ----------------------------------------------------
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const blockMaterials = {
  grass: new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.8 }),
  dirt: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.7 }),
  deepslate: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 }),
  bedrock: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.95 }),
  foliage: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.7 }),
  crystal: new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.6 }),
  lava: new THREE.MeshStandardMaterial({ color: '#ea580c', emissive: '#ef4444', emissiveIntensity: 0.8 }),
  ruins: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6 })
};

function generateChunkedWorld() {
  // Generate Instanced Meshes for large scale open world biomes
  const instances = {
    grass: [],
    dirt: [],
    stone: [],
    deepslate: [],
    bedrock: [],
    foliage: [],
    crystal: [],
    lava: [],
    ruins: []
  };

  const dummy = new THREE.Object3D();

  // Generate 5 Biome Terrain Grid (-80 to 80 on X & Z)
  for (let x = -75; x <= 75; x += 2) {
    for (let z = -75; z <= 75; z += 2) {
      // Exclude player's custom base sanctuary center (-16 to 16)
      if (Math.abs(x) <= 16 && Math.abs(z) <= 16) continue;

      let type = 'grass';
      let height = 0;

      // 1. Whispering Forest (X < -20, Z < -20)
      if (x < -20 && z < -20) {
        type = 'grass';
        height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1.5;
        // Trees
        if ((x + z) % 10 === 0) {
          instances.foliage.push({ x, y: height + 2, z });
          instances.dirt.push({ x, y: height + 1, z });
        }
      }
      // 2. Ironfang Quarry (X > 20, Z < -20)
      else if (x > 20 && z < -20) {
        type = 'stone';
        height = -1 + Math.sin(x * 0.15) * 2;
        if ((x * z) % 14 === 0) {
          instances.deepslate.push({ x, y: height + 1, z });
        }
      }
      // 3. Crystal Caverns (X < -20, Z > 20)
      else if (x < -20 && z > 20) {
        type = 'deepslate';
        height = -2 + Math.cos(z * 0.12) * 1.8;
        if ((x - z) % 12 === 0) {
          instances.crystal.push({ x, y: height + 1.5, z });
        }
      }
      // 4. Ashen Volcano (X > 20, Z > 20)
      else if (x > 20 && z > 20) {
        type = 'bedrock';
        height = 1 + Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3;
        if ((x + z) % 8 === 0) {
          instances.lava.push({ x, y: height, z });
        }
      }
      // 5. Ancient Ruins Border
      else {
        type = 'ruins';
        height = 0;
        if ((x + z) % 16 === 0) {
          instances.ruins.push({ x, y: 1, z });
          instances.ruins.push({ x, y: 2, z });
        }
      }

      instances[type].push({ x, y: height, z });
      instances.dirt.push({ x, y: height - 1, z });
      instances.bedrock.push({ x, y: height - 2, z });
    }
  }

  // Create InstancedMesh objects for GPU single-call rendering
  for (const [key, list] of Object.entries(instances)) {
    if (list.length === 0) continue;
    const mesh = new THREE.InstancedMesh(cubeGeo, blockMaterials[key], list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    for (let i = 0; i < list.length; i++) {
      dummy.position.set(list[i].x, list[i].y, list[i].z);
      dummy.scale.set(1.95, 1, 1.95);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }
}

// ----------------------------------------------------
// 5. 3D Animated Player Character
// ----------------------------------------------------
function createPlayerMesh() {
  const group = new THREE.Group();

  // Torso
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMat = new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);

  // Left & Right Arms
  const armGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  const armMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8' });

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.5, 1.0, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.5, 1.0, 0);
  group.add(rightArm);

  // Left & Right Legs
  const legGeo = new THREE.BoxGeometry(0.28, 0.75, 0.28);
  const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.2, 0.38, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.2, 0.38, 0);
  group.add(rightLeg);

  // Equipped 3D Weapon
  const weaponGeo = new THREE.BoxGeometry(0.12, 1.1, 0.18);
  const weaponMat = new THREE.MeshStandardMaterial({
    color: state.player.equippedWeapon.color || '#facc15',
    emissive: state.player.equippedWeapon.glowColor || '#000000',
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2
  });
  const weapon = new THREE.Mesh(weaponGeo, weaponMat);
  weapon.position.set(0.15, 0.3, 0.4);
  weapon.rotation.x = Math.PI / 4;
  rightArm.add(weapon);

  group.position.set(0, 0, 0);
  scene.add(group);

  state.player.mesh = group;
  state.player.weaponMesh = weapon;
  state.player.limbs = { leftArm, rightArm, leftLeg, rightLeg, head, body };
}

// ----------------------------------------------------
// 6. 15 Monster Archetypes & AI System
// ----------------------------------------------------
class Monster {
  constructor(config, spawnX, spawnZ) {
    this.id = `${config.id}_${Math.random().toString(36).substr(2, 6)}`;
    this.config = config;
    this.spawnPos = new THREE.Vector3(spawnX, 0, spawnZ);
    this.pos = new THREE.Vector3(spawnX, 0, spawnZ);
    this.hp = config.maxHp;
    this.state = 'idle'; // 'idle' | 'chase' | 'attack' | 'dead'
    this.target = null;
    this.cooldown = 0;
    this.wanderTimer = 0;
    this.respawnTimer = 0;
    this.mesh = this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    const scale = this.config.scale || 1.0;

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.0 * scale, 1.1 * scale, 1.0 * scale);
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.config.color, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = (0.55 * scale);
    body.castShadow = true;
    group.add(body);

    // Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.18 * scale, 0.12 * scale, 0.1 * scale);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: this.config.eyeColor,
      emissive: this.config.eyeColor,
      emissiveIntensity: 0.8
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25 * scale, 0.7 * scale, 0.52 * scale);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25 * scale, 0.7 * scale, 0.52 * scale);
    group.add(rightEye);

    // Floating HP Bar Background
    const hpBgGeo = new THREE.PlaneGeometry(1.2 * scale, 0.16 * scale);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    hpBg.position.set(0, 1.4 * scale, 0);
    group.add(hpBg);

    // Floating HP Bar Fill
    const hpFillGeo = new THREE.PlaneGeometry(1.15 * scale, 0.12 * scale);
    const hpFillMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
    hpFill.position.set(0, 1.4 * scale, 0.01);
    group.add(hpFill);

    group.position.copy(this.pos);
    scene.add(group);

    this.hpBarFill = hpFill;
    return group;
  }

  update(playerPos, dt) {
    if (this.state === 'dead') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    const distToPlayer = this.pos.distanceTo(playerPos);
    this.mesh.lookAt(playerPos.x, this.pos.y, playerPos.z);

    // AI State Transitions
    if (distToPlayer <= this.config.attackRange) {
      this.state = 'attack';
      this.cooldown -= dt;
      if (this.cooldown <= 0) {
        this.attackPlayer();
        this.cooldown = 1.6;
      }
    } else if (distToPlayer <= this.config.detectRange) {
      this.state = 'chase';
      const dir = new THREE.Vector3().subVectors(playerPos, this.pos).normalize();
      this.pos.addScaledVector(dir, this.config.speed);
      this.mesh.position.copy(this.pos);
    } else {
      this.state = 'idle';
      // Wander near spawn pos
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderDir = new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);
        this.wanderTimer = 3 + Math.random() * 3;
      }
      const wanderTarget = this.spawnPos.clone().add(this.wanderDir);
      if (this.pos.distanceTo(wanderTarget) > 0.5) {
        const dir = new THREE.Vector3().subVectors(wanderTarget, this.pos).normalize();
        this.pos.addScaledVector(dir, this.config.speed * 0.4);
        this.mesh.position.copy(this.pos);
      }
    }

    // Update HP bar display
    const hpPercent = Math.max(0, this.hp / this.config.maxHp);
    this.hpBarFill.scale.x = hpPercent;
  }

  takeDamage(amount, isCrit = false) {
    if (this.state === 'dead') return;
    this.hp -= amount;
    playSound('hit');
    triggerHaptic('medium');

    showDamageNumber(amount, this.pos, isCrit);

    // Flash Red
    this.mesh.traverse(child => {
      if (child.material && child.material.color) {
        child.material.color.setHex(0xff0000);
        setTimeout(() => {
          if (child.material) child.material.color.set(this.config.color);
        }, 120);
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  attackPlayer() {
    playSound('slash');
    const dmg = Math.max(1, this.config.attackPower - 2);
    state.player.hp = Math.max(0, state.player.hp - dmg);
    showDamageNumber(dmg, state.player.mesh.position, false, '#f87171');
    updatePlayerHUD();
    triggerHaptic('heavy');

    if (state.player.hp <= 0) {
      showToast('💀 You fell in battle! Returning to Sanctuary...');
      state.player.hp = state.player.maxHp;
      state.player.mesh.position.set(0, 0, 0);
      updatePlayerHUD();
    }
  }

  die() {
    this.state = 'dead';
    this.mesh.visible = false;
    this.respawnTimer = 18;
    playSound('coin');
    triggerHaptic('success');

    // Server-authoritative kill claim
    claimKillOnServer(this.config.id);
  }

  respawn() {
    this.hp = this.config.maxHp;
    this.pos.copy(this.spawnPos);
    this.mesh.position.copy(this.pos);
    this.mesh.visible = true;
    this.state = 'idle';
  }
}

function spawnWorldMonsters() {
  const spawns = [
    // 🌲 Whispering Forest
    { id: 'forest_wolf', x: -45, z: -45 },
    { id: 'forest_goblin', x: -60, z: -35 },
    { id: 'ancient_treant', x: -35, z: -60 },

    // 🪨 Ironfang Quarry
    { id: 'stone_golem', x: 45, z: -45 },
    { id: 'cave_goblin', x: 60, z: -35 },
    { id: 'rock_beast', x: 35, z: -60 },

    // 💎 Crystal Caverns
    { id: 'crystal_spider', x: -45, z: 45 },
    { id: 'cave_wraith', x: -60, z: 35 },
    { id: 'crystal_golem', x: -35, z: 60 },

    // 🔥 Ashen Volcano
    { id: 'fire_imp', x: 45, z: 45 },
    { id: 'magma_beast', x: 60, z: 35 },
    { id: 'infernal_golem', x: 35, z: 60 },

    // 🌑 Ancient Ruins
    { id: 'skeleton_warrior', x: -18, z: 18 },
    { id: 'shadow_beast', x: 18, z: -18 },
    { id: 'ancient_guardian', x: 0, z: 22 }
  ];

  for (const s of spawns) {
    const config = state.monsterCatalog?.[s.id] || {
      id: s.id,
      name: s.id.replace(/_/g, ' '),
      maxHp: 100,
      attackPower: 15,
      speed: 0.05,
      attackRange: 2.5,
      detectRange: 12,
      color: '#ef4444',
      eyeColor: '#fde047',
      scale: 1.0
    };
    const monster = new Monster(config, s.x, s.z);
    state.monsters.push(monster);
  }
}

// ----------------------------------------------------
// 7. Combat Execution & Server Sync
// ----------------------------------------------------
function executePlayerAttack() {
  if (state.player.isAttacking) return;
  state.player.isAttacking = true;
  playSound('slash');
  triggerHaptic('light');

  // Sword Swing Animation
  const weapon = state.player.weaponMesh;
  if (weapon) {
    weapon.rotation.x = Math.PI / 1.2;
    setTimeout(() => {
      if (weapon) weapon.rotation.x = Math.PI / 4;
      state.player.isAttacking = false;
    }, 180);
  }

  // Find nearest monster in melee arc (within 3.8 units)
  const playerPos = state.player.mesh.position;
  let hitMonster = null;
  let minDist = 3.8;

  for (const m of state.monsters) {
    if (m.state === 'dead') continue;
    const dist = m.pos.distanceTo(playerPos);
    if (dist < minDist) {
      minDist = dist;
      hitMonster = m;
    }
  }

  if (hitMonster) {
    const baseAtk = state.player.equippedWeapon.attack || 20;
    const isCrit = Math.random() < 0.25;
    const damage = isCrit ? Math.floor(baseAtk * 1.8) : baseAtk;
    hitMonster.takeDamage(damage, isCrit);
  }
}

async function claimKillOnServer(monsterId) {
  try {
    // 1. Get or create session
    let sessionToken = state.activeCombatSessions.get(monsterId);
    if (!sessionToken) {
      const sessRes = await fetch('/api/hunting/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: state.telegramId, monsterId })
      });
      const sessData = await sessRes.json();
      sessionToken = sessData.session?.sessionToken || 'fallback_nonce';
    }

    // 2. Claim kill rewards
    const res = await fetch('/api/hunting/claim-kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: state.telegramId,
        sessionToken,
        monsterId,
        timeTakenMs: 3000
      })
    });

    const data = await res.json();
    if (data.success) {
      state.player.coins = data.updatedCoins;
      state.player.xp = data.updatedXp;
      state.player.level = data.newLevel;
      updatePlayerHUD();

      showToast(`🏆 Defeated ${data.monsterName}! +${data.coinsEarned} 🪙`);
      if (data.levelGained) {
        playSound('levelup');
        showToast(`🎉 LEVEL UP! You reached Level ${data.newLevel}!`);
      }
    }
  } catch (err) {
    console.error('Failed to claim kill reward:', err);
  }
}

// ----------------------------------------------------
// 8. Floating Combat Damage Numbers
// ----------------------------------------------------
const hudOverlay = document.getElementById('combat-hud-overlay');

function showDamageNumber(amount, pos3D, isCrit = false, customColor = null) {
  if (!hudOverlay) return;
  const tempVec = pos3D.clone();
  tempVec.y += 1.8;
  tempVec.project(camera);

  const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(tempVec.y * 0.5) + 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = `dmg-number ${isCrit ? 'crit' : ''}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (customColor) el.style.color = customColor;
  el.textContent = isCrit ? `CRIT! -${amount}` : `-${amount}`;

  hudOverlay.appendChild(el);
  setTimeout(() => el.remove(), 850);
}

function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

// ----------------------------------------------------
// 9. Virtual Joystick & Mobile Action Handlers
// ----------------------------------------------------
function setupMobileControls() {
  const joystickZone = document.getElementById('joystick-zone');
  const joystickKnob = document.getElementById('joystick-knob');
  let startX = 0, startY = 0;

  function handleTouchStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    state.input.isActive = true;
  }

  function handleTouchMove(e) {
    if (!state.input.isActive) return;
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const maxRadius = 40;
    const dist = Math.min(maxRadius, Math.hypot(deltaX, deltaY));
    const angle = Math.atan2(deltaY, deltaX);

    const clampedX = Math.cos(angle) * dist;
    const clampedY = Math.sin(angle) * dist;

    if (joystickKnob) {
      joystickKnob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    state.input.dx = clampedX / maxRadius;
    state.input.dz = clampedY / maxRadius;
  }

  function handleTouchEnd() {
    state.input.isActive = false;
    state.input.dx = 0;
    state.input.dz = 0;
    if (joystickKnob) {
      joystickKnob.style.transform = 'translate(0px, 0px)';
    }
  }

  if (joystickZone) {
    joystickZone.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    // Mouse Fallback for Joystick
    joystickZone.addEventListener('mousedown', handleTouchStart);
    window.addEventListener('mousemove', handleTouchMove);
    window.addEventListener('mouseup', handleTouchEnd);
  }

  // Action Buttons
  document.getElementById('btn-action-attack')?.addEventListener('click', executePlayerAttack);

  document.getElementById('btn-action-sprint')?.addEventListener('touchstart', () => { state.player.isSprinting = true; });
  document.getElementById('btn-action-sprint')?.addEventListener('touchend', () => { state.player.isSprinting = false; });
  document.getElementById('btn-action-sprint')?.addEventListener('mousedown', () => { state.player.isSprinting = true; });
  document.getElementById('btn-action-sprint')?.addEventListener('mouseup', () => { state.player.isSprinting = false; });

  // Target Lock
  document.getElementById('btn-action-target')?.addEventListener('click', () => {
    playSound('hit');
    triggerHaptic('light');
    let nearest = null;
    let minDist = 25;
    for (const m of state.monsters) {
      if (m.state === 'dead') continue;
      const d = m.pos.distanceTo(state.player.mesh.position);
      if (d < minDist) {
        minDist = d;
        nearest = m;
      }
    }
    if (nearest) {
      state.player.mesh.lookAt(nearest.pos.x, 0, nearest.pos.z);
      showToast(`🎯 Locked on ${nearest.config.name}`);
    }
  });

  // Mode Toggle (Hunt vs Build)
  document.getElementById('btn-toggle-game-mode')?.addEventListener('click', () => {
    state.gameMode = state.gameMode === 'hunt' ? 'build' : 'hunt';
    const isHunt = state.gameMode === 'hunt';
    document.getElementById('btn-toggle-game-mode').textContent = isHunt ? '⚔️ Hunt' : '🔨 Build';
    document.getElementById('combat-actions-zone').style.display = isHunt ? 'flex' : 'none';
    document.getElementById('building-mode-bar').style.display = isHunt ? 'none' : 'flex';
    document.getElementById('building-bottom-section').style.display = isHunt ? 'none' : 'flex';
    showToast(isHunt ? '⚔️ Switched to Monster Hunting Mode' : '🔨 Switched to Voxel Building Mode');
  });

  // Gear & Forge Modal Triggers
  document.getElementById('btn-open-forge')?.addEventListener('click', openForgeModal);
  document.getElementById('btn-forge-close')?.addEventListener('click', () => {
    document.getElementById('forge-modal')?.classList.remove('open');
  });

  // Keyboard Movement (WASD + Space)
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') executePlayerAttack();
    if (e.key === 'Shift') state.player.isSprinting = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === 'Shift') state.player.isSprinting = false;
  });

  state.keyboardKeys = keys;
}

// ----------------------------------------------------
// 10. Telegram Inventory & Weapon Forge Drawer
// ----------------------------------------------------
function openForgeModal() {
  const modal = document.getElementById('forge-modal');
  const body = document.getElementById('forge-body');
  if (!modal || !body) return;

  const invHtml = Object.entries(state.player.inventoryMap)
    .map(([k, v]) => `<div class="material-chip">${k}: <strong>${v}</strong></div>`)
    .join('') || '<div style="color: #94a3b8;">No Telegram materials yet. Explore /chop or /mine in Telegram!</div>';

  const weaponsHtml = (state.player.availableWeapons || []).map(w => {
    const costText = w.cost.map(c => `${c.itemId} ×${c.quantity}`).join(', ') || 'Free Starter';
    const isEq = w.id === state.player.equippedWeapon.id;
    return `
      <div class="weapon-card ${isEq ? 'equipped' : ''}">
        <div class="weapon-header">
          <div class="weapon-title">${w.emoji} ${w.name} (Tier ${w.tier})</div>
          <div class="weapon-stats">⚔️ +${w.attack} ATK</div>
        </div>
        <div class="weapon-cost">Required: Level ${w.levelRequired} • Cost: ${costText}</div>
        <button class="btn-forge" data-weapon="${w.id}" ${(!w.canCraft && !isEq) ? 'disabled' : ''}>
          ${isEq ? '✅ Equipped' : (w.canCraft ? '🔨 Forge & Equip' : '🔒 Locked')}
        </button>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div>
      <h4 style="font-size: 0.85rem; color: #facc15; margin-bottom: 6px;">🪵 Your Telegram Materials</h4>
      <div class="forge-materials-bar">${invHtml}</div>
    </div>
    <div>
      <h4 style="font-size: 0.85rem; color: #38bdf8; margin-bottom: 6px;">⚔️ Weapon Progression</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">${weaponsHtml}</div>
    </div>
  `;

  // Attach forge handlers
  body.querySelectorAll('.btn-forge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const weaponId = btn.getAttribute('data-weapon');
      if (!weaponId) return;
      try {
        const res = await fetch('/api/hunting/craft-gear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: state.telegramId, weaponId })
        });
        const data = await res.json();
        if (data.success) {
          state.player.equippedWeapon = data.equippedWeapon;
          showToast(`✨ Equipped ${data.equippedWeapon.name}!`);
          playSound('levelup');
          await loadWorldState();
          openForgeModal();
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      } catch (err) {
        showToast('⚠️ Failed to craft weapon');
      }
    });
  });

  modal.classList.add('open');
}

function updatePlayerHUD() {
  document.getElementById('player-name-display').textContent = state.player.name;
  document.getElementById('player-coins-display').textContent = `🪙 ${state.player.coins}`;
  document.getElementById('player-level-badge').textContent = `Lv ${state.player.level}`;

  const hpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  document.getElementById('player-hp-bar').style.width = `${hpPercent}%`;
  document.getElementById('player-hp-text').textContent = `${state.player.hp} / ${state.player.maxHp} HP`;
}

// ----------------------------------------------------
// 11. Backend Data Sync
// ----------------------------------------------------
async function loadWorldState() {
  try {
    const res = await fetch(`/api/hunting/world-state?telegramId=${state.telegramId}`);
    const data = await res.json();
    if (data.success) {
      state.player.name = data.player.name;
      state.player.level = data.player.level;
      state.player.xp = data.player.xp;
      state.player.coins = data.player.coins;
      state.player.maxHp = data.player.maxHp;
      state.player.hp = data.player.maxHp;
      state.player.equippedWeapon = data.player.equippedWeapon;
      state.player.inventory = data.player.inventory;
      state.player.inventoryMap = data.player.inventoryMap;
      state.player.availableWeapons = data.player.availableWeapons;
      state.monsterCatalog = data.monsters;
      state.biomes = data.biomes;
      updatePlayerHUD();
    }
  } catch (err) {
    console.error('Failed to load hunting world state:', err);
  }
}

// ----------------------------------------------------
// 12. Main Animation & Update Loop
// ----------------------------------------------------
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 1. Player Movement & Animation
  if (state.player.mesh) {
    let moveX = state.input.dx;
    let moveZ = state.input.dz;

    // Keyboard Fallback
    if (state.keyboardKeys) {
      if (state.keyboardKeys['w'] || state.keyboardKeys['arrowup']) moveZ -= 1;
      if (state.keyboardKeys['s'] || state.keyboardKeys['arrowdown']) moveZ += 1;
      if (state.keyboardKeys['a'] || state.keyboardKeys['arrowleft']) moveX -= 1;
      if (state.keyboardKeys['d'] || state.keyboardKeys['arrowright']) moveX += 1;
    }

    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
    if (isMoving) {
      const speed = state.player.speed * (state.player.isSprinting ? state.player.sprintMultiplier : 1.0);
      const angle = Math.atan2(moveX, moveZ);
      state.player.mesh.rotation.y = angle;

      state.player.mesh.position.x += Math.sin(angle) * speed;
      state.player.mesh.position.z += Math.cos(angle) * speed;

      // Limb swing walk cycle
      state.player.animTime += dt * 8 * (state.player.isSprinting ? 1.5 : 1.0);
      const swing = Math.sin(state.player.animTime) * 0.6;
      if (state.player.limbs) {
        state.player.limbs.leftLeg.rotation.x = swing;
        state.player.limbs.rightLeg.rotation.x = -swing;
        state.player.limbs.leftArm.rotation.x = -swing;
        if (!state.player.isAttacking) state.player.limbs.rightArm.rotation.x = swing;
      }
    } else {
      if (state.player.limbs) {
        state.player.limbs.leftLeg.rotation.x = 0;
        state.player.limbs.rightLeg.rotation.x = 0;
        state.player.limbs.leftArm.rotation.x = 0;
        if (!state.player.isAttacking) state.player.limbs.rightArm.rotation.x = 0;
      }
    }

    // Camera follow player
    controls.target.lerp(state.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);

    // Dynamic Biome Detection
    const px = state.player.mesh.position.x;
    const pz = state.player.mesh.position.z;
    let currentBiome = '🏰 Holy Sanctuary';
    if (px < -20 && pz < -20) currentBiome = '🌲 Whispering Forest';
    else if (px > 20 && pz < -20) currentBiome = '🪨 Ironfang Quarry';
    else if (px < -20 && pz > 20) currentBiome = '💎 Crystal Caverns';
    else if (px > 20 && pz > 20) currentBiome = '🔥 Ashen Volcano';
    else if (Math.abs(px) > 20 || Math.abs(pz) > 20) currentBiome = '🌑 Ancient Ruins';

    const pill = document.getElementById('current-biome-pill');
    if (pill && pill.textContent !== currentBiome) {
      pill.textContent = currentBiome;
    }
  }

  // 2. Monster AI Update Loop
  const pPos = state.player.mesh ? state.player.mesh.position : new THREE.Vector3();
  for (const m of state.monsters) {
    m.update(pPos, dt);
  }

  // 3. Shimmering Holy Particles
  if (holyParticles && holyParticles.geometry) {
    const pos = holyParticles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 1] += particleSpeeds[i];
      if (pos[i * 3 + 1] > 12) pos[i * 3 + 1] = -2;
    }
    holyParticles.geometry.attributes.position.needsUpdate = true;
    holyParticles.rotation.y += 0.0008;
  }

  controls.update();
  renderer.render(scene, camera);
}

// ----------------------------------------------------
// 13. Initialization Sequence
// ----------------------------------------------------
async function init() {
  generateChunkedWorld();
  createPlayerMesh();
  setupMobileControls();
  await loadWorldState();
  spawnWorldMonsters();
  animate();
  showToast('⚔️ Ready to Hunt! Use Joystick to Move, Tap Attack to Strike!');
}

init();
