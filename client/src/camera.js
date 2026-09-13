import * as THREE from "three";

const OFFSET = new THREE.Vector3(0, 6, -10);
const LERP = 0.08;

export function updateCamera(camera, player) {
  const desired = OFFSET.clone().applyQuaternion(player.quaternion).add(player.position);
  camera.position.lerp(desired, LERP);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
}
