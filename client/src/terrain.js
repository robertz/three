// Deterministic, closed-form terrain height — no noise library needed, and
// no server-side port needed either: every entity's x/z already reaches
// every client unchanged over the existing wire protocol, so each client
// independently computes the same height for the same (x, z) instead of
// the server needing to know or send it. Layered sin/cos "hills" keep this
// cheap enough to call once per entity per frame.
const WAVE_A = { amplitude: 4, freq: (2 * Math.PI) / 90, phaseX: 0, phaseZ: 0 };
const WAVE_B = { amplitude: 1.2, freq: (2 * Math.PI) / 35, phaseX: 1.7, phaseZ: 0.4 };

export function terrainHeight(x, z) {
  return (
    Math.sin(x * WAVE_A.freq + WAVE_A.phaseX) * Math.cos(z * WAVE_A.freq + WAVE_A.phaseZ) * WAVE_A.amplitude +
    Math.sin(x * WAVE_B.freq + WAVE_B.phaseX) * Math.cos(z * WAVE_B.freq + WAVE_B.phaseZ) * WAVE_B.amplitude
  );
}
