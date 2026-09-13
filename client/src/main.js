import * as THREE from "three";
import { createWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { updateCamera } from "./camera.js";
import { createMonsterRegistry, updateMonsterAnimations } from "./monsters.js";
import { createCombat, updateCombat, useSkill, getTarget, SKILL_COOLDOWN } from "./combat.js";
import { createHud } from "./hud.js";
import { connectNetwork, updateNetwork } from "./network.js";
import { checkSession, showAuthScreen } from "./auth.js";
import { createChat } from "./chat.js";
import { createInventory } from "./inventory.js";
import { loadModels } from "./models.js";

async function main() {
  const character = (await checkSession()) ?? (await showAuthScreen());
  await loadModels();

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const world = createWorld(scene);
  const player = createPlayer(scene);
  Object.assign(player, {
    level: character.level,
    hp: character.hp,
    maxHp: character.maxHp,
    xp: character.xp,
    xpToNext: character.xpToNext,
    attackDamage: character.attackDamage,
    zeny: character.zeny,
  });
  player.position.set(character.x, 0, character.z);
  player.rotation.y = character.rotationY;

  const monsterRegistry = createMonsterRegistry();
  const hud = createHud();

  let dead = false;
  let network;
  const chat = createChat((text) => network.sendChat(text));
  const inventory = createInventory((itemKey) => network.sendUseItem(itemKey));
  network = connectNetwork(scene, player, monsterRegistry, {
    onDied: () => {
      dead = true;
    },
    onRespawn: () => {
      dead = false;
    },
    onChat: chat.addLine,
    onInventory: inventory.setItems,
    onKicked: () => {
      alert("Logged in from another location.");
      window.location.reload();
    },
  });
  const combat = createCombat(camera, renderer.domElement, monsterRegistry);

  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.visible = false;
  scene.add(targetRing);

  window.addEventListener("keydown", (e) => {
    if (e.key === "1" && !dead) useSkill(combat, player, monsterRegistry, network);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function tick() {
    const delta = Math.min(clock.getDelta(), 0.1);

    player.mixer.update(delta);
    updateMonsterAnimations(monsterRegistry, delta);

    if (!dead) {
      updatePlayer(player, delta, world);
      updateCombat(combat, player, monsterRegistry, network, delta);
    }

    updateNetwork(network, player, delta);
    updateCamera(camera, player);

    const target = getTarget(combat, monsterRegistry);
    if (target) {
      targetRing.visible = true;
      targetRing.position.set(target.x, 0.05, target.z);
    } else {
      targetRing.visible = false;
    }

    hud.updatePlayer(player);
    hud.updateTarget(target);
    hud.updateSkill(combat.skillCooldown, SKILL_COOLDOWN);
    hud.setDead(dead);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

main();
