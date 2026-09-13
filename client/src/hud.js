import { logout } from "./auth.js";

const GOLD = "#d4af37";

function injectStyles() {
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
    .wow-skill-fill { background: linear-gradient(180deg, #f0a94e 0%, #a85f12 100%); }

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

    .wow-skill-icon {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 5px;
      background: radial-gradient(circle at 35% 30%, #6b3a1a, #2a1608 75%);
      border: 2px solid ${GOLD};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      flex-shrink: 0;
    }

    .wow-skill-key {
      position: absolute;
      bottom: -3px;
      right: -3px;
      background: #14100a;
      border: 1px solid ${GOLD};
      color: ${GOLD};
      font-size: 9px;
      font-weight: 700;
      border-radius: 3px;
      padding: 0 3px;
      line-height: 12px;
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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
      <div id="hud-gold" style="font-size:12px;color:${GOLD};"></div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="wow-bar-track" style="height:6px;width:70px;">
          <div class="wow-bar-fill wow-skill-fill" id="hud-skill-bar" style="width:100%;"></div>
        </div>
        <div class="wow-skill-icon">
          ⚔
          <div class="wow-skill-key">1</div>
        </div>
      </div>
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
  const skillBarEl = playerPanel.querySelector("#hud-skill-bar");
  const targetNameEl = targetPanel.querySelector("#hud-target-name");
  const targetHpBarEl = targetPanel.querySelector("#hud-target-hp-bar");

  return {
    updatePlayer(player) {
      levelEl.textContent = player.level;
      hpBarEl.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
      hpTextEl.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;
      xpBarEl.style.width = `${(player.xp / player.xpToNext) * 100}%`;
      goldEl.innerHTML = `<span class="wow-gold-coin"></span>${player.gold}`;
    },
    updateTarget(target) {
      if (!target || !target.alive) {
        targetPanel.style.display = "none";
        return;
      }
      targetPanel.style.display = "block";
      targetNameEl.textContent = `${target.name}  ${Math.max(0, Math.round(target.hp))}/${target.maxHp}`;
      targetHpBarEl.style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
    },
    updateSkill(cooldownRemaining, cooldownTotal) {
      const ready = Math.max(0, 1 - cooldownRemaining / cooldownTotal);
      skillBarEl.style.width = `${ready * 100}%`;
    },
    setDead(isDead) {
      deathPanel.style.display = isDead ? "flex" : "none";
    },
  };
}
