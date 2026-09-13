import * as THREE from "three";
import { cloneModel, setAnimation } from "./models.js";

const MODEL_KEY = { poring: "duck", wolf: "fox" };
const MONSTER_SCALE = { poring: 0.5, wolf: 0.02 };
const BASE_Y = { poring: 0.3, wolf: 0 };
const WALK_THRESHOLD = 0.01;

function createMonsterMesh(typeKey) {
  const { scene, animations } = cloneModel(MODEL_KEY[typeKey]);
  scene.scale.setScalar(MONSTER_SCALE[typeKey]);

  const group = new THREE.Group();
  group.add(scene);

  const idleClip = THREE.AnimationClip.findByName(animations, "Survey");
  const walkClip = THREE.AnimationClip.findByName(animations, "Walk");
  if (idleClip && walkClip) {
    group.mixer = new THREE.AnimationMixer(scene);
    group.actions = {
      idle: group.mixer.clipAction(idleClip),
      walk: group.mixer.clipAction(walkClip),
    };
    group.currentAnim = "idle";
    group.actions.idle.play();
  }

  return group;
}

const NAMES = { poring: "Poring", wolf: "Wolf" };

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
      scene.add(mesh);
      entry = { mesh };
      registry.set(data.id, entry);
    }

    const prevData = entry.data;
    entry.data = { ...data, name: NAMES[data.type] ?? data.type };
    entry.mesh.position.set(data.x, BASE_Y[data.type] ?? 0, data.z);
    entry.mesh.rotation.y = data.rotationY;
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
