import { injectStyles, GOLD } from "./hud.js";

const BANNER_HOLD_MS = 3000;

export function createZoneBanner() {
  injectStyles();

  const banner = document.createElement("div");
  banner.className = "wow-hud";
  // top:86px clears the target nameplate (hud.js's targetPanel, also
  // top-center) so the two don't overlap when both are showing at once.
  banner.style.cssText = `position:fixed;top:86px;left:50%;transform:translateX(-50%);color:${GOLD};font-size:20px;letter-spacing:3px;text-shadow:0 2px 6px rgba(0,0,0,0.9);opacity:0;transition:opacity 1s;pointer-events:none;text-align:center;`;
  document.body.appendChild(banner);

  let zones = [];
  let currentKey = null;
  let hideTimer = null;

  function zoneAt(distance) {
    return zones.find((zone) => distance >= zone.minRadius && distance < zone.maxRadius) ?? zones[zones.length - 1];
  }

  return {
    setZones(list) {
      zones = list;
    },
    update(player) {
      if (!zones.length) return;

      const distance = Math.hypot(player.position.x, player.position.z);
      const zone = zoneAt(distance);
      if (!zone || zone.key === currentKey) return;

      currentKey = zone.key;
      banner.textContent = zone.name;
      banner.style.opacity = "1";
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        banner.style.opacity = "0";
      }, BANNER_HOLD_MS);
    },
  };
}
