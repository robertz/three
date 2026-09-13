import { createPlayerMesh } from "./player.js";
import { applyMonsterSnapshot, flashHit } from "./monsters.js";
import { applyNpcSnapshot } from "./npc.js";
import { applyWorldSnapshot } from "./world.js";
import { setAnimation } from "./models.js";
import { lerp, lerpAngle, smoothingFactor } from "./interpolate.js";

const WS_URL = "ws://localhost:3001/game";
const SEND_INTERVAL = 0.1;
const POSITION_SMOOTHING = 10;
const WALK_THRESHOLD = 0.01;

export function connectNetwork(
  scene,
  player,
  registry,
  npcRegistry,
  world,
  { onDied, onRespawn, onChat, onInventory, onEquipment, onShopCatalog, onZones, onKicked, onDisconnected } = {}
) {
  let kicked = false;
  const state = {
    ws: null,
    remotePlayers: new Map(),
    sendTimer: 0,
    sendAttack(targetId) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "attack", targetId }));
      }
    },
    sendSkill(targetId) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "skill", targetId }));
      }
    },
    sendChat(text) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "chat", text }));
      }
    },
    sendUseItem(itemKey) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "useItem", itemKey }));
      }
    },
    sendEquipItem(itemKey) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "equipItem", itemKey }));
      }
    },
    sendUnequipItem(slot) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "unequipItem", slot }));
      }
    },
    sendBuyItem(itemKey) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "buyItem", itemKey }));
      }
    },
    sendSellItem(itemKey) {
      if (state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "sellItem", itemKey }));
      }
    },
  };
  const ws = new WebSocket(WS_URL);
  state.ws = ws;

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "welcome":
        msg.players.forEach((p) => addRemotePlayer(state, scene, p));
        applyMonsterSnapshot(scene, registry, msg.monsters);
        applyNpcSnapshot(scene, npcRegistry, msg.npcs);
        applyWorldSnapshot(scene, world, msg.mountains, msg.props);
        onZones?.(msg.zones);
        break;
      case "join":
        addRemotePlayer(state, scene, msg);
        break;
      case "move": {
        const remote = state.remotePlayers.get(msg.id);
        if (remote) {
          const movedDist = Math.hypot(msg.x - remote.target.x, msg.z - remote.target.z);
          setAnimation(remote, movedDist > WALK_THRESHOLD ? "walk" : "idle");
          remote.target = { x: msg.x, z: msg.z, rotationY: msg.rotationY };
        }
        break;
      }
      case "leave": {
        const remote = state.remotePlayers.get(msg.id);
        if (remote) {
          scene.remove(remote);
          state.remotePlayers.delete(msg.id);
        }
        break;
      }
      case "monsters":
        applyMonsterSnapshot(scene, registry, msg.list);
        break;
      case "monsterUpdate": {
        const entry = registry.get(msg.id);
        if (entry) {
          entry.data.hp = msg.hp;
          entry.data.alive = msg.alive;
          entry.mesh.visible = msg.alive;
          flashHit(registry, msg.id);
        }
        break;
      }
      case "stats":
        Object.assign(player, {
          level: msg.level,
          hp: msg.hp,
          maxHp: msg.maxHp,
          xp: msg.xp,
          xpToNext: msg.xpToNext,
          attackDamage: msg.attackDamage,
          gold: msg.gold,
        });
        break;
      case "chat":
        onChat?.(msg.username, msg.text);
        break;
      case "inventory":
        onInventory?.(msg.items);
        break;
      case "equipment":
        onEquipment?.(msg.slots);
        break;
      case "shopCatalog":
        onShopCatalog?.(msg.items);
        break;
      case "died":
        onDied?.();
        break;
      case "kicked":
        kicked = true;
        onKicked?.();
        break;
      case "respawn":
        player.position.set(msg.x, 0, msg.z);
        player.rotation.y = msg.rotationY;
        onRespawn?.();
        break;
    }
  });

  ws.addEventListener("close", () => {
    if (!kicked) onDisconnected?.();
  });

  return state;
}

function addRemotePlayer(state, scene, data) {
  if (state.remotePlayers.has(data.id)) return;

  const mesh = createPlayerMesh();
  mesh.position.set(data.x, 0, data.z);
  mesh.rotation.y = data.rotationY;
  mesh.target = { x: data.x, z: data.z, rotationY: data.rotationY };
  scene.add(mesh);
  state.remotePlayers.set(data.id, mesh);
}

export function updateNetwork(state, player, delta) {
  const t = smoothingFactor(delta, POSITION_SMOOTHING);
  for (const remote of state.remotePlayers.values()) {
    remote.mixer.update(delta);
    remote.position.x = lerp(remote.position.x, remote.target.x, t);
    remote.position.z = lerp(remote.position.z, remote.target.z, t);
    remote.rotation.y = lerpAngle(remote.rotation.y, remote.target.rotationY, t);
  }

  state.sendTimer -= delta;
  if (state.sendTimer > 0 || state.ws.readyState !== WebSocket.OPEN) return;

  state.sendTimer = SEND_INTERVAL;
  state.ws.send(JSON.stringify({ type: "move", x: player.position.x, z: player.position.z, rotationY: player.rotation.y }));
}
