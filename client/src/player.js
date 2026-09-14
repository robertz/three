import * as THREE from "three";
import { isDown } from "./input.js";
import { createCharacterMesh } from "./character.js";
import { setAnimation } from "./models.js";
import { nearbyObstacles } from "./world.js";

const MOVE_SPEED = 8;
const PLAYER_RADIUS = 0.5;

export function createPlayerMesh() {
  return createCharacterMesh();
}

export function createPlayer(scene) {
  const group = createPlayerMesh();
  group.position.set(0, 0, 0);
  scene.add(group);

  group.level = 1;
  group.hp = 100;
  group.maxHp = 100;
  group.xp = 0;
  group.xpToNext = 50;
  group.attackDamage = 10;
  group.gold = 0;

  return group;
}

export function updatePlayer(player, delta, world) {
  const moveForward = (isDown("w") ? 1 : 0) - (isDown("s") ? 1 : 0);
  const strafe = (isDown("a") ? 1 : 0) - (isDown("d") ? 1 : 0);

  let moved = false;

  if (moveForward !== 0 || strafe !== 0) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
    const move = forward.multiplyScalar(moveForward).addScaledVector(right, strafe).normalize();
    const nextPos = player.position.clone().addScaledVector(move, MOVE_SPEED * delta);

    nextPos.x = THREE.MathUtils.clamp(nextPos.x, -world.bounds, world.bounds);
    nextPos.z = THREE.MathUtils.clamp(nextPos.z, -world.bounds, world.bounds);

    // Horizontal distance only — obstacle.position.y varies (the horizon
    // mountains are sunk well below ground to hide their flat base; see
    // world.js), and THREE.Vector3.distanceTo's 3D distance was folding that
    // vertical offset into the check, letting the player get closer
    // horizontally than the intended radius before it finally tripped.
    const blocked = nearbyObstacles(world, nextPos.x, nextPos.z).some((obstacle) => {
      const dx = obstacle.position.x - nextPos.x;
      const dz = obstacle.position.z - nextPos.z;
      return Math.hypot(dx, dz) < obstacle.radius + PLAYER_RADIUS;
    });

    if (!blocked) {
      player.position.copy(nextPos);
      moved = true;
    }
  }

  setAnimation(player, moved ? "walk" : "idle");
}
