import { injectStyles } from "./hud.js";
import { rarityColor, iconFor } from "./itemDisplay.js";
import { ABILITIES } from "./abilities.js";

// Visual order matches WoW's own default action bar: 1-9 then 0. The
// first N slots (N = however many abilities the player has unlocked at
// their current level) are fixed ability slots; everything past that is
// a generic bindable item slot, same as before abilities existed.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const STORAGE_KEY = "three-actionbar-slots";

function loadBindings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBindings(bindings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Private browsing / storage disabled — bindings just won't persist.
  }
}

export function createActionBar(triggerSkill, sendUseItem) {
  injectStyles();

  // bindings[key] = { itemKey, name, rarity, usable } — a snapshot taken
  // at bind time (from the current inventory list, see bindSlot()), since
  // a depleted item's row disappears from the server's inventory list
  // entirely (see InventoryService.bx's removeItem) rather than sticking
  // around at quantity 0 — the slot still needs something to render from.
  const bindings = loadBindings();
  let items = [];
  let dead = false;
  let currentLevel = 1;
  const skillCooldowns = {}; // {abilityId: remainingSeconds}, from combat.js
  const lastReady = {}; // per-ability "skip the DOM write if unchanged" cache

  const bar = document.createElement("div");
  bar.className = "wow-hud";
  // Above the player panel (bottom-left, ~106px tall) rather than sharing
  // its row — bottom:16px would overlap it since this bar is centered and
  // wide while every other panel is corner-anchored and narrow.
  bar.style.cssText =
    "position:fixed;bottom:132px;left:50%;transform:translateX(-50%);display:flex;gap:4px;pointer-events:auto;";
  document.body.appendChild(bar);

  const slotEls = KEYS.map((key) => {
    const el = document.createElement("div");
    el.className = "wow-action-slot empty";
    el.innerHTML = `<div class="wow-action-slot-key">${key}</div>`;
    bar.appendChild(el);
    return el;
  });

  function unlockedAbilities() {
    return ABILITIES.filter((a) => a.levelRequired <= currentLevel);
  }

  function isAbilitySlot(index) {
    return index < unlockedAbilities().length;
  }

  function quantityFor(itemKey) {
    return items.find((i) => i.key === itemKey)?.quantity ?? 0;
  }

  function renderSlot(index) {
    const key = KEYS[index];
    const el = slotEls[index];

    if (isAbilitySlot(index)) {
      const ability = unlockedAbilities()[index];
      const remaining = skillCooldowns[ability.id] ?? 0;
      const ready = ability.cooldown > 0 ? Math.max(0, 1 - remaining / ability.cooldown) : 1;
      el.className = `wow-action-slot${dead ? " disabled" : ""}`;
      el.innerHTML = `${ability.icon}<div class="wow-action-slot-key">${key}</div><div class="wow-action-slot-cooldown" style="height:${(1 - ready) * 100}%;"></div>`;
      lastReady[ability.id] = ready;
      return;
    }

    const bound = bindings[key];
    if (!bound) {
      el.className = "wow-action-slot empty";
      el.style.borderColor = "";
      el.innerHTML = `<div class="wow-action-slot-key">${key}</div>`;
      return;
    }

    const qty = quantityFor(bound.itemKey);
    el.className = `wow-action-slot${qty <= 0 || dead ? " disabled" : ""}`;
    el.style.borderColor = rarityColor(bound.rarity);
    el.innerHTML = `
      ${iconFor(bound)}
      <div class="wow-action-slot-key">${key}</div>
      <div class="wow-action-slot-qty">${qty}</div>
    `;
  }

  function renderAll() {
    KEYS.forEach((_, index) => renderSlot(index));
  }

  function bindSlot(key, itemKey) {
    const item = items.find((i) => i.key === itemKey);
    if (!item || !item.usable) return;
    bindings[key] = { itemKey: item.key, name: item.name, rarity: item.rarity, usable: true, equipSlot: "" };
    saveBindings(bindings);
    renderSlot(KEYS.indexOf(key));
  }

  function clearSlot(key) {
    delete bindings[key];
    saveBindings(bindings);
    renderSlot(KEYS.indexOf(key));
  }

  function activateSlot(index) {
    if (dead) return;
    if (isAbilitySlot(index)) {
      triggerSkill(unlockedAbilities()[index].id);
      return;
    }
    const bound = bindings[KEYS[index]];
    if (bound && quantityFor(bound.itemKey) > 0) sendUseItem(bound.itemKey);
  }

  slotEls.forEach((el, index) => {
    el.addEventListener("click", () => activateSlot(index));

    // Checked live (at event time), not just once at attach-time — a slot
    // that flips from item-bindable to ability-owned after a level-up
    // must stop accepting drops/right-click-clear immediately, not just
    // after the next full re-render.
    el.addEventListener("dragover", (e) => {
      if (isAbilitySlot(index)) return;
      e.preventDefault();
      el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", (e) => {
      if (isAbilitySlot(index)) return;
      e.preventDefault();
      el.classList.remove("drag-over");
      const itemKey = e.dataTransfer.getData("text/plain");
      if (itemKey) bindSlot(KEYS[index], itemKey);
    });
    el.addEventListener("contextmenu", (e) => {
      if (isAbilitySlot(index)) return;
      e.preventDefault();
      clearSlot(KEYS[index]);
    });
  });

  window.addEventListener("keydown", (e) => {
    if (document.activeElement?.tagName === "INPUT") return;
    const index = KEYS.indexOf(e.key);
    if (index !== -1) activateSlot(index);
  });

  renderAll();

  return {
    setInventory(newItems) {
      items = newItems;
      // Only re-render bindable slots — cheap enough not to bother
      // diffing per-slot, this only runs on actual inventory changes
      // (a server push), not every frame.
      for (let i = 0; i < KEYS.length; i++) {
        if (!isAbilitySlot(i)) renderSlot(i);
      }
    },
    setLevel(level) {
      if (level === currentLevel) return;
      currentLevel = level;
      renderAll(); // the number of ability slots may have changed
    },
    setSkillCooldowns(cooldowns) {
      const unlocked = unlockedAbilities();
      for (let i = 0; i < unlocked.length; i++) {
        const ability = unlocked[i];
        const remaining = cooldowns[ability.id] ?? 0;
        const ready = ability.cooldown > 0 ? Math.max(0, 1 - remaining / ability.cooldown) : 1;
        if (lastReady[ability.id] === ready) continue;
        lastReady[ability.id] = ready;
        const cooldownEl = slotEls[i].querySelector(".wow-action-slot-cooldown");
        if (cooldownEl) cooldownEl.style.height = `${(1 - ready) * 100}%`;
      }
      // combat.js's per-skill cooldowns feed straight through so
      // renderSlot() (e.g. after a level-up) has fresh numbers too.
      Object.assign(skillCooldowns, cooldowns);
    },
    setDisabled(isDead) {
      if (isDead === dead) return;
      dead = isDead;
      renderAll();
    },
  };
}
