// Client-side mirror of server/game/GameConfig.bx's skillTypes — for
// display and the same courtesy pre-checks (range/facing/execute-
// threshold) already established for the plain attack, never the actual
// authority. The server re-validates every field that matters
// (level/cooldown/range/facing/threshold) on every cast regardless of
// what the client already checked.
export const ABILITIES = [
  { id: "heroicStrike", name: "Heroic Strike", icon: "⚔", levelRequired: 1, cooldown: 4, requiresTarget: true, effect: "singleTarget" },
  { id: "cleave", name: "Cleave", icon: "🌪", levelRequired: 5, cooldown: 6, requiresTarget: false, effect: "cleave" },
  { id: "execute", name: "Execute", icon: "☠", levelRequired: 12, cooldown: 8, requiresTarget: true, effect: "execute", executeThreshold: 0.25 },
  { id: "rampage", name: "Rampage", icon: "🔥", levelRequired: 20, cooldown: 25, requiresTarget: false, effect: "selfBuff" },
];
