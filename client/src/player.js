import * as THREE from "three";
import { isDown } from "./input.js";
import { createCharacterMesh } from "./character.js";
import { setAnimation } from "./models.js";

const MOVE_SPEED = 8;
const TURN_SPEED = 6;
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
  group.zeny = 0;

  return group;
}

export function updatePlayer(player, delta, world) {
  const moveForward = (isDown("w") ? 1 : 0) - (isDown("s") ? 1 : 0);
  const turn = (isDown("a") ? 1 : 0) - (isDown("d") ? 1 : 0);

  player.rotation.y += turn * TURN_SPEED * delta;

  let moved = false;

  if (moveForward !== 0) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
    const nextPos = player.position.clone().addScaledVector(forward, moveForward * MOVE_SPEED * delta);

    nextPos.x = THREE.MathUtils.clamp(nextPos.x, -world.bounds, world.bounds);
    nextPos.z = THREE.MathUtils.clamp(nextPos.z, -world.bounds, world.bounds);

    const blocked = world.obstacles.some(
      (obstacle) => obstacle.position.distanceTo(nextPos) < world.obstacleRadius + PLAYER_RADIUS
    );

    if (!blocked) {
      player.position.copy(nextPos);
      moved = true;
    }
  }

  setAnimation(player, moved ? "walk" : "idle");
}
