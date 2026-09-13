export function createInventory(sendUseItem, sendEquipItem) {
  let items = [];

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
          <span>${item.name} x${item.quantity}</span>
          <span>
            ${item.usable ? '<span class="inv-action" data-action="use" style="color:#4ea3d9;cursor:pointer;margin-left:6px;">Use</span>' : ""}
            ${item.equipSlot ? '<span class="inv-action" data-action="equip" style="color:#d4af37;cursor:pointer;margin-left:6px;">Equip</span>' : ""}
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
  };
}
