import * as THREE from "three";

const ATTACK_RANGE = 3;
const ATTACK_COOLDOWN = 1;
export const SKILL_COOLDOWN = 4;

export function createCombat(camera, domElement, registry) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const state = { targetId: null, cooldown: 0, skillCooldown: 0 };

  domElement.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const meshes = [...registry.values()].filter((entry) => entry.data?.alive).map((entry) => entry.mesh);
    const hits = raycaster.intersectObjects(meshes, true);

    if (hits.length === 0) {
      state.targetId = null;
      return;
    }

    // The hit mesh is often nested several levels deep inside the monster's
    // top-level group (real glTF models, not the old flat primitives), so
    // walk back up to find the ancestor monsters.js tagged with an id.
    let obj = hits[0].object;
    while (obj && obj.userData.monsterId === undefined) {
      obj = obj.parent;
    }
    state.targetId = obj ? obj.userData.monsterId : null;
  });

  return state;
}

function isInFront(player, target) {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
  const toTarget = new THREE.Vector3(target.x - player.position.x, 0, target.z - player.position.z);
  return forward.dot(toTarget) >= 0;
}

export function getTarget(state, registry) {
  if (!state.targetId) return null;
  const entry = registry.get(state.targetId);
  if (!entry || !entry.data.alive) {
    state.targetId = null;
    return null;
  }
  return entry.data;
}

export function updateCombat(state, player, registry, network, delta) {
  state.cooldown -= delta;
  state.skillCooldown -= delta;

  const target = getTarget(state, registry);
  if (!target || state.cooldown > 0) return;

  const dist = Math.hypot(player.position.x - target.x, player.position.z - target.z);
  if (dist > ATTACK_RANGE || !isInFront(player, target)) return;

  state.cooldown = ATTACK_COOLDOWN;
  network.sendAttack(state.targetId);
}

export function useSkill(state, player, registry, network) {
  const target = getTarget(state, registry);
  if (!target || state.skillCooldown > 0) return;

  const dist = Math.hypot(player.position.x - target.x, player.position.z - target.z);
  if (dist > ATTACK_RANGE || !isInFront(player, target)) return;

  state.skillCooldown = SKILL_COOLDOWN;
  network.sendSkill(state.targetId);
}
