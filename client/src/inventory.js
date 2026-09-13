export function createInventory(sendUseItem) {
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
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;${item.usable ? "cursor:pointer;" : ""}" data-index="${i}">
          <span>${item.name} x${item.quantity}</span>
          ${item.usable ? '<span style="color:#4ea3d9;">Use</span>' : ""}
        </div>`
      )
      .join("");

    panel.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Inventory [I]</div>${rows}`;

    panel.querySelectorAll("[data-index]").forEach((row) => {
      const item = items[Number(row.dataset.index)];
      if (item.usable) {
        row.addEventListener("click", () => sendUseItem(item.key));
      }
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
