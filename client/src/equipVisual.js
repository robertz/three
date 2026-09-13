import * as THREE from "three";

// Same two-tier convention as the item-name colors in inventory.js/
// equipment.js/shop.js, expressed as THREE.Color-friendly hex ints instead
// of CSS strings — reskinning one procedural/built-in mesh per tier rather
// than sourcing distinct art per item, matching this repo's existing
// "reskin, don't source new art for every tier" pattern (Alpha Boar/Dire
// Wolf are tinted reskins of Boar/Wolf, not new models).
const TINT = { common: 0xb0b0b0, rare: 0x4a9eff };

function createWeaponProp() {
  const group = new THREE.Group();
  // handslotr's own rest rotation (a ~90° twist baked into the source rig)
  // would otherwise point the blade out sideways from the hand — this
  // counter-rotation was tuned by eye in-browser to hang it naturally
  // instead, same "tune by eye" precedent as the monster model scales.
  group.rotation.z = Math.PI / 2;

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.6, 0.02),
    new THREE.MeshStandardMaterial({ color: TINT.common, metalness: 0.3, roughness: 0.4 })
  );
  blade.position.y = 0.45;

  const hilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, metalness: 0, roughness: 0.8 })
  );

  group.add(hilt, blade);
  group.userData.blade = blade;
  return group;
}

function applyTint(mesh, filled, rarity) {
  if (!filled) return;
  mesh.material.color.set(TINT[rarity] ?? TINT.common);
}

// Called for the local player only — the server never broadcasts other
// players' equipment, so remote players never carry a visual here (nor
// stats, that's a separate limitation this doesn't change).
export function applyEquipmentVisual(playerMesh, slots) {
  const bySlot = Object.fromEntries(slots.map((s) => [s.slot, s]));

  // GLTFLoader sanitizes node names (strips ".") — the source rig names
  // this bone "handslot.r", but it loads as "handslotr".
  const handSlot = playerMesh.getObjectByName("handslotr");
  if (handSlot) {
    if (!playerMesh.userData.weaponProp) {
      playerMesh.userData.weaponProp = createWeaponProp();
      handSlot.add(playerMesh.userData.weaponProp);
    }
    const weapon = bySlot.weapon;
    const filled = Boolean(weapon?.key);
    playerMesh.userData.weaponProp.visible = filled;
    if (filled) playerMesh.userData.weaponProp.userData.blade.material.color.set(TINT[weapon.rarity] ?? TINT.common);
  }

  const helmet = bySlot.helmet;
  const helmetFilled = Boolean(helmet?.key);
  for (const name of ["Knight_Helmet", "Knight_HelmetVisor"]) {
    const mesh = playerMesh.getObjectByName(name);
    if (!mesh) continue;
    mesh.visible = helmetFilled;
    applyTint(mesh, helmetFilled, helmet?.rarity);
  }

  const chest = bySlot.chest;
  const chestFilled = Boolean(chest?.key);
  const body = playerMesh.getObjectByName("Knight_Body");
  if (body) {
    if (chestFilled) {
      applyTint(body, true, chest.rarity);
    } else if (body.userData.baseColor) {
      body.material.color.copy(body.userData.baseColor);
    }
  }

  // Trinket: intentionally no visual — no attachment point on this rig,
  // and real WoW doesn't render trinkets on the character either.
}
