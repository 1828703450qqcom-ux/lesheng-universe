import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { bundledSongs, resolveSongPlayback } from './musicPlayback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'lesheng.json');
const audioDir = path.join(root, 'uploads', 'audio');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ---------- 密码与令牌 ----------
const newSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (password, salt) => crypto.scryptSync(String(password), salt, 64).toString('hex');
function passwordMatches(password, user) {
  if (user.salt && user.passwordHash) {
    try {
      const candidate = Buffer.from(hashPassword(password, user.salt), 'hex');
      const expected = Buffer.from(user.passwordHash, 'hex');
      return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    } catch { return false; }
  }
  // 兼容历史 sha256（无 salt）口令
  if (user.passwordHash) return user.passwordHash === crypto.createHash('sha256').update(String(password)).digest('hex');
  return false;
}
const publicUser = user => { if (!user) return null; const { passwordHash, salt, ...safe } = user; return safe; };

const initialData = {
  users: [{ id: 'user_001', name: '乐生用户', avatar: '🧑🏻‍🎓', bio: '用音乐收藏每一段人生。', settings: { publicCharacter: true, strangerMessages: true, autoplay: true, notifications: true }, inventory: [], created_at: now() }],
  songs: [
    { id: 'song_001', title: '那些年', artist: '胡夏', cover: '♫', mood: '校园 / 告别', duration: 238 },
    { id: 'song_002', title: '夜空中最亮的星', artist: '逃跑计划', cover: '♫', mood: '深夜 / 坚持', duration: 252 },
    { id: 'song_003', title: '平凡之路', artist: '朴树', cover: '♫', mood: '出发 / 自由', duration: 301 },
    { id: 'song_004', title: '晴天', artist: '周杰伦', cover: '♫', mood: '青春 / 初夏 / 回忆', duration: 269 },
    { id: 'song_005', title: '后来', artist: '刘若英', cover: '♫', mood: '错过 / 告别 / 成长', duration: 349 },
    { id: 'song_006', title: '起风了', artist: '买辣椒也用券', cover: '♫', mood: '远方 / 治愈 / 出发', duration: 321 },
    { id: 'song_007', title: '孤勇者', artist: '陈奕迅', cover: '♫', mood: '勇气 / 坚持 / 目标', duration: 248 },
    { id: 'song_008', title: '海阔天空', artist: 'Beyond', cover: '♫', mood: '自由 / 理想 / 坚定', duration: 326 }
  ],
  characters: [
    { id: 'character_001', user_id: 'user_001', name: '纸飞机少年', avatar: '2D', mood: '期待与不舍', goal: '去远方看看', story: '一个即将离开校园，却仍然期待下一段旅程的年轻人。', personality: ['敏感','好奇','想去远方'], color: '#88a9d6', song_id: 'song_001', position: { x: 47, y: 28 }, created_at: now() },
    { id: 'character_002', user_id: 'user_002', name: '深夜旅人', avatar: '🧑🏽‍🎤', mood: '有一点焦虑', goal: '找回自己的节奏', story: '习惯在夜里听歌，把没有说出口的话交给旋律。', personality: ['安静','温柔','夜行'], color: '#d79b73', song_id: 'song_002', position: { x: 60, y: 48 }, created_at: now() },
    { id: 'character_003', user_id: 'user_003', name: '北方来信', avatar: '🧑🏼‍🚀', mood: '正在出发', goal: '去一个没去过的地方', story: '把每一次出发都写进自己的歌单。', personality: ['自由','勇敢','浪漫'], color: '#78c7b0', song_id: 'song_003', position: { x: 32, y: 64 }, created_at: now() },
    { id: 'character_004', user_id: 'user_004', name: '薄荷回声', avatar: '🧚🏻‍♀️', mood: '想认识新朋友', goal: '收集一百首快乐的歌', story: '把快乐做成可以分享的音乐糖纸。', personality: ['明亮','热情','共情'], color: '#75cbb8', song_id: 'song_001', position: { x: 51, y: 67 }, created_at: now() },
    { id: 'character_005', user_id: 'user_005', name: '云端鼓手', avatar: '🥁', mood: '今天能量满格', goal: '完成第一次舞台演出', story: '相信每一个普通日子都有自己的鼓点。', personality: ['行动派','直接','可靠'], color: '#d69a70', song_id: 'song_003', position: { x: 72, y: 54 }, created_at: now() },
    { id: 'character_006', user_id: 'user_006', name: '蓝鲸电台', avatar: '🐋', mood: '安静陪伴中', goal: '听完城市里每个失眠故事', story: '在深夜电台里，为陌生人保留一盏灯。', personality: ['安静','包容','细腻'], color: '#668fc2', song_id: 'song_002', position: { x: 26, y: 43 }, created_at: now() },
    { id: 'character_007', user_id: 'user_007', name: '日落邮差', avatar: '🚲', mood: '正在送一封信', goal: '把没说出口的话送到', story: '骑过日落和晚风，让歌替每封信找到收件人。', personality: ['浪漫','真诚','温暖'], color: '#d48c72', song_id: 'song_001', position: { x: 59, y: 25 }, created_at: now() }
  ],
  song_messages: [], postcards: [], listening_rooms: [], notifications: [], community_posts: [], purchases: [], sessions: [],
  relationships: [{ id: 'relation_001', character_a: 'character_001', character_b: 'character_002', level: '音乐同路人', score: 64, songs_shared: 12, listening_minutes: 86, postcards_sent: 3, memories: [{ type: 'first_listen', title: '第一次共听《夜空中最亮的星》', created_at: now() }], created_at: now() }],
  events: [
    { id: 'event_001', title: '离开校园以后', subtitle: '毕业季主题共听', time: '今晚 20:00', status: 'OPEN', participants: 284, participant_ids: [], song_id: 'song_001' },
    { id: 'event_002', title: '深夜微光电台', subtitle: '给睡不着的人一首歌', time: '每天 23:30', status: 'OPEN', participants: 126, participant_ids: [], song_id: 'song_002' }
  ],
  shop_items: [
    { id: 'item_001', name: '纸飞机轨迹', type: '角色特效', price: 0, icon: '✈', owned: true },
    { id: 'item_002', name: '月光耳机', type: '角色道具', price: 30, icon: '☾' },
    { id: 'item_003', name: '星河唱片', type: '房间背景', price: 50, icon: '✦' }
  ]
};

const loaded = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
const data = { ...initialData, ...loaded };
for (const key of ['users','songs','characters','song_messages','postcards','listening_rooms','notifications','community_posts','purchases','relationships','events','shop_items','sessions']) if (!Array.isArray(data[key])) data[key] = initialData[key] || [];
data.users[0] = { ...initialData.users[0], ...(data.users[0] || {}), settings: { ...initialData.users[0].settings, ...(data.users[0]?.settings || {}) }, inventory: data.users[0]?.inventory || [] };
for (const seed of initialData.characters) if (!data.characters.some(item => item.id === seed.id)) data.characters.push(seed);
for (const seed of initialData.songs) if (!data.songs.some(item => item.id === seed.id)) data.songs.push(seed);
for (const event of initialData.events) if (!data.events.some(item => item.id === event.id)) data.events.push(event);
function save() { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8'); }
save();

const defaultAppearance = { form: 'mascot', renderStyle: 'plush', species: 'rabbit', earStyle: 'soft', hoodMark: '✦', archetype: 'campus', palette: { skin: '#f4e3d8', skinShadow: '#c98f78', hair: '#40344f', hairHighlight: '#806b98', outfit: '#596e9d', outfitDeep: '#3a4a6e', accent: '#ffd166', eye: '#2e2840', lip: '#c4787a' }, face: { shape: 'round', brow: 'arc', eyeStyle: 'round', eyeColor: '#2e2840', cheek: 'soft', expression: 'smile' }, hair: { style: 'soft' }, body: { build: 'balanced', pose: 'steady', silhouette: 'balanced' }, outfit: { cut: 'classic', pattern: 'plain' }, fx: { aura: 'orbit', accessory: '✈', propLabel: '纸飞机', hoodMark: '✦' } };
const musicProviderUrl = process.env.MUSIC_PROVIDER_URL || '';
const musicProviderToken = process.env.MUSIC_PROVIDER_TOKEN || '';
const characterView = row => row ? ({ ...row, appearance: row.appearance || defaultAppearance, song_title: data.songs.find(s => s.id === row.song_id)?.title || '', song_artist: data.songs.find(s => s.id === row.song_id)?.artist || '' }) : null;
const validMbti = new Set(['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']);
const validAppearanceKeys = ['form','renderStyle','species','hoodMark','archetype','skin','hair','hairStyle','outfit','accent','accessory','aura','faceShape','build','pose','eyeStyle','eyeColor','earStyle','cheekStyle','silhouette','expression','outfitStyle','outfitPattern','hairHighlight','skinShadow','propLabel','motif'];
const nestedAppearanceKeys = {
  palette: ['skin','skinShadow','hair','hairHighlight','outfit','outfitDeep','accent','eye','lip'],
  face: ['shape','brow','eyeStyle','eyeColor','nose','mouth','cheek','expression','freckle'],
  hair: ['style','highlight','side'],
  body: ['build','pose','silhouette'],
  outfit: ['cut','collar','pattern','accent'],
  fx: ['aura','accessory','propLabel','hoodMark']
};
function sanitizeAppearance(appearance = {}, current = {}) {
  const next = { ...current };
  for (const key of validAppearanceKeys) {
    if (typeof appearance[key] === 'string') next[key] = String(appearance[key]).slice(0, 40);
  }
  for (const [group, keys] of Object.entries(nestedAppearanceKeys)) {
    if (!appearance[group] || typeof appearance[group] !== 'object') continue;
    const prior = current[group] && typeof current[group] === 'object' ? current[group] : {};
    next[group] = { ...prior };
    for (const key of keys) {
      const value = appearance[group][key];
      if (typeof value === 'string') next[group][key] = value.slice(0, 60);
      if (typeof value === 'boolean') next[group][key] = value;
    }
  }
  next.form = 'mascot';
  next.renderStyle = 'plush';
  return next;
}
function sanitizeCharacterUpdate(body = {}, current = {}) {
  const next = {};
  for (const key of ['name','mood','goal','story','prop','reason']) if (typeof body[key] === 'string') next[key] = body[key].trim().slice(0, 500);
  if (typeof body.variantId === 'string') next.variantId = body.variantId.trim().slice(0, 80);
  if (Array.isArray(body.personality)) next.personality = body.personality.filter(item => typeof item === 'string').slice(0, 6);
  if (typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color)) next.color = body.color;
  if (validMbti.has(body.mbti)) next.mbti = body.mbti;
  if (body.appearance && typeof body.appearance === 'object') next.appearance = sanitizeAppearance(body.appearance, current.appearance || defaultAppearance);
  if (body.generation && typeof body.generation === 'object') {
    const generated = body.generation;
    next.generation = {
      engine: String(generated.engine || 'lesheng-character-v10-plush-mascot').slice(0, 50),
      confidence: Math.max(0, Math.min(1, Number(generated.confidence) || 0)),
      scores: generated.scores && typeof generated.scores === 'object' ? generated.scores : {},
      sources: Array.isArray(generated.sources) ? generated.sources.filter(item => typeof item === 'string').slice(0, 12) : [],
      sourceMap: generated.sourceMap && typeof generated.sourceMap === 'object' ? generated.sourceMap : {},
      evidence: Array.isArray(generated.evidence) ? generated.evidence.slice(0, 30) : [],
      fingerprint: generated.fingerprint && typeof generated.fingerprint === 'object' ? { seed: Number(generated.fingerprint.seed) || 0, dimensions: Array.isArray(generated.fingerprint.dimensions) ? generated.fingerprint.dimensions.filter(item => typeof item === 'string').slice(0, 30) : [] } : undefined,
      blend: generated.blend && typeof generated.blend === 'object' ? { primary: String(generated.blend.primary || '').slice(0, 30), secondary: String(generated.blend.secondary || '').slice(0, 30), ratio: Math.max(.5, Math.min(.9, Number(generated.blend.ratio) || .65)) } : undefined,
      variant: generated.variant && typeof generated.variant === 'object' ? { id: String(generated.variant.id || '').slice(0, 100), label: String(generated.variant.label || '').slice(0, 100), seed: Number(generated.variant.seed) || 0 } : undefined,
      aesthetics: generated.aesthetics && typeof generated.aesthetics === 'object' ? { preset: String(generated.aesthetics.preset || '').slice(0, 60), constraints: Array.isArray(generated.aesthetics.constraints) ? generated.aesthetics.constraints.filter(item => typeof item === 'string').slice(0, 12) : [] } : undefined
    };
  }
  return { ...current, ...next };
}

// ---------- 认证 ----------
function issueToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  data.sessions.push({ token, user_id: user.id, created_at: now() });
  save();
  return token;
}
function userFromToken(token) {
  if (!token) return null;
  const session = data.sessions.find(item => item.token === token);
  return session ? data.users.find(user => user.id === session.user_id) || null : null;
}
const myCharacter = req => data.characters.find(character => character.user_id === req.user.id);
const ownerOfCharacter = character => data.users.find(user => user.id === character.user_id);
// NPC（演示账号或归属用户不存在）始终公开；真实用户角色需本人或拥有者公开
function characterVisible(character, req) {
  if (character.user_id === 'user_001') return true;
  const owner = ownerOfCharacter(character);
  if (!owner) return true;
  if (req.user?.id === owner.id) return true;
  return owner.settings?.publicCharacter !== false;
}
function relationFor(userId, a, b) {
  return data.relationships.find(rel => rel.user_id === userId && ((rel.character_a === a && rel.character_b === b) || (rel.character_a === b && rel.character_b === a)));
}
function growRelationship(userId, a, b, kind, amount = 1) {
  let rel = relationFor(userId, a, b);
  if (!rel) {
    rel = { id: uid('relation'), user_id: userId, character_a: a, character_b: b, level: '初次相遇', score: 0, songs_shared: 0, listening_minutes: 0, postcards_sent: 0, memories: [], created_at: now() };
    data.relationships.push(rel);
  }
  if (kind === 'song') { rel.songs_shared += amount; rel.score += 4 * amount; }
  if (kind === 'postcard') { rel.postcards_sent += amount; rel.score += 6 * amount; }
  if (kind === 'listen') { rel.listening_minutes += amount; rel.score += Math.max(2, Math.round(amount / 3)); }
  rel.score = Math.min(100, rel.score);
  rel.level = rel.score >= 90 ? '专属音乐朋友' : rel.score >= 70 ? '陪伴伙伴' : rel.score >= 35 ? '音乐同路人' : '初次相遇';
  rel.updated_at = now();
  return rel;
}
function notifyFor(userId, type, title, body, target) {
  const item = { id: uid('notice'), user_id: userId, type, title, body, target, read: false, created_at: now() };
  data.notifications.unshift(item);
  return item;
}

const app = express();
app.use(cors()); app.use(express.json({ limit: '8mb' }));
app.use('/media/audio/bundled', express.static(path.join(root, '..', 'client', 'public', 'music'), { acceptRanges: true, maxAge: '1h' }));
app.use('/media/audio', express.static(audioDir, { acceptRanges: true, immutable: false, maxAge: '1h' }));
// 可选认证：解析 Bearer 令牌并挂载 req.user
app.use((req, res, next) => {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  req.token = match ? match[1].trim() : '';
  req.user = userFromToken(req.token);
  next();
});
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: '请先登录' });
  return next();
};

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'le-sheng-universe-api', database: 'server/data/lesheng.json', realtime: true, users: data.users.length, characters: data.characters.length }));

// ---------- 账号 ----------
app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 30);
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: '请输入有效的邮箱地址' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少需要 6 位' });
  if (!name) return res.status(400).json({ error: '请输入你的昵称' });
  if (data.users.some(user => user.email === email)) return res.status(409).json({ error: '该邮箱已经注册，请直接登录' });
  const user = { id: uid('user'), name, email, avatar: '🧑🏻‍🎓', bio: '用音乐收藏每一段人生。', settings: { ...initialData.users[0].settings }, inventory: [], salt: newSalt(), created_at: now() };
  user.passwordHash = hashPassword(password, user.salt);
  data.users.push(user);
  // 每个账号拥有自己的角色（生成流程会更新它）
  const character = {
    id: uid('character'), user_id: user.id, name, avatar: '2D', mood: '期待', goal: '寻找懂我的人',
    story: `${name}刚刚来到乐生宇宙，完成「生成角色」后这里将被专属故事取代。`,
    personality: ['期待', '好奇'], color: '#88a9d6', appearance: defaultAppearance, song_id: 'song_001',
    position: { x: 40 + Math.round(Math.random() * 20), y: 42 + Math.round(Math.random() * 20) }, created_at: now()
  };
  data.characters.push(character);
  // 与 NPC 深夜旅人的初始关系
  data.relationships.push({ id: uid('relation'), user_id: user.id, character_a: character.id, character_b: 'character_002', level: '初次相遇', score: 0, songs_shared: 0, listening_minutes: 0, postcards_sent: 0, memories: [], created_at: now() });
  // 欢迎通知
  notifyFor(user.id, 'welcome', '欢迎来到乐生宇宙', '先去生成你的音乐角色，再到广场遇见懂音乐的人。', '/create/photo');
  save();
  const token = issueToken(user);
  res.status(201).json({ token, user: publicUser(user), characterId: character.id });
});
app.post('/api/auth/login', (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = data.users.find(item => item.email === email);
  if (!user || !passwordMatches(password, user)) return res.status(401).json({ error: '邮箱或密码不正确' });
  // 历史 sha256 口令自动升级为 scrypt
  if (!user.salt) { user.salt = newSalt(); user.passwordHash = hashPassword(password, user.salt); }
  const character = data.characters.find(item => item.user_id === user.id);
  const token = issueToken(user);
  save();
  res.json({ token, user: publicUser(user), characterId: character?.id || null });
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  const character = myCharacter(req);
  res.json({ user: publicUser(req.user), characterId: character?.id || null, character: character ? characterView(character) : null });
});
app.post('/api/auth/logout', (req, res) => {
  if (req.token) { data.sessions = data.sessions.filter(session => session.token !== req.token); save(); }
  res.json({ ok: true });
});

// ---------- 角色 ----------
app.get('/api/characters', (req, res) => res.json(data.characters.filter(character => characterVisible(character, req)).map(character => ({ ...characterView(character), mine: Boolean(req.user && character.user_id === req.user.id) }))));
app.get('/api/characters/me', requireAuth, (req, res) => { const item = characterView(myCharacter(req)); if (!item) return res.status(404).json({ error: '还没有生成角色' }); res.json(item); });
app.get('/api/characters/:id', (req, res) => { const row = data.characters.find(c => c.id === req.params.id); if (!row || !characterVisible(row, req)) return res.status(404).json({ error: '角色不存在' }); res.json(characterView(row)); });
app.put('/api/characters/me', requireAuth, (req, res) => {
  const body = req.body || {};
  const index = data.characters.findIndex(c => c.user_id === req.user.id);
  if (index < 0) return res.status(404).json({ error: '角色不存在' });
  const current = data.characters[index];
  const updated = sanitizeCharacterUpdate(body, current);
  data.characters[index] = { ...updated, song_id: data.songs.some(s => s.id === body.songId) ? body.songId : current.song_id, avatar: current.avatar || '2D', updated_at: now() };
  save();
  broadcast({ type: 'character:update', character: characterView(data.characters[index]) });
  res.json(characterView(data.characters[index]));
});
app.post('/api/characters', requireAuth, (req, res) => { const body = req.body || {}; const item = { id: uid('character'), user_id: req.user.id, name: body.name || '未命名角色', avatar: body.avatar || '2D', mood: body.mood || '等待被理解', goal: body.goal || '', story: body.story || '', personality: body.personality || [], color: body.color || '#88a9d6', appearance: body.appearance || defaultAppearance, prop: body.prop || '纸飞机', reason: body.reason || '', song_id: body.songId || 'song_001', position: { x: 50, y: 50 }, created_at: now() }; data.characters.push(item); save(); res.status(201).json(characterView(item)); });

// ---------- 歌曲 ----------
app.get('/api/songs', (req, res) => { const query = String(req.query.q || '').trim().toLowerCase(); const catalog = [...data.songs, ...bundledSongs.filter(song => !data.songs.some(item => item.id === song.id))]; const songs = query ? catalog.filter(song => `${song.title} ${song.artist} ${song.mood || ''}`.toLowerCase().includes(query)) : catalog; res.json(songs.map(song => ({ ...song, playback_url: `/api/songs/${song.id}/playback` }))); });
const audioExtensions = new Map([['audio/mpeg','.mp3'],['audio/mp3','.mp3'],['audio/mp4','.m4a'],['audio/x-m4a','.m4a'],['audio/wav','.wav'],['audio/x-wav','.wav'],['audio/ogg','.ogg'],['audio/flac','.flac'],['audio/x-flac','.flac']]);
const uploadAudio = multer({
  storage: multer.diskStorage({ destination: (_req, _file, done) => done(null, audioDir), filename: (_req, file, done) => { const ext = audioExtensions.get(file.mimetype) || path.extname(file.originalname).toLowerCase(); done(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`); } }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => { const ext = path.extname(file.originalname).toLowerCase(); const allowed = audioExtensions.has(file.mimetype) && ['.mp3','.m4a','.wav','.ogg','.flac'].includes(ext); done(allowed ? null : new Error('仅支持 MP3、M4A、WAV、OGG 或 FLAC 音频'), allowed); }
});
app.post('/api/songs/:id/audio', requireAuth, (req, res) => {
  uploadAudio.single('audio')(req, res, error => {
    if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? '音频不能超过 50MB' : error.message });
    const song = data.songs.find(item => item.id === req.params.id);
    if (!song) { if (req.file) fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: '歌曲不存在' }); }
    if (!req.file) return res.status(400).json({ error: '请选择完整音频文件' });
    if (song.audio_url?.startsWith('/media/audio/') && song.uploaded_by === req.user.id) {
      const previous = path.join(audioDir, path.basename(song.audio_url));
      if (fs.existsSync(previous)) fs.unlinkSync(previous);
    }
    song.audio_url = `/media/audio/${req.file.filename}`;
    song.audio_mime = req.file.mimetype;
    song.audio_size = req.file.size;
    song.uploaded_by = req.user.id;
    song.audio_source = 'user-authorized-upload';
    song.updated_at = now();
    save();
    res.status(201).json({ songId: song.id, title: song.title, mode: 'uploaded', playable: true, url: `${req.protocol}://${req.get('host')}${song.audio_url}`, duration: song.duration, size: song.audio_size });
  });
});
app.delete('/api/songs/:id/audio', requireAuth, (req, res) => {
  const song = data.songs.find(item => item.id === req.params.id);
  if (!song) return res.status(404).json({ error: '歌曲不存在' });
  if (!song.audio_url || song.audio_source !== 'user-authorized-upload') return res.status(404).json({ error: '没有可移除的本地音频' });
  if (song.uploaded_by !== req.user.id) return res.status(403).json({ error: '只能移除自己导入的音频' });
  const target = path.join(audioDir, path.basename(song.audio_url));
  if (fs.existsSync(target)) fs.unlinkSync(target);
  delete song.audio_url; delete song.audio_mime; delete song.audio_size; delete song.uploaded_by; delete song.audio_source;
  song.updated_at = now();
  save();
  res.json({ ok: true, songId: song.id });
});
app.get('/api/songs/:id/playback', async (req, res) => {
  const song = data.songs.find(item => item.id === req.params.id) || bundledSongs.find(item => item.id === req.params.id);
  if (!song) return res.status(404).json({ error: '歌曲不存在' });
  try {
    res.json(await resolveSongPlayback(song, { providerUrl: musicProviderUrl, providerToken: musicProviderToken }));
  } catch (error) { res.status(502).json({ code: error.code || 'MUSIC_PROVIDER_ERROR', error: error.message || '无法连接音乐服务' }); }
});

// ---------- 送歌 ----------
app.get('/api/song-messages', requireAuth, (req, res) => {
  const myId = myCharacter(req)?.id;
  res.json(data.song_messages.filter(item => item.from_character_id === myId || item.to_character_id === myId).reverse());
});
app.post('/api/song-messages', requireAuth, (req, res) => {
  const from = myCharacter(req);
  if (!from) return res.status(400).json({ error: '请先生成自己的角色' });
  const body = req.body || {};
  const target = data.characters.find(c => c.id === (body.toCharacterId || 'character_002'));
  const item = { id: uid('message'), user_id: req.user.id, from_character_id: from.id, to_character_id: target?.id || body.toCharacterId, song_id: body.songId || 'song_001', message: body.message || '', emotion: body.emotion || '陪伴', created_at: now() };
  data.song_messages.push(item);
  if (target) growRelationship(req.user.id, from.id, target.id, 'song');
  if (target?.user_id && target.user_id !== 'user_001' && ownerOfCharacter(target)) notifyFor(target.user_id, 'song', '收到一首歌', item.message || `${from.name}送给你一首歌`, '/account/messages');
  save();
  broadcast({ type: 'song:sent', item });
  res.status(201).json(item);
});

// ---------- 明信片 ----------
app.get('/api/postcards', requireAuth, (req, res) => {
  const myId = myCharacter(req)?.id;
  res.json(data.postcards.filter(item => item.from_character_id === myId || item.to_character_id === myId).reverse());
});
app.post('/api/postcards', requireAuth, (req, res) => {
  const from = myCharacter(req);
  if (!from) return res.status(400).json({ error: '请先生成自己的角色' });
  const body = req.body || {};
  const target = data.characters.find(c => c.id === (body.toCharacterId || 'character_002'));
  const item = { id: uid('postcard'), user_id: req.user.id, from_character_id: from.id, to_character_id: target?.id || body.toCharacterId, title: body.title || '今晚一起加油', message: body.message || '', song_id: body.songId || 'song_002', background: body.background || '校园黄昏', created_at: now() };
  data.postcards.push(item);
  if (target) growRelationship(req.user.id, from.id, target.id, 'postcard');
  if (target?.user_id && target.user_id !== 'user_001' && ownerOfCharacter(target)) notifyFor(target.user_id, 'postcard', '音乐明信片已寄出', item.title, '/social/postcards');
  save();
  broadcast({ type: 'postcard:created', item });
  res.status(201).json(item);
});

// ---------- 一起共听 ----------
app.get('/api/listening/rooms', requireAuth, (req, res) => {
  const myId = myCharacter(req)?.id;
  res.json(data.listening_rooms.filter(room => room.host === myId || room.guest === myId).reverse());
});
app.post('/api/listening/rooms', requireAuth, (req, res) => {
  const host = myCharacter(req);
  if (!host) return res.status(400).json({ error: '请先生成自己的角色' });
  const item = { id: uid('room'), user_id: req.user.id, host: host.id, guest: req.body?.guest || 'character_002', status: 'active', songId: req.body?.songId || 'song_001', playing: false, position: 0, reactions: [], started_at: now(), created_at: now() };
  data.listening_rooms.push(item);
  save();
  broadcast({ type: 'room:created', room: item });
  res.status(201).json(item);
});
app.get('/api/listening/rooms/:id', requireAuth, (req, res) => { const item = data.listening_rooms.find(r => r.id === req.params.id); if (!item) return res.status(404).json({ error: '房间不存在' }); res.json(item); });
app.put('/api/listening/rooms/:id', requireAuth, (req, res) => {
  const item = data.listening_rooms.find(r => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: '房间不存在' });
  const myId = myCharacter(req)?.id;
  if (item.host !== myId && item.guest !== myId) return res.status(403).json({ error: '只能操作自己的共听房间' });
  const body = req.body || {};
  if (typeof body.playing === 'boolean') item.playing = body.playing;
  if (body.position !== undefined) item.position = body.position;
  if (Array.isArray(body.reactions)) item.reactions = body.reactions;
  if (body.status) item.status = body.status;
  item.updated_at = now();
  if (body.status === 'ended' && !item.counted) {
    const minutes = Math.max(1, Number(body.minutes) || 1);
    const host = data.characters.find(c => c.id === item.host);
    if (host) {
      growRelationship(req.user.id, item.host, item.guest, 'listen', minutes);
      const rel = relationFor(req.user.id, item.host, item.guest);
      rel.memories ||= [];
      rel.memories.unshift({ type: 'listen', title: `一起听了 ${minutes} 分钟`, created_at: now() });
    }
    item.counted = true;
    notifyFor(req.user.id, 'listen', '共听记忆已保存', `本次共听 ${minutes} 分钟`, '/social/relationships');
  }
  save();
  broadcast({ type: 'room:update', room: item });
  res.json(item);
});

// ---------- 关系记忆 ----------
app.get('/api/relationships', requireAuth, (req, res) => res.json(data.relationships.filter(rel => rel.user_id === req.user.id)));
app.get('/api/relationships/:id', requireAuth, (req, res) => { const item = data.relationships.find(r => r.id === req.params.id && r.user_id === req.user.id); if (!item) return res.status(404).json({ error: '关系不存在' }); res.json(item); });

// ---------- 通知 ----------
app.get('/api/notifications', requireAuth, (req, res) => res.json(data.notifications.filter(item => item.user_id === req.user.id)));
app.put('/api/notifications/:id/read', requireAuth, (req, res) => { const item = data.notifications.find(n => n.id === req.params.id && n.user_id === req.user.id); if (!item) return res.status(404).json({ error: '消息不存在' }); item.read = true; save(); res.json(item); });

// ---------- 个人资料 ----------
app.get('/api/profile', requireAuth, (req, res) => res.json(publicUser(req.user)));
app.put('/api/profile', requireAuth, (req, res) => {
  const body = req.body || {};
  if (typeof body.name === 'string' && body.name.trim()) req.user.name = body.name.trim().slice(0, 30);
  if (typeof body.bio === 'string') req.user.bio = body.bio.slice(0, 200);
  if (typeof body.avatar === 'string' && body.avatar) req.user.avatar = body.avatar.slice(0, 8);
  if (body.settings && typeof body.settings === 'object') req.user.settings = { ...req.user.settings, ...body.settings };
  save();
  res.json(publicUser(req.user));
});

// ---------- 活动 ----------
app.get('/api/events', (req, res) => res.json(data.events.map(event => ({ ...event, joined: Boolean(req.user && (event.participant_ids || []).includes(req.user.id)) }))));
app.post('/api/events/:id/join', requireAuth, (req, res) => {
  const item = data.events.find(e => e.id === req.params.id);
  if (!item) return res.status(404).json({ error: '活动不存在' });
  item.participant_ids = item.participant_ids || [];
  if (!item.participant_ids.includes(req.user.id)) {
    item.participant_ids.push(req.user.id);
    item.participants = item.participant_ids.length;
    notifyFor(req.user.id, 'event', '活动报名成功', item.title, '/plaza/events');
    save();
  }
  res.json({ ...item, joined: true });
});

// ---------- 商店 ----------
app.get('/api/shop', (req, res) => res.json(data.shop_items.map(item => ({ ...item, owned: Boolean(item.owned || (req.user && req.user.inventory.includes(item.id))) }))));
app.post('/api/shop/:id/buy', requireAuth, (req, res) => {
  const item = data.shop_items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: '商品不存在' });
  req.user.inventory = req.user.inventory || [];
  if (!req.user.inventory.includes(item.id) && !item.owned) {
    req.user.inventory.push(item.id);
    data.purchases.push({ id: uid('purchase'), user_id: req.user.id, item_id: item.id, created_at: now() });
    notifyFor(req.user.id, 'shop', '道具已收入衣橱', item.name, '/plaza/shop');
    save();
  }
  res.json({ ...item, owned: true });
});

// ---------- 社区 ----------
app.get('/api/community', (req, res) => res.json([...data.community_posts].reverse().map(item => ({ ...item, mine: Boolean(req.user && item.user_id === req.user.id) }))));
app.post('/api/community', requireAuth, (req, res) => {
  const character = myCharacter(req);
  const item = { id: uid('post'), user_id: req.user.id, author_name: req.user.name, character_id: character?.id || null, content: String(req.body?.content || '').trim().slice(0, 240), emotion: String(req.body?.emotion || '此刻').slice(0, 20), song_id: req.body?.songId || 'song_001', likes: 0, created_at: now() };
  if (!item.content) return res.status(400).json({ error: '内容不能为空' });
  data.community_posts.push(item);
  save();
  broadcast({ type: 'community:post', item });
  res.status(201).json(item);
});

// ---------- 广场 ----------
app.get('/api/plaza', (req, res) => {
  const defaults = [{ x: 44, y: 28 }, { x: 66, y: 44 }, { x: 32, y: 64 }, { x: 51, y: 67 }, { x: 72, y: 54 }, { x: 26, y: 43 }, { x: 59, y: 25 }];
  const latest = new Map();
  for (const post of [...data.community_posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) if (post.character_id && !latest.has(post.character_id)) latest.set(post.character_id, { text: post.content, emotion: post.emotion || '此刻', song_title: data.songs.find(s => s.id === post.song_id)?.title || '' });
  const visible = data.characters.filter(character => characterVisible(character, req));
  res.json(visible.map(characterView).map((c, index) => {
    const moodBubble = latest.get(c.id) || null;
    return { id: c.id, name: c.name, avatar: c.avatar, appearance: { ...c.appearance, moodBubble }, mood: c.mood, song_title: c.song_title, moodBubble, position: c.position || defaults[index] || { x: 50, y: 50 }, mine: Boolean(req.user && c.user_id === req.user.id) };
  }));
});
app.put('/api/plaza/:id/position', requireAuth, (req, res) => {
  const mine = myCharacter(req);
  if (!mine || mine.id !== req.params.id) return res.status(403).json({ error: '只能移动自己的角色' });
  mine.position = { x: Math.max(8, Math.min(92, Number(req.body.x))), y: Math.max(12, Math.min(80, Number(req.body.y))) };
  save();
  broadcast({ type: 'plaza:move', id: mine.id, position: mine.position });
  res.json(mine.position);
});

// ---------- 实时 WebSocket ----------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
function broadcast(message, sender) { const payload = JSON.stringify(message); for (const client of wss.clients) if (client.readyState === WebSocket.OPEN && client !== sender) client.send(payload); }
function tokenFromRequest(req) {
  try { return new URL(req.url, 'http://localhost').searchParams.get('token') || ''; } catch { return ''; }
}
wss.on('connection', (socket, req) => {
  const user = userFromToken(tokenFromRequest(req));
  socket.send(JSON.stringify({ type: 'connected', at: now(), authenticated: Boolean(user) }));
  socket.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'plaza:move' && message.id) {
        const character = data.characters.find(c => c.id === message.id);
        // 只有登录用户本人才能移动自己的角色
        if (!user || !character || character.user_id !== user.id) return;
        character.position = { x: Math.max(8, Math.min(92, Number(message.position?.x))), y: Math.max(12, Math.min(80, Number(message.position?.y))) };
        save();
      }
      broadcast(message, socket);
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: '消息格式错误' }));
    }
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`乐生宇宙 API + WebSocket running at http://localhost:${port}`));
