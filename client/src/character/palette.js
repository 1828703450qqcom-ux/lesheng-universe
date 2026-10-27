// client/src/character/palette.js
export function safeHex(value, fallback = '#88a9d6') {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
}

export function hexToHsl(hex) {
  const value = safeHex(hex).slice(1);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return `#${[r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function tuneCharacterColor(color, { hueShift = 0, minS = 28, maxS = 58, minL = 34, maxL = 66 } = {}) {
  const [h, s, l] = hexToHsl(safeHex(color));
  return hslToHex(
    (h + hueShift + 360) % 360,
    Math.max(minS, Math.min(maxS, s)),
    Math.max(minL, Math.min(maxL, l))
  );
}

const SKIN_HUES = [18, 24, 28, 34, 40, 12];

export function paletteFromPhoto(photo = {}, seed = 'seed') {
  const base = safeHex(photo.color || '#789ea7');
  const [photoH, photoS] = hexToHsl(base);
  const hairSource = photo.hairColor || hslToHex((photoH + 200) % 360, 28, 22);
  const outfitSource = photo.outfitColor || hslToHex((photoH + 18) % 360, 36, 42);
  // Skin must stay in flesh-tone range: photo only nudges warm/cool slightly.
  const warmth = photoH >= 180 && photoH <= 300 ? -4 : photoH <= 60 || photoH >= 330 ? 4 : 0;
  const skinHue = ((SKIN_HUES[Math.abs(photoS + (seed?.length || 0)) % SKIN_HUES.length] + warmth) + 360) % 360;
  const skin = tuneCharacterColor(photo.skinHint || hslToHex(skinHue, 28, 72), { hueShift: 0, minS: 18, maxS: 32, minL: 62, maxL: 78 });
  const skinShadow = tuneCharacterColor(skin, { hueShift: -4, minS: 24, maxS: 42, minL: 40, maxL: 54 });
  const hair = tuneCharacterColor(hairSource, { minS: 18, maxS: 48, minL: 18, maxL: 42 });
  const [hairH, hairS, hairL] = hexToHsl(hair);
  return {
    skin,
    skinShadow,
    hair,
    hairHighlight: tuneCharacterColor(hslToHex(hairH, Math.max(18, hairS - 6), Math.min(72, hairL + 22)), { minS: 18, maxS: 52, minL: 48, maxL: 72 }),
    outfit: tuneCharacterColor(outfitSource, { minS: 24, maxS: 52, minL: 32, maxL: 55 }),
    outfitDeep: tuneCharacterColor(outfitSource, { hueShift: -8, minS: 28, maxS: 58, minL: 18, maxL: 34 }),
    accent: tuneCharacterColor(hslToHex((photoH + 145) % 360, 62, 70), { minS: 46, maxS: 72, minL: 62, maxL: 78 }),
    eye: tuneCharacterColor(hslToHex((photoH + 28) % 360, 36, 28), { minS: 24, maxS: 48, minL: 18, maxL: 36 }),
    lip: tuneCharacterColor('#c4787a', { minS: 28, maxS: 52, minL: 48, maxL: 62 })
  };
}
