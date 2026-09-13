import * as THREE from "three";
import { cloneModel, findAnimation } from "./models.js";

// The KayKit rig renders ~2.5 world units tall unscaled — noticeably
// taller than a human should be next to the monster/prop models (each of
// which gets its own corrective scale in monsters.js/world.js). This
// brings it down to a believable ~1.9m in the same world units.
export const CHARACTER_SCALE = 0.75;

export function createCharacterMesh() {
  const { scene } = cloneModel("knight");
  scene.scale.setScalar(CHARACTER_SCALE);

  const group = new THREE.Group();
  // Unlike the old Soldier model, the Knight model's own front already
  // faces +Z, matching the game's forward convention (see player.js's
  // movement vector) — no inner-model flip needed.
  group.add(scene);

  group.mixer = new THREE.AnimationMixer(scene);
  group.actions = {
    idle: group.mixer.clipAction(findAnimation("rig_medium_general", "Idle_A")),
    walk: group.mixer.clipAction(findAnimation("rig_medium_movement", "Walking_A")),
  };
  group.currentAnim = "idle";
  group.actions.idle.play();

  return group;
}
