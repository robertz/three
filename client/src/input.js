const keys = new Set();

window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

export function isDown(key) {
  return keys.has(key.toLowerCase());
}
