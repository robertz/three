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

const PROP_TYPES = [
  { key: "tree_default", scale: 3 },
  { key: "tree_pineRoundA", scale: 3 },
  { key: "tree_oak", scale: 3 },
  { key: "tree_fat", scale: 3 },
  { key: "rock_largeA", scale: 2 },
  { key: "rock_largeC", scale: 2 },
  { key: "stump_round", scale: 2.5 },
  { key: "plant_bushDetailed", scale: 2 },
];

// How wide (in world units) the meadow-to-highlands tint blend is, centered
// on HIGHLANDS_BOUNDARY, so the ground shifts gradually rather than snapping
// across a hard seam.
const TINT_TRANSITION = 6;

function createGround(textureLoader) {
  const groundTexture = textureLoader.load("/textures/grass.jpg");
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(WORLD_SIZE / TILE_SIZE, WORLD_SIZE / TILE_SIZE);
  groundTexture.colorSpace = THREE.SRGBColorSpace;

  // A single flat plane (same geometry as the original ground) keeps the
  // texture's UVs linear/uniform — a ring or circle geometry's polar UVs
  // can't give a consistent tile size at every radius (the circumference at
  // the inner edge is much smaller than at the outer edge), which produced
  // a stretched, moiré-darkened band near the horizon. Painting the ashen
  // Highlands tint on as a per-vertex color gradient instead sidesteps that
  // entirely, and reads as a soft, natural transition rather than a hard
  // ring seam.
  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 64, 64);
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

export function createWorld(scene) {
  const textureLoader = new THREE.TextureLoader();

  scene.add(createGround(textureLoader));

  const obstacles = [];
  for (let i = 0; i < 25; i++) {
    const propType = PROP_TYPES[Math.floor(Math.random() * PROP_TYPES.length)];
    const { scene: prop } = cloneModel(propType.key);
    prop.scale.setScalar(propType.scale);
    prop.rotation.y = Math.random() * Math.PI * 2;
    prop.position.set(
      (Math.random() - 0.5) * WORLD_SIZE * 0.9,
      0,
      (Math.random() - 0.5) * WORLD_SIZE * 0.9
    );
    scene.add(prop);
    obstacles.push(prop);
  }

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

  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 60, 160);

  return { bounds: WORLD_SIZE / 2 - 1, obstacles, obstacleRadius: 1.2 };
}
