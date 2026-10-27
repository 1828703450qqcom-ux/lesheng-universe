// client/src/character/hash.js
export function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickStable(list, seed, offset = 0) {
  if (!list?.length) return undefined;
  const idx = (stableHash(`${seed}|${offset}`) % list.length + list.length) % list.length;
  return list[idx];
}

/** Weighted stable pick. `weights` aligns with `list` (missing → 1). */
export function pickWeighted(list, seed, offset = 0, weights = []) {
  if (!list?.length) return undefined;
  const w = list.map((_, i) => Math.max(0.01, Number(weights[i]) || 1));
  const total = w.reduce((sum, v) => sum + v, 0);
  let roll = (stableHash(`${seed}|w|${offset}`) % 10000) / 10000 * total;
  for (let i = 0; i < list.length; i++) {
    roll -= w[i];
    if (roll <= 0) return list[i];
  }
  return list[list.length - 1];
}

export function appearanceFingerprint(appearance) {
  return stableHash(JSON.stringify(appearance));
}
