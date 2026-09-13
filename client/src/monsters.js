import * as THREE from "three";
import { cloneModel, setAnimation } from "./models.js";
import { lerp, lerpAngle, smoothingFactor } from "./interpolate.js";

const MODEL_KEY = { boar: "pig", wolf: "wolf" };
const MONSTER_SCALE = { boar: 0.15, wolf: 0.35 };
const BASE_Y = { boar: 0, wolf: 0 };
// The pig model (standing in for "Boar") only ships an idle/jump pair, no
// walk cycle — WALK_CLIP left null for it, and setAnimation()/below just
// never switches away from idle for a monster with no walk clip.
const IDLE_CLIP = { boar: "Armature|Idle", wolf: "Idle" };
const WALK_CLIP = { boar: null, wolf: "Walk" };
const WALK_THRESHOLD = 0.01;
const POSITION_SMOOTHING = 10;

function createMonsterMesh(typeKey) {
  const { scene, animations } = cloneModel(MODEL_KEY[typeKey]);
  scene.scale.setScalar(MONSTER_SCALE[typeKey]);

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

const NAMES = { boar: "Boar", wolf: "Wolf" };

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
      mesh.position.set(data.x, BASE_Y[data.type] ?? 0, data.z);
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
