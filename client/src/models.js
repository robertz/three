import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const MODEL_URLS = {
  knight: "/models/knight.glb",
  // KayKit ships characters with no baked-in animations — clips live in
  // separate rig-matched animation-library files, applied to any character
  // sharing the same skeleton (same joint names) via clipAction().
  rig_medium_movement: "/models/rig_medium_movement.glb",
  rig_medium_general: "/models/rig_medium_general.glb",
  pig: "/models/pig.glb",
  wolf: "/models/wolf.glb",
  shopkeeper: "/models/shopkeeper.glb",
  tree_default: "/models/nature/tree_default.glb",
  tree_pineRoundA: "/models/nature/tree_pineRoundA.glb",
  tree_oak: "/models/nature/tree_oak.glb",
  tree_fat: "/models/nature/tree_fat.glb",
  rock_largeA: "/models/nature/rock_largeA.glb",
  rock_largeC: "/models/nature/rock_largeC.glb",
  stump_round: "/models/nature/stump_round.glb",
  plant_bushDetailed: "/models/nature/plant_bushDetailed.glb",
};

const templates = {};

export async function loadModels() {
  const loader = new GLTFLoader();
  await Promise.all(
    Object.entries(MODEL_URLS).map(async ([key, url]) => {
      templates[key] = await loader.loadAsync(url);
    })
  );
}

// SkeletonUtils.clone() only clones the object/bone hierarchy — meshes still
// share their original material instances, so tinting one clone's material
// (e.g. a hit flash) would tint every other clone of the same model too.
// Cloning each mesh's material per-instance here avoids that.
export function cloneModel(key) {
  const template = templates[key];
  const scene = cloneSkeleton(template.scene);
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.material = obj.material.clone();
      // The Kenney nature-kit props export with metalness=1/roughness=1 (an
      // authoring quirk — they're clearly meant as flat diffuse colors, not
      // metal) which renders near-black with no environment map to reflect.
      // Forcing metalness off fixes them and is a no-op for models that
      // already export metalness=0.
      obj.material.metalness = 0;
    }
  });
  return { scene, animations: template.animations };
}

// Looks up an AnimationClip by name from a template that was never cloned
// via cloneModel() — used for the KayKit animation-library files, which
// have no scene/mesh of their own worth instancing, just clips meant to be
// played against a different (rig-matching) character's skeleton.
export function findAnimation(key, name) {
  return THREE.AnimationClip.findByName(templates[key].animations, name);
}

export function setAnimation(entity, name) {
  if (!entity.actions || !entity.actions[name] || entity.currentAnim === name) return;

  const next = entity.actions[name];
  const prev = entity.actions[entity.currentAnim];
  next.reset().play();
  if (prev) next.crossFadeFrom(prev, 0.2, true);
  entity.currentAnim = name;
}

export function findFirstMesh(object) {
  let found = null;
  object.traverse((obj) => {
    if (!found && obj.isMesh) found = obj;
  });
  return found;
}
