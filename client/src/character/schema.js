// client/src/character/schema.js — appearance tokens for cute human portrait
export const OPTIONS = {
  faceShapes: ['round', 'oval', 'soft', 'heart', 'bright'],
  brows: ['flat', 'arc', 'lift', 'soft'],
  eyeStyles: ['round', 'almond', 'sharp', 'dreamy', 'smile'],
  mouths: ['smile', 'calm', 'soft-open', 'neutral'],
  cheeks: ['soft', 'glow', 'spark', 'freckle'],
  expressions: ['smile', 'calm', 'joy', 'quiet', 'thoughtful'],
  hairStyles: ['soft', 'wave', 'short', 'long', 'bob', 'curl', 'undercut', 'twin', 'ponytail', 'braid', 'leaf', 'neat'],
  builds: ['slim', 'balanced', 'compact'],
  poses: ['steady', 'lean-left', 'lean-right', 'open'],
  silhouettes: ['balanced', 'round', 'tiny'],
  outfitCuts: ['classic', 'structured', 'layered', 'sport', 'cape'],
  outfitPatterns: ['plain', 'constellation', 'wave', 'split', 'badge'],
  auras: ['orbit', 'moon', 'stars', 'sun', 'pulse', 'echo']
};

export const DEFAULT_PALETTE = {
  skin: '#f6d9c4',
  skinShadow: '#d4a184',
  hair: '#3a2c3d',
  hairHighlight: '#8b6a7a',
  outfit: '#6d8fc9',
  outfitDeep: '#4a6699',
  accent: '#ffd166',
  eye: '#3d2f4a',
  lip: '#e08a8a'
};

export function defaultAppearance() {
  return {
    form: 'human',
    renderStyle: 'portrait',
    archetype: 'campus',
    palette: { ...DEFAULT_PALETTE },
    face: {
      shape: 'soft',
      brow: 'arc',
      eyeStyle: 'almond',
      eyeColor: DEFAULT_PALETTE.eye,
      mouth: 'smile',
      cheek: 'glow',
      expression: 'smile'
    },
    hair: { style: 'soft', highlight: DEFAULT_PALETTE.hairHighlight },
    body: { build: 'balanced', pose: 'steady', silhouette: 'balanced' },
    outfit: { cut: 'classic', pattern: 'plain', accent: DEFAULT_PALETTE.accent },
    fx: { aura: 'orbit', accessory: '✈', propLabel: '纸飞机' }
  };
}

const clampEnum = (value, list, fallback) => (list.includes(value) ? value : fallback);

export function normalizeAppearance(raw = {}) {
  const base = defaultAppearance();
  const palette = { ...base.palette, ...(raw.palette || {}) };
  if (raw.skin) palette.skin = raw.skin;
  if (raw.hair && typeof raw.hair === 'string') palette.hair = raw.hair;
  if (raw.outfit && typeof raw.outfit === 'string') palette.outfit = raw.outfit;
  if (raw.accent && typeof raw.accent === 'string') palette.accent = raw.accent;
  return {
    form: 'human',
    renderStyle: 'portrait',
    archetype: raw.archetype || base.archetype,
    palette,
    face: {
      ...base.face,
      ...(raw.face || {}),
      shape: clampEnum(raw.face?.shape || raw.faceShape, OPTIONS.faceShapes, base.face.shape),
      brow: clampEnum(raw.face?.brow, OPTIONS.brows, base.face.brow),
      eyeStyle: clampEnum(raw.face?.eyeStyle || raw.eyeStyle, OPTIONS.eyeStyles, base.face.eyeStyle),
      mouth: clampEnum(raw.face?.mouth, OPTIONS.mouths, base.face.mouth),
      cheek: clampEnum(raw.face?.cheek || raw.cheekStyle, OPTIONS.cheeks, base.face.cheek),
      expression: clampEnum(raw.face?.expression || raw.expression, OPTIONS.expressions, base.face.expression)
    },
    hair: {
      ...base.hair,
      ...(raw.hair && typeof raw.hair === 'object' ? raw.hair : {}),
      style: clampEnum(raw.hair?.style || raw.hairStyle, OPTIONS.hairStyles, base.hair.style)
    },
    body: {
      ...base.body,
      ...(raw.body || {}),
      build: clampEnum(raw.body?.build || raw.build, OPTIONS.builds, base.body.build),
      pose: clampEnum(raw.body?.pose || raw.pose, OPTIONS.poses, base.body.pose),
      silhouette: clampEnum(raw.body?.silhouette || raw.silhouette, OPTIONS.silhouettes, base.body.silhouette)
    },
    outfit: {
      ...base.outfit,
      ...(raw.outfit || {}),
      cut: clampEnum(raw.outfit?.cut || raw.outfitStyle, OPTIONS.outfitCuts, base.outfit.cut),
      pattern: clampEnum(raw.outfit?.pattern || raw.outfitPattern, OPTIONS.outfitPatterns, base.outfit.pattern)
    },
    fx: {
      ...base.fx,
      ...(raw.fx || {}),
      aura: clampEnum(raw.fx?.aura || raw.aura, OPTIONS.auras, base.fx.aura),
      accessory: raw.fx?.accessory || raw.accessory || base.fx.accessory,
      propLabel: raw.fx?.propLabel || raw.propLabel || base.fx.propLabel
    }
  };
}
