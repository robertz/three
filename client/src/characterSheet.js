import { injectStyles, GOLD } from "./hud.js";
import { rarityColor, iconFor } from "./itemDisplay.js";

const SLOT_ORDER = ["weapon", "helmet", "chest", "trinket"];

// A fuller stat sheet than the always-on corner HUD (name, per-stat
// numbers, XP progress, and a compact read of what's equipped) — same
// underlying player/equipment data the HUD and Equipment panel already
// have, just laid out for "let me actually look at my character" rather
// than a glanceable in-combat strip.
export function createCharacterSheet() {
  injectStyles();

  let player = null;
  let slots = SLOT_ORDER.map((slot) => ({ slot, key: "", name: "" }));
  // update() is called every animation frame regardless of whether
  // anything actually changed — unlike the always-visible HUD, render()
  // here is a full innerHTML rebuild (reparse + event listeners N/A, but
  // still real DOM churn), so it's worth a signature check rather than
  // the cheaper per-field guards hud.js uses. player is the same mutated
  // object every call (main.js never reassigns it), so this has to
  // compare values, not just the reference.
  let lastRenderSignature = null;

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText = "position:fixed;right:16px;top:64px;width:230px;padding:12px 14px;display:none;pointer-events:auto;";
  document.body.appendChild(panel);

  function statRow(label, value) {
    return `
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
        <span style="color:#8a7a58;">${label}</span>
        <span>${value}</span>
      </div>`;
  }

  function renderSignature() {
    return [
      player.name,
      player.level,
      player.xp,
      player.xpToNext,
      player.attackDamage,
      player.maxHp,
      player.gold,
      ...slots.map((s) => `${s.slot}:${s.key}:${s.rarity ?? ""}`),
    ].join("|");
  }

  function render() {
    if (!player) return;
    lastRenderSignature = renderSignature();

    const gear = SLOT_ORDER.map((slotKey) => {
      const entry = slots.find((s) => s.slot === slotKey) ?? { key: "" };
      const filled = Boolean(entry.key);
      const color = filled ? rarityColor(entry.rarity) : "#6b5a3a";
      return `<div class="wow-slot-icon ${filled ? "" : "empty"}" style="width:26px;height:26px;font-size:13px;border-color:${color};" title="${filled ? entry.name : "Empty"}">${iconFor({ slot: slotKey })}</div>`;
    }).join("");

    panel.innerHTML = `
      <div class="wow-panel-title">Character [C]</div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
        <div class="wow-portrait" style="width:44px;height:44px;font-size:19px;">
          ⚔
          <div class="wow-level-badge" style="font-size:10px;width:16px;height:16px;">${player.level}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${player.name ?? "Adventurer"}</div>
          <div style="font-size:10px;color:#8a7a58;">Level ${player.level}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:10px;color:#8a7a58;margin-bottom:2px;">
        <span>Experience</span>
        <span>${player.xp} / ${player.xpToNext}</span>
      </div>
      <div class="wow-bar-track" style="height:7px;margin-bottom:10px;">
        <div class="wow-bar-fill wow-xp-fill" style="width:${(player.xp / player.xpToNext) * 100}%;"></div>
      </div>

      ${statRow("Attack Damage", player.attackDamage)}
      ${statRow("Max Health", player.maxHp)}
      ${statRow("Gold", `<span class="wow-gold-coin"></span>${player.gold}`)}

      <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(212,175,55,0.35);">
        <div style="font-size:10px;color:#8a7a58;margin-bottom:6px;">Equipped</div>
        <div style="display:flex;gap:6px;">${gear}</div>
      </div>
    `;
  }

  window.addEventListener("keydown", (e) => {
    if (document.activeElement?.tagName === "INPUT") return;
    if (e.key === "c" || e.key === "C") {
      const opening = panel.style.display === "none";
      panel.style.display = opening ? "block" : "none";
      if (opening) render();
    }
  });

  function renderIfChanged() {
    if (panel.style.display === "none" || !player) return;
    if (renderSignature() === lastRenderSignature) return;
    render();
  }

  return {
    update(newPlayer) {
      player = newPlayer;
      renderIfChanged();
    },
    setEquipment(newSlots) {
      slots = newSlots;
      renderIfChanged();
    },
  };
}
