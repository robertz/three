import { injectStyles, GOLD } from "./hud.js";
import { rarityColor, iconFor } from "./itemDisplay.js";

export function createInventory(sendUseItem, sendEquipItem, sendSellItem) {
  injectStyles();

  let items = [];
  let canSell = false;

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText = "position:fixed;left:16px;bottom:190px;width:250px;max-height:320px;padding:10px 12px;display:none;pointer-events:auto;overflow-y:auto;";
  document.body.appendChild(panel);

  function actionButton(label, color, action) {
    return `<span class="wow-action-btn" data-action="${action}" style="color:${color};">${label}</span>`;
  }

  function render() {
    if (items.length === 0) {
      panel.innerHTML = `<div class="wow-panel-title">Inventory [I]</div><div style="opacity:0.55;text-align:center;font-size:12px;padding:8px 0;">Your bags are empty.</div>`;
      return;
    }

    const rows = items
      .map((item, i) => {
        const actions = [
          item.usable ? actionButton("Use", "#7ec9e0", "use") : "",
          item.equipSlot ? actionButton("Equip", GOLD, "equip") : "",
          item.sellPrice > 0
            ? canSell
              ? actionButton("Sell", "#b0a488", "sell")
              : `<span class="wow-action-btn disabled" title="Stand near a merchant to sell">Sell</span>`
            : "",
        ].join("");

        return `
        <div class="wow-item-row" data-index="${i}">
          <div class="wow-slot-icon" ${item.usable ? 'draggable="true"' : ""} style="border-color:${rarityColor(item.rarity)};${item.usable ? "cursor:grab;" : ""}" title="${item.usable ? "Drag onto the action bar to bind" : ""}">${iconFor(item)}</div>
          <div style="flex:1;min-width:0;">
            <div style="color:${rarityColor(item.rarity)};font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}${item.quantity > 1 ? ` <span style="color:#8a7a58;">x${item.quantity}</span>` : ""}</div>
          </div>
          <div style="display:flex;gap:4px;">${actions}</div>
        </div>`;
      })
      .join("");

    panel.innerHTML = `<div class="wow-panel-title">Inventory [I]</div>${rows}`;

    panel.querySelectorAll(".wow-action-btn:not(.disabled)").forEach((el) => {
      const row = el.closest("[data-index]");
      const item = items[Number(row.dataset.index)];
      const action = el.dataset.action;
      el.addEventListener("click", () => {
        if (action === "use") sendUseItem(item.key);
        if (action === "equip") sendEquipItem(item.key);
        if (action === "sell") sendSellItem(item.key);
      });
    });

    panel.querySelectorAll('.wow-slot-icon[draggable="true"]').forEach((el) => {
      const row = el.closest("[data-index]");
      const item = items[Number(row.dataset.index)];
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.key);
      });
    });
  }

  window.addEventListener("keydown", (e) => {
    if (document.activeElement?.tagName === "INPUT") return;
    if (e.key === "i" || e.key === "I") {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    }
  });

  render();

  return {
    setItems(newItems) {
      items = newItems;
      render();
    },
    setCanSell(value) {
      if (value === canSell) return;
      canSell = value;
      render();
    },
  };
}
