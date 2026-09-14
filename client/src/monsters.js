import * as THREE from "three";
import { cloneModel, setAnimation } from "./models.js";
import { lerp, lerpAngle, smoothingFactor } from "./interpolate.js";
import { terrainHeight } from "./terrain.js";

// Every zone's two monster types (see server GameConfig.bx's _registerZone
// calls) are reskins of the same two base models — no new art per zone,
// just a bigger scale and a zone-flavored tint (below) to read as
// successively tougher versions of the same pig/wolf the Meadow started
// with. Every boar-type key maps to "pig", every wolf-type key to "wolf".
const BOAR_TYPES = ["boar", "alphaBoar", "thornBoar", "frostBoar", "cinderBoar", "bogBoar", "shadowBoar", "mawTusker"];
const WOLF_TYPES = ["wolf", "direWolf", "brambleWolf", "frostWolf", "emberWolf", "blightWolf", "nightfangWolf", "wyrmfangStalker"];

const MODEL_KEY = {};
const BASE_Y = {};
// The pig model (standing in for every boar-type) only ships an idle/jump
// pair, no walk cycle — WALK_CLIP left null for those, and setAnimation()
// below just never switches away from idle for a monster with no walk clip.
const IDLE_CLIP = {};
const WALK_CLIP = {};
const NAMES = {};
for (const key of BOAR_TYPES) {
  MODEL_KEY[key] = "pig";
  BASE_Y[key] = 0;
  IDLE_CLIP[key] = "Armature|Idle";
  WALK_CLIP[key] = null;
}
for (const key of WOLF_TYPES) {
  MODEL_KEY[key] = "wolf";
  BASE_Y[key] = 0;
  IDLE_CLIP[key] = "Idle";
  WALK_CLIP[key] = "Walk";
}

// Scale grows tier over tier (BOAR_TYPES/WOLF_TYPES are in zone order, tier
// 1 first) so each zone's monsters read as visibly bigger than the last,
// same idea as alphaBoar/direWolf already being scaled up from boar/wolf.
const BOAR_SCALE = [0.15, 0.22, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46];
const WOLF_SCALE = [0.35, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 0.98];
const MONSTER_SCALE = {};
BOAR_TYPES.forEach((key, i) => (MONSTER_SCALE[key] = BOAR_SCALE[i]));
WOLF_TYPES.forEach((key, i) => (MONSTER_SCALE[key] = WOLF_SCALE[i]));

// Display names — the server never sends one in monsterSnapshot() (see
// MonsterService.bx), just the type key, so this is the single source of
// truth for what the HUD/nameplate shows. Keep in sync with each zone's
// boarName/wolfName in server GameConfig.bx.
Object.assign(NAMES, {
  boar: "Boar",
  wolf: "Wolf",
  alphaBoar: "Alpha Boar",
  direWolf: "Dire Wolf",
  thornBoar: "Thorn Boar",
  brambleWolf: "Bramble Wolf",
  frostBoar: "Frost Boar",
  frostWolf: "Frost Wolf",
  cinderBoar: "Cinder Boar",
  emberWolf: "Ember Wolf",
  bogBoar: "Bog Boar",
  blightWolf: "Blight Wolf",
  shadowBoar: "Shadow Boar",
  nightfangWolf: "Nightfang Wolf",
  mawTusker: "Maw Tusker",
  wyrmfangStalker: "Wyrmfang Stalker",
});

// Tint applied at 0.55 strength (see createMonsterMesh) — roughly matches
// each zone's own groundTint (see GameConfig.bx's _registerZone calls) so
// a zone's monsters read as native to it, not just recolored at random.
const TINT = {
  alphaBoar: 0x6b3620,
  direWolf: 0x23232b,
  thornBoar: 0x4a5c2e,
  brambleWolf: 0x2e3b1f,
  frostBoar: 0xb8d4de,
  frostWolf: 0x8fb5c2,
  cinderBoar: 0x8a3f1f,
  emberWolf: 0xb5451f,
  bogBoar: 0x5c6b2e,
  blightWolf: 0x3f4a1f,
  shadowBoar: 0x453a5c,
  nightfangWolf: 0x2a2338,
  mawTusker: 0x6b1f1f,
  wyrmfangStalker: 0x3a0f0f,
};
const WALK_THRESHOLD = 0.01;
const POSITION_SMOOTHING = 10;

function createMonsterMesh(typeKey) {
  const { scene, animations } = cloneModel(MODEL_KEY[typeKey]);
  scene.scale.setScalar(MONSTER_SCALE[typeKey]);

  const tint = TINT[typeKey];
  if (tint !== undefined) {
    const tintColor = new THREE.Color(tint);
    scene.traverse((obj) => {
      if (obj.isMesh) obj.material.color.lerp(tintColor, 0.55);
    });
  }

  const group = new THREE.Group();
  group.add(scene);

  const idleClip = THREE.AnimationClip.findByName(animations, IDLE_CLIP[typeKey]);
  const walkName = WALK_CLIP[typeKey];
  const walkClip = walkName ? THREE.AnimationClip.findByName(animations, walkName) : null;
  if (idleClip) {
    group.mixer = new THREE.AnimationMixer(scene);
    group.actions = { idle: group.mixer.clipAction(idleClip) };
    if (walkClip) group.actions.walk = group.mixer.clipAction(walkClip);
    group.currentAnim = "idle";
    group.actions.idle.play();
  }

  return group;
}

export function createMonsterRegistry() {
  return new Map();
}

export function applyMonsterSnapshot(scene, registry, list) {
  const seenIds = new Set();

  for (const data of list) {
    seenIds.add(data.id);
    let entry = registry.get(data.id);

    if (!entry) {
      const mesh = createMonsterMesh(data.type);
      // Real glTF models nest the actual Mesh several levels deep inside
      // this top-level group (unlike the old flat primitive shapes), so a
      // raycast hit's .object won't be a direct child — combat.js walks
      // back up via .parent until it finds this tag instead of assuming
      // one level of nesting.
      mesh.userData.monsterId = data.id;
      mesh.position.set(data.x, terrainHeight(data.x, data.z) + (BASE_Y[data.type] ?? 0), data.z);
      mesh.rotation.y = data.rotationY;
      scene.add(mesh);
      entry = { mesh };
      registry.set(data.id, entry);
    }

    const prevData = entry.data;
    entry.data = { ...data, name: NAMES[data.type] ?? data.type };
    // Server snapshots arrive at TICK_SECONDS intervals, far slower than the
    // render loop — snapping straight to each one looks choppy, so the mesh
    // chases this target smoothly instead (see updateMonsterPositions).
    entry.target = { x: data.x, z: data.z, rotationY: data.rotationY };
    entry.mesh.visible = data.alive;

    if (entry.mesh.actions) {
      const movedDist = prevData ? Math.hypot(data.x - prevData.x, data.z - prevData.z) : 0;
      setAnimation(entry.mesh, movedDist > WALK_THRESHOLD ? "walk" : "idle");
    }
  }

  for (const [id, entry] of registry) {
    if (!seenIds.has(id)) {
      scene.remove(entry.mesh);
      registry.delete(id);
    }
  }
}

export function updateMonsterAnimations(registry, delta) {
  for (const entry of registry.values()) {
    entry.mesh.mixer?.update(delta);
  }
}

export function updateMonsterPositions(registry, delta) {
  const t = smoothingFactor(delta, POSITION_SMOOTHING);
  for (const entry of registry.values()) {
    if (!entry.target) continue;
    entry.mesh.position.x = lerp(entry.mesh.position.x, entry.target.x, t);
    entry.mesh.position.z = lerp(entry.mesh.position.z, entry.target.z, t);
    entry.mesh.position.y = terrainHeight(entry.mesh.position.x, entry.mesh.position.z) + (BASE_Y[entry.data.type] ?? 0);
    entry.mesh.rotation.y = lerpAngle(entry.mesh.rotation.y, entry.target.rotationY, t);
  }
}

export function flashHit(registry, id) {
  const entry = registry.get(id);
  if (!entry) return;

  const meshes = [];
  entry.mesh.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj);
  });

  const originals = meshes.map((m) => m.material.color.getHex());
  meshes.forEach((m) => m.material.color.setHex(0xffffff));
  setTimeout(() => {
    meshes.forEach((m, i) => m.material.color.setHex(originals[i]));
  }, 100);
}
