import { injectStyles, GOLD } from "./hud.js";
import { rarityColor, iconFor } from "./itemDisplay.js";

const SLOT_LABELS = { weapon: "Weapon", helmet: "Helmet", chest: "Chest", trinket: "Trinket" };
const SLOT_ORDER = ["weapon", "helmet", "chest", "trinket"];

export function createEquipment(sendUnequipItem) {
  injectStyles();

  let slots = SLOT_ORDER.map((slot) => ({ slot, key: "", name: "" }));

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText = "position:fixed;left:282px;bottom:190px;width:230px;padding:10px 12px;display:none;pointer-events:auto;";
  document.body.appendChild(panel);

  function render() {
    const boxes = SLOT_ORDER.map((slotKey) => {
      const entry = slots.find((s) => s.slot === slotKey) ?? { key: "", name: "" };
      const filled = Boolean(entry.key);
      const color = filled ? rarityColor(entry.rarity) : "#6b5a3a";

      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px;">
          <div class="wow-slot-icon ${filled ? "" : "empty"}" style="width:44px;height:44px;font-size:20px;border-color:${color};" data-slot="${slotKey}">
            ${iconFor({ slot: slotKey })}
          </div>
          <div style="font-size:10px;color:#8a7a58;letter-spacing:0.5px;">${SLOT_LABELS[slotKey]}</div>
          <div style="font-size:11px;color:${color};text-align:center;min-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px;">${filled ? entry.name : "Empty"}</div>
          ${filled ? `<span class="wow-action-btn" data-slot="${slotKey}" style="color:${GOLD};">Unequip</span>` : ""}
        </div>`;
    }).join("");

    panel.innerHTML = `
      <div class="wow-panel-title">Equipment [E]</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 6px;justify-items:center;">${boxes}</div>
    `;

    panel.querySelectorAll(".wow-action-btn").forEach((el) => {
      el.addEventListener("click", () => sendUnequipItem(el.dataset.slot));
    });
  }

  window.addEventListener("keydown", (e) => {
    if (document.activeElement?.tagName === "INPUT") return;
    if (e.key === "e" || e.key === "E") {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    }
  });

  render();

  return {
    setSlots(newSlots) {
      slots = newSlots;
      render();
    },
  };
}
