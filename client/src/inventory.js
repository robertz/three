const RARITY_COLOR = { common: "#fff", rare: "#4a9eff" };

export function createInventory(sendUseItem, sendEquipItem, sendSellItem) {
  let items = [];
  let canSell = false;

  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;left:16px;bottom:190px;width:220px;background:rgba(0,0,0,0.5);padding:8px 12px;border-radius:6px;color:#fff;font-family:sans-serif;font-size:12px;display:none;pointer-events:auto;";
  document.body.appendChild(panel);

  function render() {
    if (items.length === 0) {
      panel.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Inventory [I]</div><div style="opacity:0.6;">Empty</div>`;
      return;
    }

    const rows = items
      .map(
        (item, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;" data-index="${i}">
          <span><span style="color:${RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common};">${item.name}</span> x${item.quantity}</span>
          <span>
            ${item.usable ? '<span class="inv-action" data-action="use" style="color:#4ea3d9;cursor:pointer;margin-left:6px;">Use</span>' : ""}
            ${item.equipSlot ? '<span class="inv-action" data-action="equip" style="color:#d4af37;cursor:pointer;margin-left:6px;">Equip</span>' : ""}
            ${item.sellPrice > 0 && canSell ? '<span class="inv-action" data-action="sell" style="color:#8a8a8a;cursor:pointer;margin-left:6px;">Sell</span>' : ""}
          </span>
        </div>`
      )
      .join("");

    panel.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Inventory [I]</div>${rows}`;

    panel.querySelectorAll(".inv-action").forEach((el) => {
      const row = el.closest("[data-index]");
      const item = items[Number(row.dataset.index)];
      const action = el.dataset.action;
      el.addEventListener("click", () => {
        if (action === "use") sendUseItem(item.key);
        if (action === "equip") sendEquipItem(item.key);
        if (action === "sell") sendSellItem(item.key);
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
