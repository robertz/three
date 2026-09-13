import { logout } from "./auth.js";

export function createHud() {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;font-family:sans-serif;color:#fff;";

  const playerPanel = document.createElement("div");
  playerPanel.style.cssText =
    "position:absolute;left:16px;bottom:16px;width:220px;background:rgba(0,0,0,0.5);padding:8px 12px;border-radius:6px;";
  playerPanel.innerHTML = `
    <div id="hud-level" style="font-weight:bold;margin-bottom:4px;"></div>
    <div style="background:#333;border-radius:4px;overflow:hidden;height:10px;margin-bottom:4px;">
      <div id="hud-hp-bar" style="background:#d94e4e;height:100%;width:100%;"></div>
    </div>
    <div style="background:#333;border-radius:4px;overflow:hidden;height:6px;margin-bottom:6px;">
      <div id="hud-xp-bar" style="background:#4ea3d9;height:100%;width:0%;"></div>
    </div>
    <div id="hud-zeny" style="font-size:12px;color:#f5d76e;margin-bottom:6px;"></div>
    <div style="font-size:11px;margin-bottom:2px;">Bash [1]</div>
    <div style="background:#333;border-radius:4px;overflow:hidden;height:6px;">
      <div id="hud-skill-bar" style="background:#8a6fd1;height:100%;width:100%;"></div>
    </div>
  `;
  container.appendChild(playerPanel);

  const logoutButton = document.createElement("button");
  logoutButton.textContent = "Log Out";
  logoutButton.style.cssText =
    "position:absolute;top:16px;right:16px;pointer-events:auto;padding:6px 12px;border:none;border-radius:4px;background:rgba(0,0,0,0.5);color:#fff;font-size:12px;cursor:pointer;";
  logoutButton.addEventListener("click", () => logout());
  container.appendChild(logoutButton);

  const targetPanel = document.createElement("div");
  targetPanel.style.cssText =
    "position:absolute;top:16px;left:50%;transform:translateX(-50%);width:220px;background:rgba(0,0,0,0.5);padding:6px 12px;border-radius:6px;display:none;";
  targetPanel.innerHTML = `
    <div id="hud-target-name" style="font-size:13px;margin-bottom:4px;"></div>
    <div style="background:#333;border-radius:4px;overflow:hidden;height:8px;">
      <div id="hud-target-hp-bar" style="background:#e08fd0;height:100%;width:100%;"></div>
    </div>
  `;
  container.appendChild(targetPanel);

  const deathPanel = document.createElement("div");
  deathPanel.style.cssText =
    "position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(80,0,0,0.35);";
  deathPanel.innerHTML = `
    <div style="font-size:48px;font-weight:bold;letter-spacing:2px;">YOU DIED</div>
    <div style="font-size:16px;margin-top:8px;">Respawning...</div>
  `;
  container.appendChild(deathPanel);

  document.body.appendChild(container);

  const levelEl = playerPanel.querySelector("#hud-level");
  const hpBarEl = playerPanel.querySelector("#hud-hp-bar");
  const xpBarEl = playerPanel.querySelector("#hud-xp-bar");
  const zenyEl = playerPanel.querySelector("#hud-zeny");
  const skillBarEl = playerPanel.querySelector("#hud-skill-bar");
  const targetNameEl = targetPanel.querySelector("#hud-target-name");
  const targetHpBarEl = targetPanel.querySelector("#hud-target-hp-bar");

  return {
    updatePlayer(player) {
      levelEl.textContent = `Lv. ${player.level}  HP ${Math.max(0, Math.round(player.hp))}/${player.maxHp}`;
      hpBarEl.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
      xpBarEl.style.width = `${(player.xp / player.xpToNext) * 100}%`;
      zenyEl.textContent = `${player.zeny}z`;
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
