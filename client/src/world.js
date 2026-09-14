import * as THREE from "three";
import { cloneModel } from "./models.js";
import { terrainHeight } from "./terrain.js";

// Matches the server's GameConfig worldBounds (430) via WORLD_SIZE =
// 2 * (worldBounds + 1) — see player.js, which clamps movement to
// world.bounds = WORLD_SIZE / 2 - 1.
const WORLD_SIZE = 862;
const TILE_SIZE = 8;
// MeshStandardMaterial multiplies vertex color against the texture (there's
// no additive/overlay blend available without a custom shader) — a mid-tone
// tint here crushes the grass texture's brightness far more than expected,
// especially once fog blends it at range, so this needs to stay light.
//
// How wide (in world units) each zone-to-zone tint blend is, centered on
// the shared boundary radius, so the ground shifts gradually between the
// two zones' colors rather than snapping across a hard seam.
const TINT_TRANSITION = 18;

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

const MOUNTAIN_TINT = 0x76899f;

// player.js's collision check used to scan every obstacle (props + rock
// footprints) every frame it moved — cheap when there were a few dozen,
// wasteful now that the world has ~400. Bucketing by a uniform grid cell
// lets that check look at only the handful of obstacles actually near the
// query point instead of the whole list. Comfortably bigger than any prop
// radius, but an obstacle is inserted into every cell its own circle
// overlaps (not just the one containing its center), so a larger mountain
// footprint spanning multiple cells still can't be missed by a single-cell
// query at a point on its far edge.
const OBSTACLE_CELL_SIZE = 20;
// player.js's actual collision test is against `obstacle.radius +
// PLAYER_RADIUS`, not just the obstacle's own radius — padding the
// insertion bounds by the same amount here (duplicated rather than
// imported, to avoid a circular import with player.js, which itself
// imports nearbyObstacles from this file) keeps a query point that's
// only inside that extra margin, in a cell the bare obstacle radius
// wouldn't have reached, from missing the obstacle entirely.
const COLLISION_MARGIN = 0.5;

function obstacleCellKey(cx, cz) {
  return `${cx},${cz}`;
}

function addToObstacleGrid(grid, obstacle) {
  const { position, radius } = obstacle;
  const paddedRadius = radius + COLLISION_MARGIN;
  const minCx = Math.floor((position.x - paddedRadius) / OBSTACLE_CELL_SIZE);
  const maxCx = Math.floor((position.x + paddedRadius) / OBSTACLE_CELL_SIZE);
  const minCz = Math.floor((position.z - paddedRadius) / OBSTACLE_CELL_SIZE);
  const maxCz = Math.floor((position.z + paddedRadius) / OBSTACLE_CELL_SIZE);

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const key = obstacleCellKey(cx, cz);
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(obstacle);
    }
  }
}

// player.js calls this with its candidate next position instead of
// iterating world.obstacles directly.
export function nearbyObstacles(world, x, z) {
  const key = obstacleCellKey(Math.floor(x / OBSTACLE_CELL_SIZE), Math.floor(z / OBSTACLE_CELL_SIZE));
  return world.obstacleGrid.get(key) ?? [];
}

// The ground itself only needs to be WORLD_SIZE across for the actual
// playable area (obstacle scatter and the player's movement clamp — see
// player.js — both key off WORLD_SIZE/world.bounds and are unrelated to
// this), but rendering it at only that size left a visible gap of bare sky
// between its edge and the mountain ring's base. This is a purely visual
// extension past the play area, comfortably inside the skydome.
const GROUND_VISUAL_SIZE = 1000;

const SKY_HORIZON_COLOR = 0xcfe6ef;
const SKY_ZENITH_COLOR = 0x4a7fd6;

// Zones arrive from the server (see zoneSnapshot() in GameConfig.bx) as
// {minRadius, maxRadius, groundTint} keyed off distance from the origin —
// converts that wire shape into {minRadius, maxRadius, color: THREE.Color}
// once, so every per-vertex/per-instance tint lookup below is just a
// lerp, not a hex-to-Color conversion repeated thousands of times.
export function prepareZones(rawZones) {
  return rawZones
    .slice()
    .sort((a, b) => a.minRadius - b.minRadius)
    .map((z) => ({ ...z, color: new THREE.Color(z.groundTint) }));
}

// The color a point `distance` units from the origin should be tinted,
// blending smoothly across each zone boundary (see TINT_TRANSITION) rather
// than snapping. Used for the ground's per-vertex colors, each mountain/prop
// instance's accent tint, and (see zone.js) the fog/sky color as the player
// crosses zones — one continuous gradient driving all of a zone's "own
// style" cues off the same distance-from-origin math the server already
// uses to decide which zone a point belongs to.
export function zoneColorAt(distance, zones) {
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (distance < zone.minRadius || distance >= zone.maxRadius) continue;

    if (i > 0) {
      const tIn = THREE.MathUtils.clamp((distance - zone.minRadius) / TINT_TRANSITION, 0, 1);
      if (tIn < 1) return zones[i - 1].color.clone().lerp(zone.color, tIn);
    }
    if (i < zones.length - 1) {
      const tOut = THREE.MathUtils.clamp((zone.maxRadius - distance) / TINT_TRANSITION, 0, 1);
      if (tOut < 1) return zone.color.clone().lerp(zones[i + 1].color, 1 - tOut);
    }
    return zone.color;
  }
  return zones[zones.length - 1].color;
}

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
  // the horizon. Painting each zone's tint on as a per-vertex color gradient
  // instead sidesteps that entirely, and reads as a soft, natural transition
  // rather than a hard ring seam. Segment count is high (256) because with
  // 8 zone boundaries to blend smoothly across (TINT_TRANSITION = 18 world
  // units each), a coarser grid visibly bands the gradient.
  //
  // Colors start uninitialized (plain white map, no tint) — recolorGround()
  // below fills them in once the server's zone list actually arrives.
  const geometry = new THREE.PlaneGeometry(GROUND_VISUAL_SIZE, GROUND_VISUAL_SIZE, 256, 256);
  const colors = new Float32Array(geometry.attributes.position.count * 3).fill(1);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Local X/Y is world X/Z here (same fact recolorGround's own comment
  // relies on) — displacing local Z is what becomes world height once the
  // -90° X rotation below is applied, giving the ground real walkable
  // hills instead of a flat plane with only color variation.
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, terrainHeight(positions.getX(i), positions.getY(i)));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: groundTexture, vertexColors: true }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

// Recomputes the ground's per-vertex colors from the zone list — called
// once applyWorldSnapshot() has the real zones (see network.js's "welcome"
// handler), since createWorld() runs before any server data has arrived.
function recolorGround(ground, zones) {
  const positions = ground.geometry.attributes.position;
  const colorAttr = ground.geometry.attributes.color;

  for (let i = 0; i < positions.count; i++) {
    // The plane is still flat in local XY here (rotated into the world's
    // XZ ground plane below), so local X/Y is world X/Z.
    const distance = Math.hypot(positions.getX(i), positions.getY(i));
    const color = zoneColorAt(distance, zones);
    colorAttr.setXYZ(i, color.r, color.g, color.b);
  }
  colorAttr.needsUpdate = true;
}

// A big inverted sphere the camera always sits well inside of, painted with
// a vertical vertex-color gradient — pale near the horizon, deeper blue
// overhead. fog is turned off on its material: at the sphere's radius every
// point is already past the fog's far distance, so leaving fog on would
// just flatten the whole gradient back to one solid fog color.
function createSkydome() {
  const radius = 560;
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
  const ground = createGround(textureLoader);
  scene.add(ground);

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
  // into the sky rather than into the old flat sky color. zone.js repaints
  // both toward the current zone's tint once real zone data arrives.
  scene.background = new THREE.Color(SKY_HORIZON_COLOR);
  scene.fog = new THREE.Fog(SKY_HORIZON_COLOR, 60, 260);

  // obstacles/obstacleGrid start empty and are filled in by
  // applyWorldSnapshot() once the server's prop/mountain layout arrives —
  // player.js holds this same object for its collision check (via
  // nearbyObstacles()), so populating them later is enough, no need to
  // hand back a new object. ground is kept so applyWorldSnapshot can
  // recolor it once zone data shows up.
  return { bounds: WORLD_SIZE / 2 - 1, obstacles: [], obstacleGrid: new Map(), ground };
}

// Renders the server-authoritative prop/mountain layout (see the "World
// layout" section of server/app.bxs) so every connected client sees the
// identical arrangement instead of each rolling its own random one, and
// tints the ground/mountains/props to match each instance's zone. Called
// once, when the "welcome" message arrives (see network.js).
export function applyWorldSnapshot(scene, world, zones, mountains, props) {
  recolorGround(world.ground, zones);

  const mountainTint = new THREE.Color(MOUNTAIN_TINT);

  for (const m of mountains) {
    const { scene: rock } = cloneModel(m.type);
    const zoneTint = zoneColorAt(Math.hypot(m.x, m.z), zones);
    rock.traverse((obj) => {
      if (obj.isMesh) {
        // Desaturate toward stone-grey first, then a light pass of the
        // zone's own tint on top — enough to read as "this zone's rock"
        // (frostier, ashier, etc.) without losing the rock look entirely.
        obj.material.color.lerp(mountainTint, 0.7).lerp(zoneTint, 0.3);
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

    rock.position.set(m.x, terrainHeight(m.x, m.z) + peakAboveGround - box.max.y, m.z);
    scene.add(rock);

    // A circular collision footprint sized off the wider of the rock's
    // (post-rotation) X/Z extents — not exact for an irregular rock shape,
    // but consistent with the simple circular collision every other
    // obstacle in this game already uses.
    const footprintRadius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    const rockObstacle = { position: rock.position, radius: footprintRadius };
    world.obstacles.push(rockObstacle);
    addToObstacleGrid(world.obstacleGrid, rockObstacle);
  }

  for (const p of props) {
    const { scene: prop } = cloneModel(p.type);
    const zoneTint = zoneColorAt(Math.hypot(p.x, p.z), zones);
    prop.traverse((obj) => {
      if (obj.isMesh) obj.material.color.lerp(zoneTint, 0.3);
    });
    prop.scale.setScalar(PROP_SCALE[p.type] ?? 2);
    prop.rotation.y = p.rotationY;
    prop.position.set(p.x, terrainHeight(p.x, p.z), p.z);
    scene.add(prop);
    const propObstacle = { position: prop.position, radius: PROP_RADIUS };
    world.obstacles.push(propObstacle);
    addToObstacleGrid(world.obstacleGrid, propObstacle);
  }
}
