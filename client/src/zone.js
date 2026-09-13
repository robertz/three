import * as THREE from "three";
import { injectStyles, GOLD } from "./hud.js";
import { zoneColorAt } from "./world.js";

const BANNER_HOLD_MS = 3000;
// How strongly each zone's ground tint bleeds into the fog/sky color — a
// full-strength tint would fog the whole screen crimson in Dragon's Maw;
// this keeps it a mood-setting wash instead of a solid color swap.
const ATMOSPHERE_STRENGTH = 0.4;

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
  const baseFog = new THREE.Color(0xcfe6ef);
  const atmosphere = new THREE.Color();

  function zoneAt(distance) {
    return zones.find((zone) => distance >= zone.minRadius && distance < zone.maxRadius) ?? zones[zones.length - 1];
  }

  return {
    setZones(list) {
      zones = list;
    },
    // scene is optional — callers that only care about the banner text
    // (there are none currently, but keeping this cheap to call without a
    // scene costs nothing) can omit it.
    update(player, scene) {
      if (!zones.length) return;

      const distance = Math.hypot(player.position.x, player.position.z);

      if (scene) {
        atmosphere.copy(baseFog).lerp(zoneColorAt(distance, zones), ATMOSPHERE_STRENGTH);
        scene.fog.color.copy(atmosphere);
        scene.background.copy(atmosphere);
      }

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
