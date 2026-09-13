import * as THREE from "three";

const OFFSET = new THREE.Vector3(0, 6, -10);
const LERP = 0.08;
const ROTATE_SPEED = 0.005;
const MIN_PITCH = -0.8;
const MAX_PITCH = 1.0;
const MIN_HEIGHT = 1;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Right-drag turns the character itself (yaw) rather than orbiting the
// camera independently — the camera just stays behind wherever the
// character ends up facing, same as it always has for A/D turning.
export function createCameraController(domElement, player) {
  const state = { pitchOffset: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  domElement.addEventListener("contextmenu", (e) => e.preventDefault());

  domElement.addEventListener("pointerdown", (e) => {
    if (e.button !== 2) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener("pointerup", (e) => {
    if (e.button === 2) dragging = false;
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    player.rotation.y -= dx * ROTATE_SPEED;
    state.pitchOffset = THREE.MathUtils.clamp(state.pitchOffset - dy * ROTATE_SPEED, MIN_PITCH, MAX_PITCH);
  });

  return state;
}

export function updateCamera(camera, player, cameraState) {
  const offset = OFFSET.clone();
  offset.applyAxisAngle(X_AXIS, cameraState.pitchOffset);
  offset.applyAxisAngle(Y_AXIS, player.rotation.y);

  const desired = offset.add(player.position);
  desired.y = Math.max(desired.y, MIN_HEIGHT);
  camera.position.lerp(desired, LERP);
  camera.position.y = Math.max(camera.position.y, MIN_HEIGHT);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
}
