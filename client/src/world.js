import * as THREE from "three";
import { cloneModel } from "./models.js";

const WORLD_SIZE = 200;
const TILE_SIZE = 8;

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

export function createWorld(scene) {
  const textureLoader = new THREE.TextureLoader();
  const groundTexture = textureLoader.load("/textures/grass.jpg");
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(WORLD_SIZE / TILE_SIZE, WORLD_SIZE / TILE_SIZE);
  groundTexture.colorSpace = THREE.SRGBColorSpace;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 64, 64),
    new THREE.MeshStandardMaterial({ map: groundTexture })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

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
