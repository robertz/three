import { injectStyles } from "./hud.js";

const SLOT_LABELS = { weapon: "Weapon", helmet: "Helmet", chest: "Chest", trinket: "Trinket" };
const SLOT_ORDER = ["weapon", "helmet", "chest", "trinket"];
const RARITY_COLOR = { common: "#fff", rare: "#4a9eff" };

export function createEquipment(sendUnequipItem) {
  injectStyles();

  let slots = SLOT_ORDER.map((slot) => ({ slot, key: "", name: "" }));

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText = "position:fixed;left:16px;bottom:190px;width:220px;padding:10px 14px;display:none;pointer-events:auto;";
  document.body.appendChild(panel);

  function render() {
    const rows = SLOT_ORDER.map((slotKey) => {
      const entry = slots.find((s) => s.slot === slotKey) ?? { key: "", name: "" };
      const filled = Boolean(entry.key);
      const nameHtml = filled
        ? `<span style="color:${RARITY_COLOR[entry.rarity] ?? RARITY_COLOR.common};">${entry.name}</span>`
        : "Empty";
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;">
          <span>${SLOT_LABELS[slotKey]}: ${nameHtml}</span>
          ${filled ? `<span class="equip-action" data-slot="${slotKey}" style="color:#d4af37;cursor:pointer;margin-left:6px;">Unequip</span>` : ""}
        </div>`;
    }).join("");

    panel.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;">Equipment [E]</div>${rows}`;

    panel.querySelectorAll(".equip-action").forEach((el) => {
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
