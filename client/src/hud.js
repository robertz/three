import { logout } from "./auth.js";

export const GOLD = "#d4af37";

export function injectStyles() {
  if (document.getElementById("wow-hud-style")) return;

  const style = document.createElement("style");
  style.id = "wow-hud-style";
  style.textContent = `
    .wow-hud, .wow-hud * { font-family: 'Cinzel', 'Times New Roman', serif; box-sizing: border-box; }

    .wow-panel {
      background:
        radial-gradient(circle at 7px 7px, ${GOLD} 0 2.5px, transparent 3.5px),
        radial-gradient(circle at calc(100% - 7px) 7px, ${GOLD} 0 2.5px, transparent 3.5px),
        radial-gradient(circle at 7px calc(100% - 7px), ${GOLD} 0 2.5px, transparent 3.5px),
        radial-gradient(circle at calc(100% - 7px) calc(100% - 7px), ${GOLD} 0 2.5px, transparent 3.5px),
        linear-gradient(160deg, #2b2013 0%, #14100a 100%);
      border: 2px solid ${GOLD};
      border-radius: 8px;
      box-shadow: 0 0 0 1px #000 inset, 0 4px 14px rgba(0,0,0,0.7);
      color: #f0e6c8;
    }

    .wow-portrait {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #4a3a22, #1a1208 75%);
      border: 3px solid ${GOLD};
      box-shadow: 0 0 6px rgba(0,0,0,0.8) inset, 0 0 4px rgba(212,175,55,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .wow-level-badge {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle, #f5d76e, #a8790f 80%);
      color: #2b1c05;
      font-weight: 700;
      font-size: 11px;
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid #3a2a08;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 2px;
    }

    .wow-bar-track {
      position: relative;
      background: #150f08;
      border: 1px solid #000;
      border-radius: 3px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.9);
      overflow: hidden;
    }

    .wow-bar-fill { height: 100%; transition: width 0.15s linear; }
    .wow-hp-fill { background: linear-gradient(180deg, #e06868 0%, #7a1f1f 100%); }
    .wow-xp-fill { background: linear-gradient(180deg, #f5d76e 0%, #a8790f 100%); }
    .wow-target-hp-fill { background: linear-gradient(180deg, #e06868 0%, #7a1f1f 100%); }

    .wow-bar-label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #fff;
      text-shadow: 0 1px 2px #000, 0 0 3px #000;
      letter-spacing: 0.5px;
    }

    .wow-gold-coin {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #f5d76e, #a8790f 80%);
      border: 1px solid #6b4e0f;
      margin-right: 5px;
      vertical-align: middle;
    }

    .wow-button {
      background: linear-gradient(180deg, #3a2c14 0%, #1a1208 100%);
      border: 2px solid ${GOLD};
      border-radius: 5px;
      color: #f0e6c8;
      font-size: 12px;
      padding: 6px 14px;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    .wow-button:hover { background: linear-gradient(180deg, #4a3a1e 0%, #241a0c 100%); }

    .wow-panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      color: ${GOLD};
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(212,175,55,0.35);
    }

    /* Shared by inventory rows, equipment slots, and the character sheet's
       gear summary — a square icon tile whose border color carries rarity
       (set inline per-item, since rarity isn't known until render time). */
    .wow-slot-icon {
      width: 30px;
      height: 30px;
      border-radius: 5px;
      background: radial-gradient(circle at 35% 30%, #3a2c18, #14100a 80%);
      border: 2px solid #6b5a3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .wow-slot-icon.empty { opacity: 0.4; border-style: dashed; }

    .wow-item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 4px;
      border-radius: 4px;
    }
    .wow-item-row:hover { background: rgba(212,175,55,0.08); }

    .wow-action-btn {
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 2px 7px;
      border-radius: 3px;
      border: 1px solid currentColor;
      cursor: pointer;
      white-space: nowrap;
    }
    .wow-action-btn:hover { background: rgba(255,255,255,0.12); }
    .wow-action-btn.disabled { cursor: default; opacity: 0.4; border-color: #555; }
    .wow-action-btn.disabled:hover { background: none; }

    /* The action bar's own slot tile — bigger than .wow-slot-icon since
       it's a primary always-visible HUD element, not a list-row icon. */
    .wow-action-slot {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: radial-gradient(circle at 35% 30%, #3a2c18, #14100a 80%);
      border: 2px solid #6b5a3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      overflow: hidden;
      user-select: none;
    }
    .wow-action-slot.empty { opacity: 0.45; border-style: dashed; cursor: default; }
    .wow-action-slot.disabled { opacity: 0.35; cursor: default; }
    .wow-action-slot.drag-over { border-color: ${GOLD}; box-shadow: 0 0 8px rgba(212,175,55,0.7); }

    .wow-action-slot-key {
      position: absolute;
      top: 1px;
      left: 2px;
      font-size: 8px;
      font-weight: 700;
      color: ${GOLD};
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    .wow-action-slot-qty {
      position: absolute;
      bottom: 0;
      right: 2px;
      font-size: 9px;
      font-weight: 700;
      color: #f0e6c8;
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    .wow-action-slot-cooldown {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.75);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export function createHud() {
  injectStyles();

  const container = document.createElement("div");
  container.className = "wow-hud";
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;color:#fff;";

  const playerPanel = document.createElement("div");
  playerPanel.className = "wow-panel";
  playerPanel.style.cssText = "position:absolute;left:16px;bottom:16px;width:260px;padding:12px;";
  playerPanel.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;">
      <div class="wow-portrait">
        ⚔
        <div class="wow-level-badge" id="hud-level"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
        <div class="wow-bar-track" style="height:16px;">
          <div class="wow-bar-fill wow-hp-fill" id="hud-hp-bar" style="width:100%;"></div>
          <div class="wow-bar-label" id="hud-hp-text"></div>
        </div>
        <div class="wow-bar-track" style="height:6px;">
          <div class="wow-bar-fill wow-xp-fill" id="hud-xp-bar" style="width:0%;"></div>
        </div>
      </div>
    </div>
    <div style="margin-top:10px;">
      <div id="hud-gold" style="font-size:12px;color:${GOLD};"></div>
    </div>
  `;
  container.appendChild(playerPanel);

  const logoutButton = document.createElement("button");
  logoutButton.className = "wow-button";
  logoutButton.textContent = "Log Out";
  logoutButton.style.cssText = "position:absolute;top:16px;right:16px;pointer-events:auto;";
  logoutButton.addEventListener("click", () => logout());
  container.appendChild(logoutButton);

  const targetPanel = document.createElement("div");
  targetPanel.className = "wow-panel";
  targetPanel.style.cssText =
    "position:absolute;top:16px;left:50%;transform:translateX(-50%);width:220px;padding:8px 12px;display:none;";
  targetPanel.innerHTML = `
    <div id="hud-target-name" style="font-size:13px;margin-bottom:5px;text-align:center;letter-spacing:0.5px;"></div>
    <div class="wow-bar-track" style="height:12px;">
      <div class="wow-bar-fill wow-target-hp-fill" id="hud-target-hp-bar" style="width:100%;"></div>
    </div>
  `;
  container.appendChild(targetPanel);

  const deathPanel = document.createElement("div");
  deathPanel.style.cssText =
    "position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(40,0,0,0.45);";
  deathPanel.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:52px;font-weight:700;letter-spacing:3px;color:#c0392b;text-shadow:0 0 12px rgba(0,0,0,0.9),0 0 24px rgba(192,57,43,0.6);">You Have Died</div>
    <div style="font-family:'Cinzel',serif;font-size:16px;margin-top:10px;color:${GOLD};letter-spacing:1px;">Resurrecting...</div>
  `;
  container.appendChild(deathPanel);

  document.body.appendChild(container);

  const levelEl = playerPanel.querySelector("#hud-level");
  const hpBarEl = playerPanel.querySelector("#hud-hp-bar");
  const hpTextEl = playerPanel.querySelector("#hud-hp-text");
  const xpBarEl = playerPanel.querySelector("#hud-xp-bar");
  const goldEl = playerPanel.querySelector("#hud-gold");
  const targetNameEl = targetPanel.querySelector("#hud-target-name");
  const targetHpBarEl = targetPanel.querySelector("#hud-target-hp-bar");

  // Called every animation frame from main.js's tick() regardless of
  // whether anything actually changed since the last one — these caches
  // let each updater skip its DOM writes (textContent/style.width, and
  // goldEl's own innerHTML reparse) when the values it would write are
  // identical to last time, the same "no-op if unchanged" idea
  // inventory.js's setCanSell() already uses.
  let lastLevel, lastHp, lastMaxHp, lastXp, lastXpToNext, lastGold;
  let lastTargetId, lastTargetHp, lastTargetMaxHp;

  return {
    updatePlayer(player) {
      if (player.level !== lastLevel) {
        levelEl.textContent = player.level;
        lastLevel = player.level;
      }
      if (player.hp !== lastHp || player.maxHp !== lastMaxHp) {
        hpBarEl.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
        hpTextEl.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;
        lastHp = player.hp;
        lastMaxHp = player.maxHp;
      }
      if (player.xp !== lastXp || player.xpToNext !== lastXpToNext) {
        xpBarEl.style.width = `${(player.xp / player.xpToNext) * 100}%`;
        lastXp = player.xp;
        lastXpToNext = player.xpToNext;
      }
      if (player.gold !== lastGold) {
        goldEl.innerHTML = `<span class="wow-gold-coin"></span>${player.gold}`;
        lastGold = player.gold;
      }
    },
    updateTarget(target) {
      if (!target || !target.alive) {
        if (lastTargetId !== null) {
          targetPanel.style.display = "none";
          lastTargetId = null;
        }
        return;
      }
      if (target.id === lastTargetId && target.hp === lastTargetHp && target.maxHp === lastTargetMaxHp) return;

      targetPanel.style.display = "block";
      targetNameEl.textContent = `${target.name}  Lv.${target.level}  ${Math.max(0, Math.round(target.hp))}/${target.maxHp}`;
      targetHpBarEl.style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
      lastTargetId = target.id;
      lastTargetHp = target.hp;
      lastTargetMaxHp = target.maxHp;
    },
    setDead(isDead) {
      deathPanel.style.display = isDead ? "flex" : "none";
    },
  };
}
