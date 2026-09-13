import * as THREE from "three";
import { cloneModel, findAnimation } from "./models.js";

export function createCharacterMesh() {
  const { scene } = cloneModel("knight");

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
