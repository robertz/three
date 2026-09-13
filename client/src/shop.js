import { injectStyles, GOLD } from "./hud.js";
import { rarityColor, iconFor } from "./itemDisplay.js";

export function createShop(sendBuyItem) {
  injectStyles();

  let merchantName = "";
  let catalog = [];
  let gold = 0;
  let inRange = false;
  let currentNpcId = null;

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;padding:12px 14px;display:none;pointer-events:auto;";
  document.body.appendChild(panel);

  const hint = document.createElement("div");
  hint.className = "wow-hud";
  hint.textContent = "Press B to shop";
  hint.style.cssText =
    "position:fixed;bottom:200px;left:50%;transform:translateX(-50%);color:#fff;font-size:13px;text-shadow:0 1px 3px #000;display:none;pointer-events:none;";
  document.body.appendChild(hint);

  function render() {
    const rows = catalog
      .map((item) => {
        const affordable = gold >= item.price;
        return `
        <div class="wow-item-row" data-key="${item.key}">
          <div class="wow-slot-icon" style="border-color:${rarityColor(item.rarity)};">${iconFor(item)}</div>
          <div style="flex:1;color:${rarityColor(item.rarity)};font-size:12px;">${item.name}</div>
          <span style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;"><span class="wow-gold-coin"></span>${item.price}</span>
            <span class="wow-action-btn ${affordable ? "" : "disabled"}" data-key="${item.key}" style="color:${affordable ? GOLD : "#555"};">Buy</span>
          </span>
        </div>`;
      })
      .join("");

    panel.innerHTML = `<div class="wow-panel-title">${merchantName}</div>${rows}`;

    panel.querySelectorAll(".wow-action-btn:not(.disabled)").forEach((el) => {
      const item = catalog.find((i) => i.key === el.dataset.key);
      el.addEventListener("click", () => sendBuyItem(item.key));
    });
  }

  return {
    // npc is the nearby merchant's data ({id, name, catalog, ...}, see
    // npc.js's getNearestNpc) when the player is within shop range of one,
    // or null otherwise — one call keeps "which merchant" and "am I in
    // range of them" from ever going out of sync, unlike the old separate
    // setCatalog()/setInRange() pair. Called every frame (main.js's tick
    // loop re-derives "which npc, if any" each frame), so it only
    // re-renders when the nearby merchant actually changes, not on every
    // call — a naive unconditional render() here would rebuild the shop
    // panel's DOM 60 times a second while just standing near a vendor.
    setNearby(npc) {
      const value = !!npc;
      if (value && npc.id !== currentNpcId) {
        merchantName = npc.name;
        catalog = npc.catalog;
        render();
      }
      currentNpcId = value ? npc.id : null;
      inRange = value;
      hint.style.display = value && panel.style.display === "none" ? "block" : "none";
      if (!value) panel.style.display = "none";
    },
    setGold(newGold) {
      if (newGold === gold) return;
      gold = newGold;
      render();
    },
    isInRange() {
      return inRange;
    },
    toggle() {
      if (!inRange) return;
      const opening = panel.style.display === "none";
      panel.style.display = opening ? "block" : "none";
      hint.style.display = opening ? "none" : "block";
    },
  };
}
