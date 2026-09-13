import { injectStyles, GOLD } from "./hud.js";

export function createShop(sendBuyItem) {
  injectStyles();

  let catalog = [];
  let gold = 0;
  let inRange = false;

  const panel = document.createElement("div");
  panel.className = "wow-hud wow-panel";
  panel.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:260px;padding:14px;display:none;pointer-events:auto;";
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
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;">
          <span>${item.name}</span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span><span class="wow-gold-coin"></span>${item.price}</span>
            <span class="shop-buy" data-key="${item.key}" style="color:${affordable ? GOLD : "#555"};cursor:${affordable ? "pointer" : "default"};">Buy</span>
          </span>
        </div>`;
      })
      .join("");

    panel.innerHTML = `<div style="font-weight:bold;margin-bottom:8px;text-align:center;">Gilda the Vendor</div>${rows}`;

    panel.querySelectorAll(".shop-buy").forEach((el) => {
      const item = catalog.find((i) => i.key === el.dataset.key);
      if (gold >= item.price) {
        el.addEventListener("click", () => sendBuyItem(item.key));
      }
    });
  }

  return {
    setCatalog(items) {
      catalog = items;
      render();
    },
    setGold(newGold) {
      if (newGold === gold) return;
      gold = newGold;
      render();
    },
    setInRange(value) {
      inRange = value;
      hint.style.display = value && panel.style.display === "none" ? "block" : "none";
      if (!value) panel.style.display = "none";
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
