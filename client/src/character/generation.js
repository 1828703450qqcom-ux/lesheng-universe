// client/src/character/generation.js
import { stableHash, pickStable, pickWeighted, appearanceFingerprint } from './hash.js';
import { paletteFromPhoto, tuneCharacterColor, safeHex, hexToHsl, hslToHex } from './palette.js';
import { normalizeAppearance, OPTIONS, DEFAULT_PALETTE } from './schema.js';

export const MBTI_PROFILES = {
  INTJ: { title: '星轨建筑师', group: '分析家', trait: '深谋远虑', color: '#9b8fe3', icon: '◇', aura: 'orbit' },
  INTP: { title: '银河逻辑师', group: '分析家', trait: '好奇求真', color: '#8fa9e3', icon: '⌁', aura: 'stars' },
  ENTJ: { title: '节拍指挥官', group: '分析家', trait: '果断领航', color: '#a78bda', icon: '◆', aura: 'pulse' },
  ENTP: { title: '灵感变奏家', group: '分析家', trait: '机敏创新', color: '#799fd8', icon: '✦', aura: 'echo' },
  INFJ: { title: '深海提灯人', group: '外交家', trait: '洞察共情', color: '#72c5ae', icon: '☾', aura: 'moon' },
  INFP: { title: '月光诗行者', group: '外交家', trait: '温柔理想', color: '#86c9b4', icon: '❋', aura: 'echo' },
  ENFJ: { title: '温度领航员', group: '外交家', trait: '热忱感染', color: '#6fd0ad', icon: '♥', aura: 'sun' },
  ENFP: { title: '流星追梦人', group: '外交家', trait: '自由热烈', color: '#76d1b7', icon: '✺', aura: 'stars' },
  ISTJ: { title: '时序守望者', group: '守护者', trait: '可靠严谨', color: '#71a6c7', icon: '▣', aura: 'orbit' },
  ISFJ: { title: '回忆收藏家', group: '守护者', trait: '细腻守护', color: '#7eb4ca', icon: '✉', aura: 'moon' },
  ESTJ: { title: '城市节拍长', group: '守护者', trait: '务实担当', color: '#699aba', icon: '✓', aura: 'pulse' },
  ESFJ: { title: '暖场同行者', group: '守护者', trait: '友善体贴', color: '#83b8c8', icon: '◎', aura: 'sun' },
  ISTP: { title: '静默调音师', group: '探险家', trait: '冷静灵巧', color: '#d4a269', icon: '△', aura: 'orbit' },
  ISFP: { title: '色彩拾音者', group: '探险家', trait: '敏感随性', color: '#d79b78', icon: '✿', aura: 'echo' },
  ESTP: { title: '现场点火者', group: '探险家', trait: '大胆行动', color: '#dc8d65', icon: '✶', aura: 'pulse' },
  ESFP: { title: '舞台闪光体', group: '探险家', trait: '明亮欢快', color: '#df9873', icon: '✧', aura: 'sun' }
};

export const SONG_PROFILES = {
  '那些年': { signals: { campus: 5, messenger: 1 }, reason: '校园与告别的音乐记忆' },
  '夜空中最亮的星': { signals: { night: 4, achiever: 2 }, reason: '深夜、坚持与微光的音乐记忆' },
  '平凡之路': { signals: { voyager: 5, rebirth: 1 }, reason: '出发、自由与成长的音乐记忆' }
};

export const CHARACTER_ARCHETYPES = {
  campus: { name: '纸飞机少年', traits: ['细腻', '念旧', '仍想出发'], keywords: /校园|毕业|青春|同学|告别|回忆|那些年/g, color: '#88a9d6', prop: '纸飞机', reason: '照片与故事里带有校园、告别和出发的线索', baseHair: '#292434', baseOutfit: '#596e9d' },
  night: { name: '夜航拾光者', traits: ['安静', '敏锐', '仍在坚持'], keywords: /夜|深夜|焦虑|失眠|孤独|低落|一个人|夜空/g, color: '#6f79b8', prop: '月光耳机', reason: '深夜情绪与代表歌曲共同形成了夜航人格', baseHair: '#232033', baseOutfit: '#54517d' },
  voyager: { name: '远行观星者', traits: ['好奇', '自由', '勇敢向前'], keywords: /远方|旅行|出发|自由|城市|远行|看看/g, color: '#63b6a6', prop: '星图背包', reason: '“远方”和“出发”成为角色最强烈的成长方向', baseHair: '#3d342e', baseOutfit: '#4f847e' },
  rebirth: { name: '微光新生', traits: ['柔韧', '明亮', '重新生长'], keywords: /重新|开始|新生|改变|重启|好起来/g, color: '#dc9d72', prop: '发光种子', reason: '文字中的“重新开始”被转译成生长与微光', baseHair: '#5b3431', baseOutfit: '#a75e55' },
  achiever: { name: '节拍执行官', traits: ['专注', '可靠', '稳步前进'], keywords: /完成|目标|考试|考研|坚持|计划|舞台|重要的事/g, color: '#6688b8', prop: '节拍罗盘', reason: '明确目标与行动感生成了稳定的节奏型人格', baseHair: '#282b35', baseOutfit: '#3f567b' },
  messenger: { name: '回声信使', traits: ['温柔', '善于倾听', '期待连接'], keywords: /朋友|理解|相遇|陪伴|懂我|分享|祝福|一起/g, color: '#b9859c', prop: '回声明信片', reason: '故事中关于理解、陪伴与相遇的愿望最突出', baseHair: '#432f3b', baseOutfit: '#865b75' }
};

const ARCHETYPE_KEYS = Object.keys(CHARACTER_ARCHETYPES);
const MBTI_SIGNAL_WEIGHTS = { 分析家: { achiever: 3, night: 1 }, 外交家: { messenger: 4, rebirth: 1 }, 守护者: { campus: 2, achiever: 3 }, 探险家: { voyager: 4, rebirth: 1 } };
const EMOTION_SIGNALS = { 焦虑: { night: 3, achiever: 1 }, 低落: { night: 3, messenger: 1 }, 兴奋: { voyager: 2, messenger: 2 }, 期待: { voyager: 1, campus: 1 }, 平静: { campus: 1, night: 1 } };
const EMOTION_EXPRESSIONS = { 焦虑: 'thoughtful', 低落: 'quiet', 兴奋: 'joy', 期待: 'smile', 平静: 'calm' };

const PROP_ICONS = ['✈', '♫', '☾', '✦', '❋', '✓', '✉', '◇', '⌁', '♡', '☼', '✶'];
const VISUAL_WARDROBE = {
  campus: { cuts: ['layered', 'classic'], patterns: ['badge', 'plain'] },
  night: { cuts: ['cape', 'layered'], patterns: ['constellation', 'wave'] },
  voyager: { cuts: ['sport', 'cape'], patterns: ['split', 'wave'] },
  rebirth: { cuts: ['layered', 'classic'], patterns: ['wave', 'badge'] },
  achiever: { cuts: ['structured', 'classic'], patterns: ['badge', 'split'] },
  messenger: { cuts: ['classic', 'layered'], patterns: ['badge', 'plain'] }
};

export const ARCHETYPE_VARIANTS = {
  campus: [{ suffix: '纸飞机', trait: '把告别折成远方', hairStyle: 'soft', accessory: '✈', aura: 'orbit' }, { suffix: '旧唱片', trait: '把回忆留在旋律里', hairStyle: 'neat', accessory: '♫', aura: 'echo' }, { suffix: '晚风', trait: '温柔但不停止出发', hairStyle: 'wave', accessory: '❋', aura: 'stars' }],
  night: [{ suffix: '月光', trait: '在安静里积蓄勇气', hairStyle: 'wave', accessory: '☾', aura: 'moon' }, { suffix: '蓝调', trait: '把孤独调成自己的节拍', hairStyle: 'long', accessory: '◌', aura: 'echo' }, { suffix: '微光', trait: '在低落时仍然保留希望', hairStyle: 'leaf', accessory: '✦', aura: 'pulse' }],
  voyager: [{ suffix: '星图', trait: '把未知走成自己的路', hairStyle: 'short', accessory: '✦', aura: 'stars' }, { suffix: '旷野', trait: '不为远方设定边界', hairStyle: 'soft', accessory: '◇', aura: 'sun' }, { suffix: '潮汐', trait: '顺着心里的方向出发', hairStyle: 'long', accessory: '⌁', aura: 'orbit' }],
  rebirth: [{ suffix: '种子', trait: '正在重新长出光', hairStyle: 'leaf', accessory: '❋', aura: 'sun' }, { suffix: '新芽', trait: '柔软地改变自己的节奏', hairStyle: 'soft', accessory: '✿', aura: 'echo' }, { suffix: '晨曦', trait: '把明天写成新的副歌', hairStyle: 'short', accessory: '☼', aura: 'pulse' }],
  achiever: [{ suffix: '罗盘', trait: '一步一步靠近目标', hairStyle: 'neat', accessory: '✓', aura: 'pulse' }, { suffix: '节拍', trait: '让坚持拥有清晰的节奏', hairStyle: 'short', accessory: '▣', aura: 'orbit' }, { suffix: '灯塔', trait: '在压力里保持方向感', hairStyle: 'wave', accessory: '⌖', aura: 'stars' }],
  messenger: [{ suffix: '回声', trait: '愿意先听见另一个人', hairStyle: 'long', accessory: '✉', aura: 'echo' }, { suffix: '来信', trait: '把心意送到对方身边', hairStyle: 'soft', accessory: '✦', aura: 'moon' }, { suffix: '暖场', trait: '让陌生的情绪慢慢靠近', hairStyle: 'leaf', accessory: '♡', aura: 'sun' }]
};

// Note: `pattern` is the match regex; `outfitPattern` is the outfit enum (plan had a duplicate `pattern` key that clobbered the regex).
const GOAL_MOTIFS = [
  { pattern: /旅行|远方|城市|出发|自由|看看/, icon: '⌁', label: '远行罗盘', cut: 'cape' },
  { pattern: /考试|考研|学习|上岸|备考|计划|复习/, icon: '✓', label: '节拍罗盘', cut: 'structured' },
  { pattern: /创作|音乐|唱歌|画|写|作品|舞台/, icon: '♫', label: '灵感唱片', outfitPattern: 'split' },
  { pattern: /朋友|陪伴|关系|爱|认识|表达|分享/, icon: '✉', label: '回声信笺', cut: 'layered' },
  { pattern: /改变|重新|成长|新生|治愈|好起来/, icon: '❋', label: '发光种子', outfitPattern: 'badge' }
];

function normalizeDraft(draft = {}) {
  const mbti = typeof draft.mbti === 'string' && MBTI_PROFILES[draft.mbti] ? draft.mbti : 'INFP';
  const song = typeof draft.song === 'string' ? draft.song.trim() : '那些年';
  const emotion = typeof draft.emotion === 'string' && EMOTION_SIGNALS[draft.emotion] ? draft.emotion : '期待';
  return {
    story: String(draft.story || '').trim().slice(0, 500),
    goal: String(draft.goal || '').trim().slice(0, 120),
    mbti, song, emotion,
    photo: draft.photo ? { ...draft.photo, color: safeHex(draft.photo.color) } : null,
    voice: draft.voice ? { ...draft.voice, duration: String(draft.voice.duration || '已上传') } : null,
    variantSeed: String(draft.variantSeed || '')
  };
}

function goalMotif(goal, seed) {
  return GOAL_MOTIFS.find(item => item.pattern.test(goal)) || {
    icon: pickStable(['✈', '♫', '☾', '✦', '❋', '✓', '✉', '◇', '⌁', '♡', '☼', '✶'], seed, 20),
    label: '专属音乐信物',
    cut: pickStable(OPTIONS.outfitCuts, seed, 21)
  };
}

/** Boost preferred entries without dropping the rest of the enum. */
function pickPreferred(pool, preferred, seed, offset) {
  const list = [...new Set([...(preferred || []).filter(Boolean), ...pool])];
  // First preferred entry (motif/primary hint) gets the strongest pull.
  const weights = list.map(item => {
    const rank = (preferred || []).indexOf(item);
    if (rank === 0) return 3.2;
    if (rank > 0) return 2;
    return 1;
  });
  return pickWeighted(list, seed, offset, weights);
}

/** Keep hair/outfit far enough apart so the figure stays readable. */
function ensureChromaGap(palette, gapDeg = 38) {
  const out = { ...palette };
  const [oh] = hexToHsl(out.outfit);
  let [hh, hs, hl] = hexToHsl(out.hair);
  const raw = Math.abs(hh - oh) % 360;
  const gap = Math.min(raw, 360 - raw);
  if (gap < gapDeg) {
    hh = (oh + gapDeg) % 360;
    out.hair = tuneCharacterColor(hslToHex(hh, hs, hl), { minS: 18, maxS: 48, minL: 18, maxL: 42 });
    const [nh, ns, nl] = hexToHsl(out.hair);
    out.hairHighlight = tuneCharacterColor(hslToHex(nh, Math.max(18, ns - 6), Math.min(72, nl + 22)), { minS: 18, maxS: 52, minL: 48, maxL: 72 });
  }
  return out;
}

export function buildCharacterProfile(rawDraft = {}) {
  const draft = normalizeDraft(rawDraft);
  const mbti = MBTI_PROFILES[draft.mbti];
  const songProfile = SONG_PROFILES[draft.song] || { signals: {}, reason: '用户选择的代表歌曲' };
  const searchable = `${draft.story} ${draft.goal} ${draft.song}`;
  const scores = Object.fromEntries(ARCHETYPE_KEYS.map(key => [key, 1]));
  const evidence = [];
  for (const key of ARCHETYPE_KEYS) {
    const matches = searchable.match(CHARACTER_ARCHETYPES[key].keywords)?.length || 0;
    if (matches) { scores[key] += matches * 2; evidence.push({ source: 'story', type: key, weight: matches * 2 }); }
    scores[key] += songProfile.signals[key] || 0;
  }
  Object.entries(MBTI_SIGNAL_WEIGHTS[mbti.group] || {}).forEach(([key, weight]) => {
    scores[key] += weight; evidence.push({ source: 'mbti', type: key, weight });
  });
  Object.entries(EMOTION_SIGNALS[draft.emotion] || {}).forEach(([key, weight]) => {
    scores[key] += weight; evidence.push({ source: 'emotion', type: key, weight });
  });
  if (draft.photo) {
    if (draft.photo.scene?.includes('夜景')) { scores.night += 2; evidence.push({ source: 'photo-scene', type: 'night', weight: 2 }); }
    if (draft.photo.scene?.includes('自然')) { scores.rebirth += 2; scores.voyager += 1; evidence.push({ source: 'photo-scene', type: 'rebirth', weight: 2 }); }
    if (draft.photo.scene?.includes('天空')) { scores.voyager += 2; evidence.push({ source: 'photo-scene', type: 'voyager', weight: 2 }); }
    if (Number(draft.photo.faceCount) > 1) { scores.messenger += 2; evidence.push({ source: 'photo-people', type: 'messenger', weight: 2 }); }
  }
  if (draft.voice) {
    const energy = Number(draft.voice.energy) || 0;
    const rhythm = Number(draft.voice.rhythm) || 0;
    if (energy >= .09) { scores.voyager += 2; scores.messenger += 1; evidence.push({ source: 'voice-energy', type: 'voyager', weight: 2 }); }
    else { scores.night += 2; evidence.push({ source: 'voice-energy', type: 'night', weight: 2 }); }
    if (rhythm >= .12) { scores.achiever += 1; evidence.push({ source: 'voice-rhythm', type: 'achiever', weight: 1 }); }
  }

  const ranked = [...ARCHETYPE_KEYS].sort((a, b) => scores[b] - scores[a] || ARCHETYPE_KEYS.indexOf(a) - ARCHETYPE_KEYS.indexOf(b));
  const type = ranked[0];
  const secondaryType = ranked[1];
  const selected = CHARACTER_ARCHETYPES[type];
  const margin = scores[type] - scores[secondaryType];
  const confidence = Math.min(0.98, Math.max(0.58, .62 + margin * .045));
  const moodTrait = { 焦虑: '仍在坚持', 低落: '需要陪伴', 兴奋: '充满能量', 平静: '安静感受', 期待: '准备出发' }[draft.emotion];

  const variantOptions = ARCHETYPE_VARIANTS[type] || [];
  const variantSeed = stableHash([
    draft.story, draft.goal, draft.mbti, draft.song, draft.emotion,
    draft.photo?.color, draft.photo?.scene, draft.photo?.hairColor, draft.photo?.outfitColor,
    draft.photo?.faceBox?.x, draft.photo?.faceBox?.y, draft.photo?.faceBox?.width,
    draft.voice?.duration, draft.variantSeed
  ].join('|'));
  const variantIndex = variantOptions.length ? variantSeed % variantOptions.length : 0;
  const variant = variantOptions[variantIndex] || {};
  const traits = [...new Set([mbti.trait, variant.trait, ...selected.traits, moodTrait])].filter(Boolean).slice(0, 4);

  const materialSeed = [
    draft.story, draft.goal, draft.mbti, draft.song, draft.emotion,
    draft.photo?.color, draft.photo?.scene, draft.photo?.hairColor, draft.photo?.outfitColor,
    draft.photo?.faceBox?.x, draft.photo?.faceBox?.y, draft.photo?.faceBox?.width,
    ...(draft.photo?.palette || []), draft.voice?.duration, draft.variantSeed
  ].join('|');
  const appearanceSeed = `${materialSeed}|${type}|${variantIndex}`;

  const photoColor = draft.photo?.color;
  const basePalette = draft.photo
    ? paletteFromPhoto(draft.photo, appearanceSeed)
    : paletteFromPhoto({ color: selected.color, hairColor: selected.baseHair, outfitColor: selected.baseOutfit }, appearanceSeed);

  const motif = goalMotif(`${draft.goal} ${draft.story}`, appearanceSeed);
  const wardrobe = VISUAL_WARDROBE[type];
  const introvert = draft.mbti[0] === 'I';
  const intuitive = draft.mbti[1] === 'N';
  const feeling = draft.mbti[2] === 'F';
  const judging = draft.mbti[3] === 'J';
  const secondary = CHARACTER_ARCHETYPES[secondaryType] || selected;
  const secondaryVariant = pickStable(ARCHETYPE_VARIANTS[secondaryType] || [{}], appearanceSeed, 24) || {};
  const voiceEnergy = Number(draft.voice?.energy) || 0;
  const voiceRhythm = Number(draft.voice?.rhythm) || 0;
  const photoBright = Number(draft.photo?.brightness);
  const blendRatio = scores[secondaryType] / Math.max(1, scores[type] + scores[secondaryType]);
  const faceBox = draft.photo?.faceBox;
  const faceRatio = faceBox?.height > 0 ? faceBox.width / faceBox.height : 0;
  const photoFaceShape = faceRatio > .88 ? 'round' : faceRatio > 0 && faceRatio < .68 ? 'oval' : null;

  // Dual-archetype: secondary can pull hair/aura toward its own variants.
  const hairPool = [variant.hairStyle, secondaryVariant.hairStyle].filter(Boolean);
  const auraPool = [variant.aura, secondaryVariant.aura, mbti.aura].filter(Boolean);

  const palette = ensureChromaGap({
    ...basePalette,
    hair: tuneCharacterColor(draft.photo?.hairColor || selected.baseHair || basePalette.hair, { minS: 18, maxS: 48, minL: 18, maxL: 42 }),
    outfit: tuneCharacterColor(draft.photo?.outfitColor || selected.baseOutfit || basePalette.outfit, { minS: 24, maxS: 52, minL: 32, maxL: 55 })
  });

  const appearance = normalizeAppearance({
    form: 'human',
    renderStyle: 'portrait',
    archetype: type,
    palette,
    face: {
      shape: photoFaceShape || pickPreferred(OPTIONS.faceShapes, feeling ? ['round', 'soft', 'heart'] : ['round', 'oval', 'bright'], appearanceSeed, 7),
      brow: pickPreferred(OPTIONS.brows, feeling ? ['arc', 'soft'] : ['flat', 'lift'], appearanceSeed, 19),
      eyeStyle: pickPreferred(OPTIONS.eyeStyles, feeling ? ['dreamy', 'round', 'smile', 'almond'] : ['round', 'almond', 'sharp', 'dreamy'], appearanceSeed, 14),
      eyeColor: photoColor ? hslToHex((hexToHsl(photoColor)[0] + 28) % 360, 36, 28) : pickStable(['#2e2840', '#354967', '#58403b', '#42615d', '#49385f', '#705247'], appearanceSeed, 15),
      cheek: pickPreferred(OPTIONS.cheeks, feeling ? ['soft', 'glow', 'spark'] : ['freckle', 'soft', 'spark'], appearanceSeed, 17),
      expression: EMOTION_EXPRESSIONS[draft.emotion] || (feeling ? 'smile' : 'calm')
    },
    hair: {
      style: pickWeighted(hairPool, appearanceSeed, 3, hairPool.map((_, index) => index === 0 ? 3 : 1)),
      highlight: palette.hairHighlight
    },
    body: {
      build: pickPreferred(OPTIONS.builds, photoBright && photoBright < 0.35 ? ['compact', 'balanced'] : ['slim', 'balanced', 'compact'], appearanceSeed, 8),
      pose: voiceEnergy >= 0.09 ? 'open' : introvert ? pickStable(['steady', 'lean-left', 'lean-right'], appearanceSeed, 9) : pickStable(['open', 'lean-left', 'lean-right'], appearanceSeed, 9),
      silhouette: draft.photo?.composition?.includes('方形') ? 'round' : draft.photo?.composition?.includes('竖向') ? 'balanced' : pickStable(OPTIONS.silhouettes, appearanceSeed, 18)
    },
    outfit: {
      cut: pickPreferred(
        wardrobe.cuts,
        motif.label !== '专属音乐信物' && motif.cut ? [motif.cut, ...wardrobe.cuts] : wardrobe.cuts,
        appearanceSeed, 12
      ),
      pattern: OPTIONS.outfitPatterns.includes(motif.outfitPattern) && stableHash(`${appearanceSeed}|motif-pat`) % 100 < 55
        ? motif.outfitPattern
        : pickPreferred(
            wardrobe.patterns,
            voiceRhythm >= 0.12 ? ['wave', ...wardrobe.patterns] : wardrobe.patterns,
            appearanceSeed, 13
          ),
      accent: palette.accent
    },
    fx: {
      aura: pickPreferred(OPTIONS.auras, intuitive ? ['stars', 'echo', ...auraPool] : ['orbit', 'pulse', 'sun', ...auraPool], appearanceSeed, 6),
      accessory: motif.icon || variant.accessory || mbti.icon,
      propLabel: motif.label === '专属音乐信物' ? (variant.suffix || selected.prop) : motif.label
    }
  });

  const sources = [
    draft.photo && `照片识别：${draft.photo.faceCount ? `定位 ${draft.photo.faceCount} 张人脸` : '场景色板'} · ${draft.photo.scene || '视觉色谱'} · ${draft.photo.temperature || ''}`,
    draft.photo?.palette?.length && `照片色板 ${draft.photo.palette.join(' / ')}`,
    draft.voice && `声音片段 ${draft.voice.duration}${draft.voice.energy ? ` · 能量 ${draft.voice.energy}` : ''}`,
    draft.story && '人生故事',
    `${draft.mbti} ${mbti.title}`,
    `歌曲《${draft.song}》`,
    draft.goal && `目标“${draft.goal}”`
  ].filter(Boolean);

  const reason = `${selected.reason}；再融合“${CHARACTER_ARCHETYPES[secondaryType].name}”的次原型特征；${songProfile.reason}；${draft.mbti} 的 ${introvert ? '内倾' : '外倾'}、${intuitive ? '直觉' : '实感'}、${feeling ? '情感' : '思考'}、${judging ? '判断' : '感知'}维度影响五官、姿态与服装；${draft.photo?.faceCount ? '本地人脸定位帮助从人物区域提取发色和服装色' : '照片色板映射为立绘配色'}`;
  const propLabel = appearance.fx.propLabel;
  const color = appearance.palette.outfit;

  return {
    name: `${selected.name}·${variant.suffix || '原色'}`,
    archetype: type,
    variantId: `${type}-${secondaryType}-${variantIndex + 1}-${stableHash(appearanceSeed).toString(36).slice(0, 5)}`,
    traits, color, appearance, prop: propLabel, reason, mbti: draft.mbti, mood: draft.emotion,
    goal: draft.goal || '找到自己的节奏',
    story: draft.story || `一个把情绪交给音乐，也愿意继续向前走的${mbti.title}。`,
    generation: {
      engine: 'lesheng-character-v9-human-portrait',
      confidence, scores, sources, evidence,
      aesthetics: { preset: 'cute-human-portrait', constraints: ['face-first', 'stable-harmony', 'readable-compact', 'human-form', 'big-eyes'] },
      blend: { primary: type, secondary: secondaryType, ratio: Math.max(.55, Math.min(.82, 1 - blendRatio)) },
      variant: { id: `${type}-${secondaryType}-${variantIndex + 1}`, label: `${selected.name} · ${variant.suffix || '原色'}`, seed: variantSeed },
      fingerprint: {
        seed: appearanceFingerprint(appearance),
        dimensions: ['face', 'hair', 'outfit', 'palette', 'body', 'fx']
      },
      sourceMap: {
        face: `${draft.mbti[2]} + ${draft.emotion}${photoFaceShape ? ` + photo ${photoFaceShape}` : ''}`,
        hair: `variant ${variant.suffix || ''} + secondary ${secondaryVariant.suffix || secondaryType}`,
        outfit: motif.label,
        palette: draft.photo ? 'photo colors → portrait harmony + chroma gap' : 'archetype harmony palette + chroma gap',
        dualBlend: `${type}+${secondaryType} (ratio ${Math.round((1 - blendRatio) * 100)}/${Math.round(blendRatio * 100)})`
      }
    }
  };
}
