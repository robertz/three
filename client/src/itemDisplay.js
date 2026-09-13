// Shared display lookups for anything that renders an item — inventory,
// equipment, and the character sheet's gear summary all need the same
// rarity color and slot glyph, and having three copies drift is worse than
// one place importing from here. No item icon assets exist (see
// GameConfig.bx's itemTypes — just name/stat fields, no sprite), so a
// small set of unicode glyphs keyed off equipSlot/usable stands in for
// real icon art.
export const RARITY_COLOR = { common: "#fff", rare: "#4a9eff" };

const SLOT_ICON = { weapon: "⚔", helmet: "🪖", chest: "🛡", trinket: "💍" };

export function rarityColor(rarity) {
  return RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
}

// item is either an inventory row ({equipSlot, usable, ...}) or an
// equipment slot's fixed slotKey — accepts either shape since inventory
// items carry their own equipSlot but an equipment slot box needs the
// icon even when empty (nothing equipped, no item to read equipSlot off).
export function iconFor(item) {
  const slot = item?.equipSlot || item?.slot;
  if (slot) return SLOT_ICON[slot];
  if (item?.usable) return "✦";
  return "◆";
}
