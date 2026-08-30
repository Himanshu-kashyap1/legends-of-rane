/**
 * Legends of Rane — 3D Voxel Base Mini App Engine (Three.js WebGL)
 * Step 17 Integration & Polish
 */

// ----------------------------------------------------
// 1. Initialization & State
// ----------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
let telegramId = urlParams.get('user') || 'demo_user';

if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  if (window.Telegram.WebApp.initDataUnsafe?.user?.id) {
    telegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
  }
}

const state = {
  telegramId,
  mode: 'place', // 'place' | 'break'
  timeOfDay: 'day', // 'day' | 'twilight' | 'night'
  selectedBlockId: 'grass',
  hotbarSlotIdx: 0,
  hotbarSlots: [
    'grass', 'dirt', 'wood_oak_plank', 'wood_oak_log',
    'smooth_stone', 'stone_brick', 'ore_gold', 'ore_diamond', 'decor_lantern'
  ],
  blockCatalog: {},
  blockCategories: {},
  blocksGrouped: {},
  voxels: new Map(), // key: "x,y,z" -> { mesh, data: { x, y, z, blockType } }
  isSaving: false,
  saveTimeout: null
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

function playSound(type = 'click') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'destroy') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
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
// 3. Three.js Scene Setup & Lighting
// ----------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f172a');

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(14, 16, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.minDistance = 4;
controls.maxDistance = 65;
controls.target.set(0, 2, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff7ed, 0.85);
sunLight.position.set(20, 40, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// Ground Plane Grid (32x32)
const gridHelper = new THREE.GridHelper(32, 32, 0x38bdf8, 0x334155);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

// Invisible Raycast Plane at Y = 0
const planeGeo = new THREE.PlaneGeometry(32, 32);
planeGeo.rotateX(-Math.PI / 2);
const planeMat = new THREE.MeshBasicMaterial({ visible: false });
const groundRaycastPlane = new THREE.Mesh(planeGeo, planeMat);
groundRaycastPlane.position.y = -0.5;
scene.add(groundRaycastPlane);

// Selection Highlight Box
const highlightBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
  new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
);
highlightBox.visible = false;
scene.add(highlightBox);

// ----------------------------------------------------
// 4. Material Cache & Voxel Management
// ----------------------------------------------------
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const materialCache = new Map();

function getBlockMaterial(blockType) {
  if (materialCache.has(blockType)) {
    return materialCache.get(blockType);
  }

  const def = state.blockCatalog[blockType] || {
    color: '#94a3b8',
    roughness: 0.7,
    metalness: 0.1
  };

  const matConfig = {
    color: def.color || '#94a3b8',
    roughness: def.roughness ?? 0.7,
    metalness: def.metalness ?? 0.1
  };

  if (def.emissive) {
    matConfig.emissive = def.emissive;
    matConfig.emissiveIntensity = def.emissiveIntensity || 0.5;
  }

  if (def.transparent) {
    matConfig.transparent = true;
    matConfig.opacity = def.opacity || 0.7;
  }

  const material = new THREE.MeshStandardMaterial(matConfig);
  materialCache.set(blockType, material);
  return material;
}

function addVoxelToScene(x, y, z, blockType, playSfx = false) {
  const key = `${x},${y},${z}`;

  // Remove existing mesh at coordinate if present
  if (state.voxels.has(key)) {
    const existing = state.voxels.get(key);
    scene.remove(existing.mesh);
  }

  const mesh = new THREE.Mesh(cubeGeometry, getBlockMaterial(blockType));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { x, y, z, blockType };

  scene.add(mesh);
  state.voxels.set(key, { mesh, data: { x, y, z, blockType } });

  updateBlockCounterUI();

  if (playSfx) {
    playSound('place');
    triggerHaptic('light');
  }
}

function removeVoxelFromScene(x, y, z, playSfx = false) {
  const key = `${x},${y},${z}`;
  if (state.voxels.has(key)) {
    const entry = state.voxels.get(key);
    scene.remove(entry.mesh);
    state.voxels.delete(key);
    updateBlockCounterUI();

    if (playSfx) {
      playSound('destroy');
      triggerHaptic('medium');
    }
  }
}

function clearAllVoxelsFromScene() {
  for (const entry of state.voxels.values()) {
    scene.remove(entry.mesh);
  }
  state.voxels.clear();
  updateBlockCounterUI();
}

function updateBlockCounterUI() {
  const counterEl = document.getElementById('block-counter');
  if (counterEl) {
    counterEl.textContent = `${state.voxels.size} / 2000`;
  }
}

// ----------------------------------------------------
// 5. Raycasting & Interaction (Placement & Destruction)
// ----------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isPointerDown = false;
let pointerDownTime = 0;
let pointerDownPos = { x: 0, y: 0 };

function getIntersectables() {
  const meshes = [];
  for (const entry of state.voxels.values()) {
    meshes.push(entry.mesh);
  }
  meshes.push(groundRaycastPlane);
  return meshes;
}

function onPointerMove(event) {
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getIntersectables(), false);

  if (intersects.length > 0) {
    const hit = intersects[0];
    if (state.mode === 'place') {
      const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
      const targetPos = new THREE.Vector3().copy(hit.point).addScaledVector(normal, 0.5);
      const x = Math.round(targetPos.x);
      const y = Math.max(0, Math.round(targetPos.y));
      const z = Math.round(targetPos.z);

      highlightBox.position.set(x, y, z);
      highlightBox.material.color.setHex(0x38bdf8);
      highlightBox.visible = true;
    } else {
      // Break mode: highlight target voxel directly
      if (hit.object !== groundRaycastPlane) {
        highlightBox.position.copy(hit.object.position);
        highlightBox.material.color.setHex(0xef4444);
        highlightBox.visible = true;
      } else {
        highlightBox.visible = false;
      }
    }
  } else {
    highlightBox.visible = false;
  }
}

function onPointerDown(event) {
  isPointerDown = true;
  pointerDownTime = performance.now();
  pointerDownPos = {
    x: event.touches ? event.touches[0].clientX : event.clientX,
    y: event.touches ? event.touches[0].clientY : event.clientY
  };
}

function onPointerUp(event) {
  if (!isPointerDown) return;
  isPointerDown = false;

  const clientX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
  const clientY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;

  const dx = Math.abs(clientX - pointerDownPos.x);
  const dy = Math.abs(clientY - pointerDownPos.y);
  const duration = performance.now() - pointerDownTime;

  // Ignore drag / orbit gestures (> 6px movement or > 500ms hold)
  if (dx > 6 || dy > 6 || duration > 500) {
    return;
  }

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getIntersectables(), false);

  if (intersects.length > 0) {
    const hit = intersects[0];

    if (state.mode === 'place') {
      const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
      const targetPos = new THREE.Vector3().copy(hit.point).addScaledVector(normal, 0.5);
      const x = Math.round(targetPos.x);
      const y = Math.max(0, Math.round(targetPos.y));
      const z = Math.round(targetPos.z);

      // Bounds validation (-16 to 15)
      if (x >= -16 && x <= 15 && y >= 0 && y <= 31 && z >= -16 && z <= 15) {
        addVoxelToScene(x, y, z, state.selectedBlockId, true);
        scheduleCloudSave();
      }
    } else if (state.mode === 'break') {
      if (hit.object !== groundRaycastPlane && hit.object.userData) {
        const { x, y, z } = hit.object.userData;
        removeVoxelFromScene(x, y, z, true);
        scheduleCloudSave();
      }
    }
  }
}

// ----------------------------------------------------
// 6. Cloud Persistence & REST API
// ----------------------------------------------------
function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

function scheduleCloudSave() {
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }
  state.saveTimeout = setTimeout(async () => {
    await saveBaseToCloud();
  }, 600);
}

async function saveBaseToCloud() {
  const blockList = [];
  for (const entry of state.voxels.values()) {
    blockList.push(entry.data);
  }

  try {
    const res = await fetch('/api/base/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: state.telegramId,
        blocks: blockList
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('💾 Base saved to cloud!');
    }
  } catch (err) {
    console.error('Failed to auto-save base:', err);
  }
}

async function loadBaseFromCloud() {
  try {
    const res = await fetch(`/api/base/load?telegramId=${encodeURIComponent(state.telegramId)}`);
    const data = await res.json();

    if (data.success && data.base?.blocks) {
      clearAllVoxelsFromScene();
      for (const b of data.base.blocks) {
        addVoxelToScene(b.x, b.y, b.z, b.blockType, false);
      }
      if (data.base.name) {
        const nameEl = document.getElementById('base-name-display');
        if (nameEl) nameEl.textContent = data.base.name;
      }
    }
  } catch (err) {
    console.error('Failed to load base from cloud:', err);
  }
}

async function fetchBlockCatalog() {
  try {
    const res = await fetch('/api/base/blocks');
    const data = await res.json();
    if (data.success) {
      state.blockCatalog = data.blocks || {};
      state.blockCategories = data.categories || {};
      state.blocksGrouped = data.grouped || {};
      renderHotbar();
      renderPaletteModal();
      updateSelectedBlockIndicator();
    }
  } catch (err) {
    console.error('Failed to fetch block catalog:', err);
  }
}

// ----------------------------------------------------
// 7. UI Controls & Event Listeners
// ----------------------------------------------------
function updateSelectedBlockIndicator() {
  const def = state.blockCatalog[state.selectedBlockId] || { name: state.selectedBlockId, emoji: '🧱' };
  const placeBtn = document.getElementById('btn-mode-place');
  if (placeBtn && state.mode === 'place') {
    placeBtn.textContent = `🔨 ${def.emoji || '🧱'} ${def.name}`;
  }
}

function renderHotbar() {
  const container = document.getElementById('hotbar-container');
  if (!container) return;
  container.innerHTML = '';

  state.hotbarSlots.forEach((blockId, idx) => {
    const def = state.blockCatalog[blockId] || { name: blockId, emoji: '🧱' };
    const slot = document.createElement('div');
    slot.className = `hotbar-slot ${idx === state.hotbarSlotIdx ? 'active' : ''}`;
    slot.innerHTML = `
      <span class="slot-number">${idx + 1}</span>
      <span class="slot-emoji">${def.emoji || '🧱'}</span>
    `;

    slot.addEventListener('click', () => {
      selectHotbarSlot(idx);
      playSound('click');
      triggerHaptic('light');
    });

    container.appendChild(slot);
  });
}

function selectHotbarSlot(idx) {
  state.hotbarSlotIdx = idx;
  state.selectedBlockId = state.hotbarSlots[idx];
  renderHotbar();
  updateSelectedBlockIndicator();
}

function renderPaletteModal() {
  const body = document.getElementById('palette-body');
  if (!body) return;
  body.innerHTML = '';

  for (const [catName, blocks] of Object.entries(state.blocksGrouped)) {
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<h4>${catName}</h4>`;

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    blocks.forEach(b => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.innerHTML = `
        <span class="item-emoji">${b.emoji || '🧱'}</span>
        <span class="item-name">${b.name}</span>
      `;

      item.addEventListener('click', () => {
        state.hotbarSlots[state.hotbarSlotIdx] = b.id;
        state.selectedBlockId = b.id;
        renderHotbar();
        updateSelectedBlockIndicator();
        closePaletteModal();
        playSound('click');
        triggerHaptic('medium');
        showToast(`Equipped ${b.name} to Hotbar Slot #${state.hotbarSlotIdx + 1}`);
      });

      grid.appendChild(item);
    });

    group.appendChild(grid);
    body.appendChild(group);
  }
}

function openPaletteModal() {
  document.getElementById('palette-modal')?.classList.add('open');
  playSound('click');
  triggerHaptic('light');
}

function closePaletteModal() {
  document.getElementById('palette-modal')?.classList.remove('open');
  playSound('click');
}

// Lighting cycle (Day -> Twilight -> Night)
function cycleTimeOfDay() {
  const btn = document.getElementById('btn-tod');
  if (state.timeOfDay === 'day') {
    state.timeOfDay = 'twilight';
    scene.background = new THREE.Color('#311042');
    ambientLight.color.setHex(0xe0a96d);
    ambientLight.intensity = 0.5;
    sunLight.color.setHex(0xf97316);
    sunLight.intensity = 0.7;
    if (btn) btn.textContent = '🌆 Twilight';
  } else if (state.timeOfDay === 'twilight') {
    state.timeOfDay = 'night';
    scene.background = new THREE.Color('#030712');
    ambientLight.color.setHex(0x1e1b4b);
    ambientLight.intensity = 0.35;
    sunLight.color.setHex(0x6366f1);
    sunLight.intensity = 0.3;
    if (btn) btn.textContent = '🌙 Night';
  } else {
    state.timeOfDay = 'day';
    scene.background = new THREE.Color('#0f172a');
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.65;
    sunLight.color.setHex(0xfff7ed);
    sunLight.intensity = 0.85;
    if (btn) btn.textContent = '☀️ Day';
  }
  playSound('click');
  triggerHaptic('light');
}

function recenterCamera() {
  controls.target.set(0, 2, 0);
  camera.position.set(14, 16, 20);
  controls.update();
  playSound('click');
  triggerHaptic('light');
}

// ----------------------------------------------------
// 8. Event Bindings & Render Loop
// ----------------------------------------------------
function setupEventListeners() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const dom = renderer.domElement;
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointerup', onPointerUp);

  // Mode buttons
  document.getElementById('btn-mode-place')?.addEventListener('click', () => {
    state.mode = 'place';
    document.getElementById('btn-mode-place').className = 'btn-mode active';
    document.getElementById('btn-mode-break').className = 'btn-mode';
    updateSelectedBlockIndicator();
    playSound('click');
    triggerHaptic('light');
  });

  document.getElementById('btn-mode-break')?.addEventListener('click', () => {
    state.mode = 'break';
    document.getElementById('btn-mode-place').className = 'btn-mode';
    document.getElementById('btn-mode-break').className = 'btn-mode active break-mode';
    const placeBtn = document.getElementById('btn-mode-place');
    if (placeBtn) placeBtn.textContent = '🔨 Place Block';
    playSound('click');
    triggerHaptic('light');
  });

  // Top buttons
  document.getElementById('btn-tod')?.addEventListener('click', cycleTimeOfDay);
  document.getElementById('btn-recenter')?.addEventListener('click', recenterCamera);

  // Palette modal triggers
  document.getElementById('btn-palette-open')?.addEventListener('click', openPaletteModal);
  document.getElementById('btn-palette-close')?.addEventListener('click', closePaletteModal);

  // Clear modal triggers
  document.getElementById('btn-clear-open')?.addEventListener('click', () => {
    document.getElementById('clear-modal')?.classList.add('open');
    playSound('click');
    triggerHaptic('light');
  });
  document.getElementById('btn-clear-close')?.addEventListener('click', () => {
    document.getElementById('clear-modal')?.classList.remove('open');
    playSound('click');
  });
  document.getElementById('btn-clear-cancel')?.addEventListener('click', () => {
    document.getElementById('clear-modal')?.classList.remove('open');
    playSound('click');
  });
  document.getElementById('btn-clear-confirm')?.addEventListener('click', async () => {
    document.getElementById('clear-modal')?.classList.remove('open');
    clearAllVoxelsFromScene();
    playSound('destroy');
    triggerHaptic('heavy');
    try {
      await fetch('/api/base/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: state.telegramId })
      });
      showToast('🗑️ Base cleared!');
    } catch (err) {
      console.error('Failed to clear base:', err);
    }
  });

  // Keyboard hotkeys (1-9)
  window.addEventListener('keydown', (e) => {
    const keyNum = parseInt(e.key, 10);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
      selectHotbarSlot(keyNum - 1);
      playSound('click');
      triggerHaptic('light');
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ----------------------------------------------------
// 9. Startup Sequence
// ----------------------------------------------------
async function init() {
  setupEventListeners();
  animate();
  await fetchBlockCatalog();
  await loadBaseFromCloud();
}

init();
