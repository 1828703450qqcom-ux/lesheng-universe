// client/src/character/generation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableHash, pickStable, pickWeighted } from './hash.js';
import { safeHex, hexToHsl, hslToHex, tuneCharacterColor, paletteFromPhoto } from './palette.js';
import { defaultAppearance, normalizeAppearance, OPTIONS } from './schema.js';
import { buildCharacterProfile, ARCHETYPE_VARIANTS } from './generation.js';

test('stableHash is deterministic', () => {
  assert.equal(stableHash('abc'), stableHash('abc'));
  assert.notEqual(stableHash('abc'), stableHash('abd'));
});

test('pickStable is stable and in range', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.equal(pickStable(list, 'seed', 1), pickStable(list, 'seed', 1));
  assert.ok(list.includes(pickStable(list, 'seed', 1)));
});

test('safeHex rejects invalid', () => {
  assert.equal(safeHex('#aabbcc'), '#aabbcc');
  assert.equal(safeHex('nope', '#112233'), '#112233');
});

test('hex roundtrip keeps 6-digit hex', () => {
  const hex = hslToHex(210, 40, 50);
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const [h, s, l] = hexToHsl(hex);
  assert.ok(Math.abs(h - 210) <= 2);
  assert.ok(Math.abs(s - 40) <= 2);
  assert.ok(Math.abs(l - 50) <= 2);
});

test('tuneCharacterColor clamps s/l and returns hex', () => {
  const out = tuneCharacterColor('#ff0000', { minS: 20, maxS: 50, minL: 30, maxL: 70 });
  assert.match(out, /^#[0-9a-f]{6}$/i);
  const [, s, l] = hexToHsl(out);
  assert.ok(s >= 20 && s <= 50);
  assert.ok(l >= 30 && l <= 70);
});

test('paletteFromPhoto returns full token set', () => {
  const p = paletteFromPhoto({ color: '#789ea7', hairColor: '#2a2430', outfitColor: '#596e9d' }, 'seed');
  for (const key of ['skin', 'skinShadow', 'hair', 'hairHighlight', 'outfit', 'outfitDeep', 'accent', 'eye', 'lip']) {
    assert.match(p[key], /^#[0-9a-f]{6}$/i, key);
  }
});

test('normalizeAppearance fills defaults and keeps valid fields', () => {
  const a = normalizeAppearance({ hair: { style: 'bob' }, face: { eyeStyle: 'sharp' } });
  assert.equal(a.form, 'human');
  assert.equal(a.renderStyle, 'portrait');
  assert.equal(a.hair.style, 'bob');
  assert.equal(a.face.eyeStyle, 'sharp');
  assert.ok(OPTIONS.hairStyles.includes(a.hair.style));
});

const draftA = {
  story: '毕业以后，我想去远方看看，也想找到懂我的音乐。',
  goal: '寻找懂我的人',
  mbti: 'ENFP',
  song: '平凡之路',
  emotion: '期待',
  photo: { color: '#78c7b0', scene: '天空 / 城市冷调', hairColor: '#2a2430', outfitColor: '#4f847e', composition: '竖向人像' },
  variantSeed: 'v1'
};

const draftB = {
  story: '深夜写代码时总想有人陪我一起听歌。',
  goal: '找回自己的节奏',
  mbti: 'INTJ',
  song: '夜空中最亮的星',
  emotion: '焦虑',
  photo: { color: '#3a3550', scene: '夜景 / 低光', hairColor: '#1b1b2b', outfitColor: '#54517d', composition: '方形构图' },
  variantSeed: 'v2'
};

test('same draft is stable', () => {
  const a = buildCharacterProfile(draftA);
  const b = buildCharacterProfile(draftA);
  assert.deepEqual(a.appearance, b.appearance);
  assert.equal(a.variantId, b.variantId);
});

test('different drafts differ in appearance', () => {
  const a = buildCharacterProfile(draftA);
  const b = buildCharacterProfile(draftB);
  assert.notEqual(a.variantId, b.variantId);
  assert.notDeepEqual(a.appearance, b.appearance);
});

test('appearance uses human form and legal palette', () => {
  const a = buildCharacterProfile(draftA).appearance;
  assert.equal(a.form, 'human');
  assert.equal(a.renderStyle, 'portrait');
  for (const v of Object.values(a.palette)) assert.match(v, /^#[0-9a-f]{6}$/i);
});

test('generation metadata present', () => {
  const g = buildCharacterProfile(draftA).generation;
  assert.equal(g.engine, 'lesheng-character-v9-human-portrait');
  assert.ok(g.confidence >= 0.58 && g.confidence <= 0.98);
  assert.ok(Array.isArray(g.sources) && g.sources.length > 0);
});

test('eight drafts produce distinct fingerprints', () => {
  const drafts = [
    { story: '校园毕业', goal: '去远方', mbti: 'ENFP', song: '平凡之路', emotion: '期待', variantSeed: '1' },
    { story: '深夜失眠', goal: '找回节奏', mbti: 'INTJ', song: '夜空中最亮的星', emotion: '焦虑', variantSeed: '2' },
    { story: '想重新开始', goal: '好起来', mbti: 'INFP', song: '那些年', emotion: '低落', variantSeed: '3' },
    { story: '备考研究生', goal: '坚持计划', mbti: 'ISTJ', song: '夜空中最亮的星', emotion: '平静', variantSeed: '4' },
    { story: '想交朋友', goal: '找到懂我的人', mbti: 'ENFJ', song: '那些年', emotion: '兴奋', variantSeed: '5' },
    { story: '去城市旅行', goal: '自由出发', mbti: 'ESTP', song: '平凡之路', emotion: '兴奋', variantSeed: '6' },
    { story: '创作自己的歌', goal: '完成作品', mbti: 'ISFP', song: '平凡之路', emotion: '期待', variantSeed: '7' },
    { story: '陪伴家人', goal: '分享心情', mbti: 'ISFJ', song: '那些年', emotion: '平静', variantSeed: '8' }
  ];
  const ids = new Set();
  const looks = new Set();
  for (const d of drafts) {
    const p = buildCharacterProfile(d);
    ids.add(p.variantId);
    looks.add(JSON.stringify(p.appearance));
  }
  assert.equal(ids.size, 8);
  assert.equal(looks.size, 8);
});

test('pickWeighted prefers boosted values but stays stable', () => {
  const list = ['a', 'b', 'c'];
  const hits = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 200; i++) hits[pickWeighted(list, `seed-${i}`, 0, [5, 1, 1])] += 1;
  assert.ok(hits.a > hits.b && hits.a > hits.c);
  assert.equal(pickWeighted(list, 'x', 1, [1, 1, 1]), pickWeighted(list, 'x', 1, [1, 1, 1]));
});

test('hair and outfit keep chroma gap', () => {
  const p = buildCharacterProfile({
    story: 'x', goal: 'y', mbti: 'ENFP', song: '那些年', emotion: '期待',
    photo: { color: '#4f847e', hairColor: '#4a7a72', outfitColor: '#4f867e', scene: '自然' }, variantSeed: 'gap'
  }).appearance.palette;
  const hueOf = hex => {
    const v = hex.slice(1);
    const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    return h;
  };
  const delta = Math.abs(hueOf(p.hair) - hueOf(p.outfit));
  const gap = Math.min(delta, 360 - delta);
  assert.ok(gap >= 20, `chroma gap ${gap}`);
});

test('secondary archetype influences blend metadata', () => {
  const g = buildCharacterProfile(draftA).generation;
  assert.ok(g.blend.primary);
  assert.ok(g.blend.secondary);
  assert.notEqual(g.blend.primary, g.blend.secondary);
  assert.ok(g.sourceMap.dualBlend.includes(g.blend.primary));
});

test('generated hairstyle belongs to a story-linked visual variant', () => {
  for (const draft of [draftA, { story: '深夜听歌', goal: '找回节奏', mbti: 'INFP', song: '夜空中最亮的星' }, { story: '重新开始', goal: '改变自己', mbti: 'ISFJ', song: '平凡之路' }]) {
    const profile = buildCharacterProfile(draft);
    const { primary, secondary } = profile.generation.blend;
    const styles = [...ARCHETYPE_VARIANTS[primary], ...ARCHETYPE_VARIANTS[secondary]].map(item => item.hairStyle);
    assert.ok(styles.includes(profile.appearance.hair.style));
  }
});
