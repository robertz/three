import * as THREE from "three";
import { cloneModel } from "./models.js";

const WORLD_SIZE = 200;
const TILE_SIZE = 8;
// Keep in sync with the server's ZONES meadow.maxRadius / highlands.minRadius
// (server/app.bxs) — the ground swaps to an ashen tint at the same distance
// from the origin the server starts spawning the tougher Highlands mobs.
const HIGHLANDS_BOUNDARY = 45;
// MeshStandardMaterial multiplies vertex color against the texture (there's
// no additive/overlay blend available without a custom shader) — a mid-tone
// tint here crushes the grass texture's brightness far more than expected,
// especially once fog blends it at range, so this needs to stay light.
const HIGHLANDS_TINT = 0xaea27f;

// Per-type scale for the small decorative/collidable props — the actual
// type + position + rotation for each instance comes from the server (see
// applyWorldSnapshot) so every client renders the identical layout; only
// this per-type visual scale stays a client-side lookup, same as monsters.js
// keying its own scale/model maps off a server-provided "type" string.
const PROP_SCALE = {
  tree_default: 3,
  tree_pineRoundA: 3,
  tree_oak: 3,
  tree_fat: 3,
  rock_largeA: 2,
  rock_largeC: 2,
  stump_round: 2.5,
  plant_bushDetailed: 2,
};
const PROP_RADIUS = 1.2;

// How wide (in world units) the meadow-to-highlands tint blend is, centered
// on HIGHLANDS_BOUNDARY, so the ground shifts gradually rather than snapping
// across a hard seam.
const TINT_TRANSITION = 6;

const MOUNTAIN_TINT = 0x76899f;

// The ground itself only needs to be WORLD_SIZE across for the actual
// playable area (obstacle scatter and the player's movement clamp — see
// player.js — both key off WORLD_SIZE/world.bounds and are unrelated to
// this), but rendering it at only that size left a visible gap of bare sky
// between its edge and the mountain ring's base. This is a purely visual
// extension past the play area, comfortably inside the skydome.
const GROUND_VISUAL_SIZE = 380;

const SKY_HORIZON_COLOR = 0xcfe6ef;
const SKY_ZENITH_COLOR = 0x4a7fd6;

function createGround(textureLoader) {
  const groundTexture = textureLoader.load("/textures/grass.jpg");
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(GROUND_VISUAL_SIZE / TILE_SIZE, GROUND_VISUAL_SIZE / TILE_SIZE);
  groundTexture.colorSpace = THREE.SRGBColorSpace;

  // A single flat plane (same shape as the original ground, just larger —
  // see GROUND_VISUAL_SIZE) keeps the texture's UVs linear/uniform — a ring
  // or circle geometry's polar UVs can't give a consistent tile size at
  // every radius (the circumference at the inner edge is much smaller than
  // at the outer edge), which produced a stretched, moiré-darkened band near
  // the horizon. Painting the ashen Highlands tint on as a per-vertex color
  // gradient instead sidesteps that entirely, and reads as a soft, natural
  // transition rather than a hard ring seam.
  const geometry = new THREE.PlaneGeometry(GROUND_VISUAL_SIZE, GROUND_VISUAL_SIZE, 96, 96);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const meadowColor = new THREE.Color(0xffffff);
  const highlandsColor = new THREE.Color(HIGHLANDS_TINT);
  const blended = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    // The plane is still flat in local XY here (rotated into the world's
    // XZ ground plane below), so local X/Y is world X/Z.
    const distance = Math.hypot(positions.getX(i), positions.getY(i));
    const t = THREE.MathUtils.clamp((distance - HIGHLANDS_BOUNDARY) / TINT_TRANSITION + 0.5, 0, 1);
    blended.copy(meadowColor).lerp(highlandsColor, t);
    colors[i * 3] = blended.r;
    colors[i * 3 + 1] = blended.g;
    colors[i * 3 + 2] = blended.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: groundTexture, vertexColors: true }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

// A big inverted sphere the camera always sits well inside of, painted with
// a vertical vertex-color gradient — pale near the horizon, deeper blue
// overhead. fog is turned off on its material: at the sphere's radius every
// point is already past the fog's far distance, so leaving fog on would
// just flatten the whole gradient back to one solid fog color.
function createSkydome() {
  const radius = 400;
  const geometry = new THREE.SphereGeometry(radius, 32, 16);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const horizon = new THREE.Color(SKY_HORIZON_COLOR);
  const zenith = new THREE.Color(SKY_ZENITH_COLOR);
  const blended = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const t = THREE.MathUtils.clamp(positions.getY(i) / radius / 0.7, 0, 1);
    blended.copy(horizon).lerp(zenith, t);
    colors[i * 3] = blended.r;
    colors[i * 3 + 1] = blended.g;
    colors[i * 3 + 2] = blended.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
}

export function createWorld(scene) {
  const textureLoader = new THREE.TextureLoader();

  scene.add(createSkydome());
  scene.add(createGround(textureLoader));

  const hemiLight = new THREE.HemisphereLight(0xbfd8ff, 0x3a6b35, 1.2);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(50, 80, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);

  // Fog color matches the skydome's horizon band so the mountain ring fades
  // into the sky rather than into the old flat sky color.
  scene.background = new THREE.Color(SKY_HORIZON_COLOR);
  scene.fog = new THREE.Fog(SKY_HORIZON_COLOR, 60, 200);

  // obstacles starts empty and is filled in by applyWorldSnapshot() once the
  // server's prop/mountain layout arrives — player.js holds this same array
  // reference for its collision check, so pushing into it later is enough,
  // no need to hand back a new object.
  return { bounds: WORLD_SIZE / 2 - 1, obstacles: [] };
}

// Renders the server-authoritative prop/mountain layout (see the "World
// layout" section of server/app.bxs) so every connected client sees the
// identical arrangement instead of each rolling its own random one. Called
// once, when the "welcome" message arrives (see network.js).
export function applyWorldSnapshot(scene, world, mountains, props) {
  const mountainTint = new THREE.Color(MOUNTAIN_TINT);

  for (const m of mountains) {
    const { scene: rock } = cloneModel(m.type);
    rock.traverse((obj) => {
      if (obj.isMesh) {
        obj.material.color.lerp(mountainTint, 0.7);
        obj.castShadow = false;
      }
    });

    rock.scale.setScalar(m.scale);
    rock.rotation.y = m.rotationY;

    // The rock model's pivot isn't at its base (roughly 15% of its height
    // sits below the pivot already), so sinking by "height * fraction" was
    // wrong: it shifts the *whole* box down by that much, which buried the
    // peak along with the base rather than just planting the base. What we
    // actually want is control over how much of the top shows above ground,
    // so anchor directly off box.max.y (the top) instead of the height.
    rock.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rock);
    const height = box.max.y - box.min.y;
    const peakAboveGround = height * 0.3;

    rock.position.set(m.x, peakAboveGround - box.max.y, m.z);
    scene.add(rock);

    // A circular collision footprint sized off the wider of the rock's
    // (post-rotation) X/Z extents — not exact for an irregular rock shape,
    // but consistent with the simple circular collision every other
    // obstacle in this game already uses.
    const footprintRadius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    world.obstacles.push({ position: rock.position, radius: footprintRadius });
  }

  for (const p of props) {
    const { scene: prop } = cloneModel(p.type);
    prop.scale.setScalar(PROP_SCALE[p.type] ?? 2);
    prop.rotation.y = p.rotationY;
    prop.position.set(p.x, 0, p.z);
    scene.add(prop);
    world.obstacles.push({ position: prop.position, radius: PROP_RADIUS });
  }
}
