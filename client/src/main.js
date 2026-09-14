import * as THREE from "three";
import { createWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { createCameraController, updateCamera } from "./camera.js";
import { createMonsterRegistry, updateMonsterAnimations, updateMonsterPositions } from "./monsters.js";
import { createCombat, updateCombat, useSkill, getTarget, selectNearestTarget } from "./combat.js";
import { createHud } from "./hud.js";
import { connectNetwork, updateNetwork } from "./network.js";
import { checkSession, showAuthScreen } from "./auth.js";
import { showCharacterSelect } from "./characterSelect.js";
import { createChat } from "./chat.js";
import { createInventory } from "./inventory.js";
import { createEquipment } from "./equipment.js";
import { createCharacterSheet } from "./characterSheet.js";
import { createShop } from "./shop.js";
import { createActionBar } from "./actionBar.js";
import { applyEquipmentVisual } from "./equipVisual.js";
import { createNpcRegistry, updateNpcAnimations, getNearestNpc } from "./npc.js";
import { createZoneBanner } from "./zone.js";
import { loadModels } from "./models.js";
import { terrainHeight } from "./terrain.js";

const CLIENT_SHOP_RANGE = 4;

async function main() {
  const characters = (await checkSession()) ?? (await showAuthScreen());
  const character = await showCharacterSelect(characters);
  await loadModels();

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 650);
  camera.position.set(0, 6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const world = createWorld(scene);
  const player = createPlayer(scene);
  Object.assign(player, {
    name: character.name,
    level: character.level,
    hp: character.hp,
    maxHp: character.maxHp,
    xp: character.xp,
    xpToNext: character.xpToNext,
    attackDamage: character.attackDamage,
    gold: character.gold,
  });
  player.position.set(character.x, terrainHeight(character.x, character.z), character.z);
  player.rotation.y = character.rotationY;

  const monsterRegistry = createMonsterRegistry();
  const npcRegistry = createNpcRegistry();
  const hud = createHud();

  let dead = false;
  let network;
  let actionBar; // assigned below, after `combat` exists — referenced here
  // via closure the same way `network` itself already is.
  const chat = createChat((text) => network.sendChat(text));
  const inventory = createInventory(
    (itemKey) => network.sendUseItem(itemKey),
    (itemKey) => network.sendEquipItem(itemKey),
    (itemKey) => network.sendSellItem(itemKey)
  );
  const equipment = createEquipment((slot) => network.sendUnequipItem(slot));
  const characterSheet = createCharacterSheet();
  const shop = createShop((itemKey) => network.sendBuyItem(itemKey));
  const zoneBanner = createZoneBanner();
  network = connectNetwork(scene, player, monsterRegistry, npcRegistry, world, {
    onDied: () => {
      dead = true;
    },
    onRespawn: () => {
      dead = false;
    },
    onChat: chat.addLine,
    onInventory: (items) => {
      inventory.setItems(items);
      actionBar.setInventory(items);
    },
    onEquipment: (slots) => {
      equipment.setSlots(slots);
      characterSheet.setEquipment(slots);
      applyEquipmentVisual(player, slots);
    },
    onZones: zoneBanner.setZones,
    onKicked: () => {
      alert("Logged in from another location.");
      window.location.reload();
    },
    onDisconnected: () => {
      alert("Lost connection to the server. Reloading...");
      window.location.reload();
    },
  });
  const combat = createCombat(camera, renderer.domElement, monsterRegistry);
  const cameraController = createCameraController(renderer.domElement, player);
  actionBar = createActionBar(
    (skillId) => {
      if (!dead) useSkill(combat, player, monsterRegistry, network, skillId);
    },
    (itemKey) => network.sendUseItem(itemKey)
  );

  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.visible = false;
  scene.add(targetRing);

  window.addEventListener("keydown", (e) => {
    if ((e.key === "b" || e.key === "B") && shop.isInRange()) shop.toggle();
    if (e.key === "Tab") {
      e.preventDefault();
      if (!dead) selectNearestTarget(combat, player, monsterRegistry);
    }
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
    updateMonsterPositions(monsterRegistry, delta);
    updateNpcAnimations(npcRegistry, delta);
    const nearestNpc = getNearestNpc(player, npcRegistry);
    const nearNpc = nearestNpc && nearestNpc.distance <= CLIENT_SHOP_RANGE ? nearestNpc.data : null;
    shop.setNearby(nearNpc);
    inventory.setCanSell(!!nearNpc);
    shop.setGold(player.gold);
    zoneBanner.update(player, scene);

    if (!dead) {
      updatePlayer(player, delta, world);
      updateCombat(combat, player, monsterRegistry, network, delta);
    }

    updateNetwork(network, player, delta);
    updateCamera(camera, player, cameraController);

    const target = getTarget(combat, monsterRegistry);
    if (target) {
      targetRing.visible = true;
      targetRing.position.set(target.x, terrainHeight(target.x, target.z) + 0.05, target.z);
    } else {
      targetRing.visible = false;
    }

    hud.updatePlayer(player);
    hud.updateTarget(target);
    hud.setDead(dead);
    actionBar.setLevel(player.level);
    actionBar.setSkillCooldowns(combat.skillCooldowns);
    actionBar.setDisabled(dead);
    characterSheet.update(player);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

main();
