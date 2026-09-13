import * as THREE from "three";
import { cloneModel } from "./models.js";

export function createCharacterMesh() {
  const { scene, animations } = cloneModel("soldier");

  const group = new THREE.Group();
  group.add(scene);

  group.mixer = new THREE.AnimationMixer(scene);
  group.actions = {
    idle: group.mixer.clipAction(THREE.AnimationClip.findByName(animations, "Idle")),
    walk: group.mixer.clipAction(THREE.AnimationClip.findByName(animations, "Walk")),
  };
  group.currentAnim = "idle";
  group.actions.idle.play();

  return group;
}
