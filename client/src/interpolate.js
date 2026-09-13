export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpAngle(a, b, t) {
  const twoPi = Math.PI * 2;
  const diff = (((b - a + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
  return a + diff * t;
}

// Frame-rate independent smoothing factor for exponential lerp toward a
// target — rate is roughly "how many times per second to close the gap".
export function smoothingFactor(delta, rate) {
  return 1 - Math.exp(-rate * delta);
}
