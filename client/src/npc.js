import * as THREE from "three";
import { cloneModel, findAnimation } from "./models.js";
import { CHARACTER_SCALE } from "./character.js";

// NPCs are static (no AI, no movement) and deliberately kept in their own
// registry, separate from monsters.js — combat.js's raycast targeting and
// auto-attack/facing gate only ever look at the monster registry, so the
// shopkeeper is never attackable/targetable by construction, not by a
// special-case check.
export function createNpcRegistry() {
  return new Map();
}

function createNpcMesh(modelKey) {
  const { scene } = cloneModel(modelKey);
  scene.scale.setScalar(CHARACTER_SCALE);
  const group = new THREE.Group();
  group.add(scene);

  // KayKit ships no baked-in animation on the character mesh itself — same
  // reason character.js pulls a clip from the separate animation-library
  // file for the player's Knight.
  group.mixer = new THREE.AnimationMixer(scene);
  group.actions = { idle: group.mixer.clipAction(findAnimation("rig_medium_general", "Idle_A")) };
  group.actions.idle.play();

  return group;
}

export function applyNpcSnapshot(scene, registry, list) {
  for (const data of list) {
    if (registry.has(data.id)) continue; // static — created once, never updated/removed

    const mesh = createNpcMesh(data.model);
    mesh.userData.npcId = data.id;
    mesh.position.set(data.x, 0, data.z);
    mesh.rotation.y = data.rotationY;
    scene.add(mesh);
    registry.set(data.id, { mesh, data });
  }
}

export function updateNpcAnimations(registry, delta) {
  for (const entry of registry.values()) {
    entry.mesh.mixer?.update(delta);
  }
}

// Multiple merchants now exist (one per zone, spread far enough apart that
// a player is realistically only ever in range of one at a time) — returns
// the closest one's registry entry (mesh + data, including its catalog),
// or null if the registry is empty. Distance-only checks (is *any* npc
// nearby) can just read `.distance` off the result.
export function getNearestNpc(player, registry) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const entry of registry.values()) {
    const dist = Math.hypot(player.position.x - entry.data.x, player.position.z - entry.data.z);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = entry;
    }
  }
  return nearest ? { ...nearest, distance: nearestDist } : null;
}
