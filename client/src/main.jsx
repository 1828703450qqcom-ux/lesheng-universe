import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import MusicPlayerDock from './music/MusicPlayerDock.jsx';
import { musicPlayer, useMusicPlayer } from './music/player.js';
import { formatTime } from './music/playerStore.js';
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Camera, Check, Compass, FileAudio, Headphones, Heart, Home as HomeIcon, Mail, MapPin, MessageCircle, Mic, Move, Music2, Pause, Play, Plus, Save, Search, Send, Settings, ShieldCheck, ShoppingBag, Sparkles, Trash2, Upload, UserRound, WandSparkles, X } from 'lucide-react';
import './styles.css';
import './visual-refresh.css';
import './programmatic-home.css';
import './character-variation.css';
import './generation-tempo.css';
import './auth.css';
import './ui-polish.css';
import { CharacterAvatar, buildCharacterProfile, normalizeAppearance } from './character/index.js';
import { MBTI_PROFILES } from './character/generation.js';
import { detectPhotoFaces } from './character/photoVision.js';
import './layout-refinement.css';
import GalaxyDepth from './GalaxyDepth.jsx';
import './depth-extension.css';
import './market.css';
import './music/player.css';

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${runtimeHost}:4000/api` : '/api');
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? `ws://${runtimeHost}:4000/ws` : `${location.protocol === 'https:' ? 'wss://' : 'ws://'}${location.host}/ws`);
const authToken = () => (typeof window !== 'undefined' ? localStorage.getItem('lesheng-auth-token') || '' : '');
const myCharacterId = () => (typeof window !== 'undefined' ? localStorage.getItem('lesheng-auth-character') || '' : '');
const currentUser = () => { try { return JSON.parse(localStorage.getItem('lesheng-auth-user') || 'null'); } catch { return null; } };
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\uFE0F\u200D]/gu;
const stripEmojiPrefix = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const stripped = raw.replace(/^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\uFE0F\u200D]+[\s\u00B7\u2022\-_\|·]*)+/u, '').trim();
  return stripped || raw;
};
const displayName = value => {
  const raw = String(value ?? '').trim();
  const stripped = stripEmojiPrefix(raw);
  const cleaned = stripped.replace(EMOJI_RE, '').trim();
  return cleaned || '音乐灵魂';
};
const avatarGlyph = value => {
  const name = displayName(value);
  return name && name !== '音乐灵魂' ? name.slice(0, 1) : '✦';
};
async function api(path, options = {}) {
  const token = authToken();
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const text = await response.text();
  let payload = null; try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lesheng-auth-token');
      localStorage.removeItem('lesheng-auth-user');
      localStorage.removeItem('lesheng-auth-character');
      if (!window.location.pathname.startsWith('/auth/')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?redirect=${redirect}`;
      }
    }
    throw new Error(payload?.error || '请先登录');
  }
  if (!response.ok) throw new Error(payload?.error || `请求失败（${response.status}）`);
  return payload;
}

const defaultAppearance = normalizeAppearance({});
const EMOTION_SIGNALS = { 焦虑: { night: 3, achiever: 1 }, 低落: { night: 3, messenger: 1 }, 兴奋: { voyager: 2, messenger: 2 }, 期待: { voyager: 1, campus: 1 }, 平静: { campus: 1, night: 1 } };
const HAIR_LABELS = { soft:'柔软短发',wave:'波浪发',short:'利落短发',leaf:'新芽发型',neat:'整齐短发',long:'长发',bob:'圆弧短发',curl:'卷发',undercut:'侧削短发',twin:'双束发',ponytail:'马尾',braid:'编发' };
const EYE_LABELS = { round:'圆润眼型',smile:'笑眼',sharp:'锐眼',dreamy:'梦境眼',almond:'杏眼' };
const OUTFIT_LABELS = { classic:'经典上装',structured:'结构制服',layered:'叠穿外套',sport:'运动上装',cape:'旅行披肩',plain:'纯色',constellation:'星图纹样',wave:'声波纹样',split:'拼色',badge:'徽章' };
const EXPRESSION_LABELS = { thoughtful:'思考',quiet:'安静',joy:'开心',smile:'微笑',calm:'平静' };
const fallbackCharacter = { id: 'local', name: '纸飞机少年', mood: '期待与不舍', goal: '去远方看看', story: '一个即将离开校园，却仍然期待下一段旅程的年轻人。', personality: ['敏感', '好奇', '想去远方'], color: '#88a9d6', avatar: '✦', appearance: normalizeAppearance({ archetype: 'campus', skin: '#f0bd96', hair: '#292434', hairStyle: 'soft', outfit: '#596e9d', accent: '#ffd166', accessory: '✈', aura: 'orbit' }), song_title: '那些年', song_artist: '胡夏' };
const fallbackCharacters = [fallbackCharacter, { id: 'night', name: '深夜旅人', mood: '有一点焦虑', goal: '找回自己的节奏', story: '习惯在夜里听歌，把没有说出口的话交给旋律。', personality: ['安静', '温柔', '夜行'], color: '#d79b73', avatar: '☾', appearance: normalizeAppearance({ archetype: 'night', skin: '#9b5c46', hair: '#251b2b', hairStyle: 'wave', outfit: '#9a4f58', accent: '#ef9f7d', accessory: '☾', aura: 'moon' }), song_title: '夜空中最亮的星', song_artist: '逃跑计划' }, { id: 'north', name: '北方来信', mood: '正在出发', goal: '去一个没去过的地方', story: '把每一次出发都写进自己的歌单。', personality: ['自由', '勇敢', '浪漫'], color: '#78c7b0', avatar: '✈', appearance: normalizeAppearance({ archetype: 'voyager', skin: '#e6b28d', hair: '#443a35', hairStyle: 'short', outfit: '#789ea7', accent: '#78d8c2', accessory: '✦', aura: 'stars' }), song_title: '平凡之路', song_artist: '朴树' }];

async function analyzeVoiceBlob(blob) {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return {};
  const context = new AudioEngine();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0); const stride = Math.max(1, Math.floor(samples.length / 12000));
    let power = 0, crossings = 0, count = 0, previous = 0;
    for (let index = 0; index < samples.length; index += stride) { const value = samples[index]; power += value * value; if ((value >= 0) !== (previous >= 0)) crossings++; previous = value; count++; }
    return { durationSeconds: Math.round(buffer.duration), energy: Number(Math.sqrt(power / Math.max(1,count)).toFixed(3)), rhythm: Number((crossings / Math.max(1,count)).toFixed(3)) };
  } catch { return {}; } finally { context.close().catch(()=>{}); }
}
function rgbHex(red, green, blue) { return `#${[red,green,blue].map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('')}`; }
async function analyzePhotoImage(image) {
  const vision = await detectPhotoFaces(image).then(result => ({ ...result, available: true })).catch(() => ({ faceCount: 0, faceBox: null, available: false }));
  const size = 84; const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const context = canvas.getContext('2d',{willReadFrequently:true}); context.drawImage(image,0,0,size,size);
  const pixels=context.getImageData(0,0,size,size).data; const bins=new Map(); const lightness=[]; let redTotal=0,greenTotal=0,blueTotal=0,saturationTotal=0,count=0;
  const addPixel=(r,g,b)=>{const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max>246||max<18)return;const key=`${r>>5}-${g>>5}-${b>>5}`;const entry=bins.get(key)||{count:0,r:0,g:0,b:0};entry.count++;entry.r+=r;entry.g+=g;entry.b+=b;bins.set(key,entry);redTotal+=r;greenTotal+=g;blueTotal+=b;saturationTotal+=(max-min)/Math.max(1,max);lightness.push((r+g+b)/765);count++;};
  for(let index=0;index<pixels.length;index+=8)if(pixels[index+3]>180)addPixel(pixels[index],pixels[index+1],pixels[index+2]);
  const ranked=[...bins.values()].sort((a,b)=>b.count-a.count).slice(0,5).map(entry=>rgbHex(entry.r/entry.count,entry.g/entry.count,entry.b/entry.count));
  const regionColor=(x0,y0,x1,y1,darkest=false)=>{const region=[];for(let y=Math.max(0,Math.floor(y0*size));y<Math.min(size,Math.floor(y1*size));y+=2)for(let x=Math.max(0,Math.floor(x0*size));x<Math.min(size,Math.floor(x1*size));x+=2){const i=(y*size+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=(r+g+b)/3;if(pixels[i+3]>180&&l>16&&l<246)region.push({r,g,b,l});}if(!region.length)return ranked[0]||'#596e9d';region.sort((a,b)=>a.l-b.l);const chosen=darkest?region.slice(0,Math.max(1,Math.floor(region.length*.35))):region.slice(Math.floor(region.length*.2),Math.max(1,Math.floor(region.length*.8)));return rgbHex(chosen.reduce((s,p)=>s+p.r,0)/chosen.length,chosen.reduce((s,p)=>s+p.g,0)/chosen.length,chosen.reduce((s,p)=>s+p.b,0)/chosen.length);};
  const brightness=lightness.reduce((sum,value)=>sum+value,0)/Math.max(1,lightness.length); const variance=lightness.reduce((sum,value)=>sum+(value-brightness)**2,0)/Math.max(1,lightness.length); const average={r:redTotal/Math.max(1,count),g:greenTotal/Math.max(1,count),b:blueTotal/Math.max(1,count)};
  const warmth=(average.r-average.b)/255; const greenBias=(average.g-(average.r+average.b)/2)/255; const blueBias=(average.b-average.r)/255;
  const scene=brightness<.3?'夜景 / 低光':greenBias>.035?'自然 / 户外':blueBias>.055?'天空 / 城市冷调':warmth>.075?'暖光 / 室内':'城市 / 日常';
  const box = vision.faceBox;
  const hairRegion = box && box.y > box.height * .13 ? [box.x + box.width * .1, box.y - box.height * .24, box.x + box.width * .9, box.y + box.height * .12] : [.25,.04,.75,.38];
  const outfitRegion = box && box.y + box.height * 1.3 < 1 ? [box.x - box.width * .35, box.y + box.height * 1.2, box.x + box.width * 1.35, Math.min(1,box.y + box.height * 2.25)] : [.18,.58,.82,.96];
  return { color:ranked[0]||rgbHex(average.r,average.g,average.b), palette:ranked.slice(0,4), hairColor:regionColor(...hairRegion,true), outfitColor:regionColor(...outfitRegion), brightness:Number(brightness.toFixed(2)), saturation:Number((saturationTotal/Math.max(1,count)).toFixed(2)), contrast:Number(Math.sqrt(variance).toFixed(2)), temperature:warmth>.05?'暖色':warmth<-.05?'冷色':'中性色', scene, composition:image.width>image.height*1.18?'横向场景':image.height>image.width*1.18?'竖向人像':'方形构图', faceCount:vision.faceCount, faceBox:box, visionSource:box?'mediapipe-local':vision.available?'color-local':'color-fallback', width:image.naturalWidth||image.width, height:image.naturalHeight||image.height };
}
function createLocalPhotoPreview(image) {
  const sourceWidth=image.naturalWidth||image.width||1,sourceHeight=image.naturalHeight||image.height||1;
  const scale=Math.min(1,360/Math.max(sourceWidth,sourceHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sourceWidth*scale));canvas.height=Math.max(1,Math.round(sourceHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/webp',.72);
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__leshengBuildCharacterProfile = buildCharacterProfile;

function StarMapBackground() {
  const map = useRef(null);
  useEffect(() => { let frame = 0; const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; const mobile = window.matchMedia('(max-width: 800px)').matches; if (reduced || mobile) return undefined; const move = event => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (!map.current) return; const x = (event.clientX / window.innerWidth - .5) * 10; const y = (event.clientY / window.innerHeight - .5) * 8; map.current.style.setProperty('--map-x', `${x}px`); map.current.style.setProperty('--map-y', `${y}px`); map.current.style.setProperty('--map-x-soft', `${x * -.22}px`); map.current.style.setProperty('--map-y-soft', `${y * -.22}px`); }); }; window.addEventListener('pointermove', move, { passive: true }); return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); }; }, []);
  return <div ref={map} className="star-map-background" aria-hidden="true"><div className="star-dust star-dust-near"/><div className="star-dust star-dust-far"/><i className="shooting-star meteor-one"/><i className="shooting-star meteor-two"/><i className="shooting-star meteor-three"/><svg className="big-dipper-map" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"><defs><filter id="dipper-glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g className="dipper-lines"><path d="M150 220L255 188L352 236L458 224L568 312L700 287L740 405L568 312"/></g><g className="dipper-stars" filter="url(#dipper-glow)"><circle cx="150" cy="220" r="7"/><circle cx="255" cy="188" r="8"/><circle cx="352" cy="236" r="6"/><circle cx="458" cy="224" r="9"/><circle cx="568" cy="312" r="7"/><circle cx="700" cy="287" r="9"/><circle cx="740" cy="405" r="8"/></g><g className="dipper-label"><text x="755" y="420">北斗七星</text><text x="755" y="438">BIG DIPPER · MUSIC GUIDE</text></g></svg><span className="star-nebula nebula-one"/><span className="star-nebula nebula-two"/><svg className="constellation-map" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><g className="celestial-grid"><circle cx="720" cy="450" r="310"/><circle cx="720" cy="450" r="190"/><path d="M80 450H1360M720 45V855"/><path d="M185 180C510 350 930 350 1255 180M185 720C510 550 930 550 1255 720"/></g><g className="constellation constellation-a"><path d="M126 188L214 130L302 196L382 116L450 174"/><circle cx="126" cy="188" r="4"/><circle cx="214" cy="130" r="3"/><circle cx="302" cy="196" r="5"/><circle cx="382" cy="116" r="3"/><circle cx="450" cy="174" r="4"/></g><g className="constellation constellation-b"><path d="M1005 156L1082 228L1188 194L1270 280L1350 238M1188 194L1208 100"/><circle cx="1005" cy="156" r="4"/><circle cx="1082" cy="228" r="3"/><circle cx="1188" cy="194" r="5"/><circle cx="1270" cy="280" r="3"/><circle cx="1350" cy="238" r="4"/><circle cx="1208" cy="100" r="3"/></g><g className="constellation constellation-c"><path d="M150 675L255 626L346 706L456 654L548 760M346 706L360 814"/><circle cx="150" cy="675" r="3"/><circle cx="255" cy="626" r="5"/><circle cx="346" cy="706" r="3"/><circle cx="456" cy="654" r="4"/><circle cx="548" cy="760" r="3"/><circle cx="360" cy="814" r="3"/></g><g className="map-labels"><text x="86" y="215">LS-07 / ECHO</text><text x="1215" y="310">MUSIC NORTH</text><text x="410" y="805">SOUL ORBIT</text><text x="745" y="88">00H 42M</text></g></svg><div className="map-coordinate coordinate-a">RA 18h 36m</div><div className="map-coordinate coordinate-b">DEC +38° 47′</div></div>
}

const sectionGuides = {
  plaza: { label: 'MUSIC PLAZA', title: '先让角色在音乐中央相遇', text: '这里是乐生宇宙的公共客厅。中央屏幕播放音乐，角色围绕舞台停留；你可以点击角色查看故事、交换歌曲，或者点击空地让自己的角色漫游。', points: ['中央屏幕：所有角色一起听歌', '心情气泡：把社区分享带到现场', '点击角色：进入详情并开始连接'], action: '/plaza' },
  create: { label: 'CREATE SOUL', title: '把一段人生变成可相遇的角色', text: '照片、声音、故事、MBTI、歌曲和目标会共同生成一个有来源的 2D 音乐角色。每次填写都会影响角色的外观、性格和音乐记忆。', points: ['素材越完整，角色越贴近你', '生成完成后会自动进入音乐广场'], action: '/create/photo' },
  connect: { label: 'CONNECT', title: '用歌曲完成一次温柔连接', text: '这里不要求你一直聊天。送一首歌、寄一张明信片或进入共听空间，都可以让角色替你表达那些不容易开口的话。', points: ['送歌：用旋律打个招呼', '明信片：留下可回看的心意', '共听：安静陪伴也算一次相遇'], action: '/social/send-song' },
  universe: { label: 'MY UNIVERSE', title: '回到属于你的音乐人生', text: '这里保存你的角色、关系、共听记忆和消息。角色不是一次生成的头像，而是会随着每一次音乐互动持续成长。', points: ['角色空间：查看生成来源与成长目标', '关系记忆：记录一起听过的歌', '消息中心：管理收到的音乐心意'], action: '/character/me' }
};
function getSectionKey(pathname) {
  if (pathname.startsWith('/create')) return 'create';
  if (pathname.startsWith('/social')) return 'connect';
  if (pathname.startsWith('/character') || pathname.startsWith('/account') || pathname === '/profile') return 'universe';
  if (pathname.startsWith('/plaza') || pathname === '/community') return 'plaza';
  return '';
}
function SectionGuide({ location }) {
  const navigate = useNavigate();
  const key = getSectionKey(location.pathname);
  const guide = sectionGuides[key];
  const force = new URLSearchParams(location.search).get('welcome') === '1';
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!guide) { setOpen(false); return; }
    const seenKey = `lesheng-section-guide:${key}`;
    const shouldOpen = force || sessionStorage.getItem(seenKey) !== '1';
    if (shouldOpen) sessionStorage.setItem(seenKey, '1');
    setOpen(shouldOpen);
  }, [key, force]);
  if (!open || !guide) return null;
  const close = () => { setOpen(false); if (force) navigate(location.pathname, { replace: true }); };
  return <div className="section-guide-overlay" role="dialog" aria-modal="true"><div className="section-guide-card"><button className="section-guide-close" type="button" onClick={close} aria-label="关闭板块介绍">×</button><div className="section-guide-orbit"><span>✦</span><i/><b/></div><p className="eyebrow">{guide.label} · HOW IT WORKS</p><h2>{guide.title}</h2><p className="section-guide-text">{guide.text}</p><div className="section-guide-points">{guide.points.map(point => <div key={point}><Check size={16}/><span>{point}</span></div>)}</div><button type="button" className="primary-button" onClick={close}>进入板块 <ArrowRight size={18}/></button></div></div>;
}


function AppShell({ children }) {
  const location = useLocation();
  const primaryItems = [{ to: '/', label: '首页' }, { to: '/plaza', label: '音乐广场' }, { to: '/social/send-song', label: '音乐社交' }, { to: '/profile', label: '我的空间' }];
  const bottomItems = [{ to: '/', label: '首页', icon: HomeIcon }, { to: '/plaza', label: '广场', icon: MapPin }, { to: '/plaza/discover', label: '发现', icon: Compass }, { to: '/social/send-song', label: '社交', icon: Mail }, { to: '/profile', label: '我的', icon: UserRound }];
  const contextGroups = [{ match: path => path.startsWith('/plaza') || path === '/community', label: 'EXPLORE', items: [['/plaza','广场漫游'],['/plaza/discover','发现角色'],['/plaza/events','主题活动'],['/plaza/shop','星轨市集'],['/community','社区动态']] },{ match: path => path.startsWith('/social'), label: 'CONNECT', items: [['/social/send-song','送一首歌'],['/social/postcards','音乐明信片'],['/social/listening','一起听歌'],['/social/relationships','关系记忆']] },{ match: path => path.startsWith('/character') || path.startsWith('/account') || path === '/profile', label: 'MY UNIVERSE', items: [['/character/me','我的角色'],['/profile','我的空间'],['/account/messages','消息中心'],['/account/settings','偏好设置']] }];
  const context = contextGroups.find(group => group.match(location.pathname));
  const authUser = currentUser();
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } catch {} localStorage.removeItem('lesheng-auth-token'); localStorage.removeItem('lesheng-auth-user'); localStorage.removeItem('lesheng-auth-character'); window.location.href = '/'; };
  const primaryActive = to => to === '/' ? location.pathname === '/' : to === '/plaza' ? location.pathname.startsWith('/plaza') || location.pathname === '/community' : to === '/profile' ? location.pathname === '/profile' || location.pathname.startsWith('/character') || location.pathname.startsWith('/account') : location.pathname.startsWith('/social');
  const bottomActive = to => to === '/' ? location.pathname === '/' : to === '/plaza' ? location.pathname === '/plaza' || location.pathname.startsWith('/plaza/events') || location.pathname.startsWith('/plaza/shop') : to === '/plaza/discover' ? location.pathname === '/plaza/discover' || location.pathname === '/community' : to === '/social/send-song' ? location.pathname.startsWith('/social') : location.pathname === '/profile' || location.pathname.startsWith('/character') || location.pathname.startsWith('/account');
  const mobileTabs = <nav className="bottom-nav mobile-tabbar" aria-label="手机端主导航">{bottomItems.map(({to,label,icon:Icon})=><Link key={to} to={to} className={bottomActive(to)?'nav-item active':'nav-item'} aria-current={bottomActive(to)?'page':undefined}><Icon size={20}/><span>{label}</span></Link>)}</nav>;
  const player=<MusicPlayerDock/>;
  return <div className="app-shell"><StarMapBackground/><header className="topbar"><Link to="/" className="brand"><span className="brand-mark">✦</span><span>乐生宇宙</span><small>LESHENG</small></Link><nav className="desktop-nav">{primaryItems.map(({to,label})=><Link key={to} to={to} className={primaryActive(to)?'active':''}>{label}</Link>)}</nav><div className="topbar-meta"><span className="online-badge"><span className="online-dot"/> 音乐灵魂在线</span><Link className="top-icon guide-link" aria-label="新手引导" to="/welcome"><Sparkles size={16}/></Link><Link className="top-icon" aria-label="消息" to="/account/messages"><Bell size={18}/></Link>{authUser ? <><Link className="auth-top-link" to="/profile" title="我的空间">{displayName(authUser.name)}</Link><button className="auth-top-link auth-logout" type="button" onClick={logout}>退出</button><Link to="/profile" className="mini-avatar" title="我的空间" aria-label="我的空间">{avatarGlyph(authUser.avatar)}</Link></> : <><Link className="auth-top-link" to="/auth/login">登录</Link><Link className="auth-top-link" to="/auth/register">注册</Link><Link to="/auth/login" className="mini-avatar" title="登录" aria-label="登录">✦</Link></>}</div></header>{context&&<nav className="context-nav" aria-label={context.label}><span>{context.label}</span>{context.items.map(([to,label])=><NavLink key={to} to={to} end={to==='/plaza'||to==='/profile'}>{label}</NavLink>)}</nav>}<main>{children}</main><SectionGuide location={location}/>{typeof document !== 'undefined' ? createPortal(<>{player}{mobileTabs}</>,document.body) : <>{player}{mobileTabs}</>}</div>;
}

const onboardingSteps = [
  { label: 'WHY', title: 'QQ 音乐不只回答“听什么”', text: '乐生宇宙把音乐变成更自然的情绪语言：低落时有人陪，想表达时有一首歌替你开口。', points: ['不必尴尬地开始文字社交', '让音乐承接那些说不出口的情绪'], visual: 'constellation' },
  { label: 'CREATE', title: '上传一段人生，生成你的音乐角色', text: '照片、声音、故事、MBTI、代表歌曲和人生目标，会一起生成一个有来源、有性格、有成长方向的 2D 音乐角色。', points: ['每个道具和颜色都有生成依据', '素材可以只选一部分，也能随时修改'], visual: 'materials' },
  { label: 'MEET', title: '让角色先替你，遇见懂音乐的人', text: '在音乐广场里，角色可以通过送歌、音乐明信片和一起听歌，完成一次不打扰、但有温度的连接。', points: ['歌曲是社交语言，不是聊天压力', '关系会被共同听过的歌记录下来'], visual: 'meeting' },
  { label: 'MEANING', title: '让每一次相遇，都留下音乐记忆', text: '这里的意义不是多一个虚拟宠物，而是让你的人生被看见，也让你有机会理解另一个人的音乐人生。', points: ['从个人情绪到真实关系', '从一次送歌到持续成长的音乐记忆'], visual: 'memory' }
];
function OnboardingGuide({ standalone = false, onClose }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const current = onboardingSteps[index];
  const finish = target => { localStorage.setItem('lesheng-onboarding-complete', '1'); onClose?.(); navigate(target); };
  const skip = () => { localStorage.setItem('lesheng-onboarding-complete', '1'); onClose?.(); if (standalone) navigate('/'); };
  const content = <div className={`onboarding-card ${standalone ? 'standalone-card' : ''}`}><div className="onboarding-head"><div><p className="eyebrow">LESHENG UNIVERSE · FIRST LOOK</p><span className="onboarding-step-count">{String(index + 1).padStart(2,'0')} / {String(onboardingSteps.length).padStart(2,'0')}</span></div><button className="onboarding-close" type="button" onClick={skip} aria-label="跳过新手引导">跳过</button></div><div className="onboarding-content"><div className={`onboarding-visual visual-${current.visual}`}><div className="onboarding-orbit orbit-one"/><div className="onboarding-orbit orbit-two"/><div className="onboarding-character">{current.visual === 'materials' ? '✦' : current.visual === 'meeting' ? '♫' : current.visual === 'memory' ? '☾' : '✧'}</div><span className="visual-caption">{current.visual === 'constellation' ? 'MUSIC · EMOTION · PEOPLE' : current.visual === 'materials' ? 'YOUR LIFE → YOUR SOUL' : current.visual === 'meeting' ? 'SONGS FIND EACH OTHER' : 'MEMORIES STAY IN MUSIC'}</span></div><div className="onboarding-copy"><p className="eyebrow">{current.label}</p><h1>{current.title}</h1><p className="onboarding-text">{current.text}</p><div className="onboarding-points">{current.points.map(point => <div key={point}><Check size={16}/><span>{point}</span></div>)}</div></div></div><div className="onboarding-footer"><div className="onboarding-dots">{onboardingSteps.map((item, dot) => <button key={item.label} className={dot === index ? 'active' : ''} type="button" onClick={() => setIndex(dot)} aria-label={`第 ${dot + 1} 步`}/>)}</div>{index < onboardingSteps.length - 1 ? <button type="button" className="primary-button" onClick={() => setIndex(index + 1)}>继续了解 <ArrowRight size={18}/></button> : <div className="onboarding-actions"><button type="button" className="ghost-button" onClick={() => finish('/plaza')}>先去逛广场</button><button type="button" className="primary-button" onClick={() => finish('/create/photo')}>开始生成角色 <WandSparkles size={16}/></button></div>}</div></div>;
  return standalone ? <div className="onboarding-page">{content}</div> : <div className="onboarding-overlay" role="dialog" aria-modal="true">{content}</div>;
}
function Home() {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem('lesheng-onboarding-complete') !== '1');
  const featuredSoul = buildCharacterProfile({ story:'毕业那天，我把朋友写的留言折成纸飞机，想带着校园里的温暖去远方。', goal:'带着毕业回忆去远方', mbti:'ENFP', song:'那些年', emotion:'期待', photo:{ color:'#b8a7dc', hairColor:'#493758', outfitColor:'#a589c3', scene:'校园 / 暖光', composition:'竖向人像', temperature:'暖色', palette:['#b8a7dc','#493758','#ffe19b'] }, voice:{ duration:'18 秒', energy:.12, rhythm:.11 }, variantSeed:'home-featured-soul-cute-v1' });
  // The homepage is a curated example of the same generated soul, not a user avatar preset.
  const homeMascot = normalizeAppearance({
    ...featuredSoul.appearance,
    palette: { ...featuredSoul.appearance.palette, skin:'#f7d8c9', skinShadow:'#dba999', hair:'#493758', hairHighlight:'#9a78aa', outfit:'#c3a4d8', outfitDeep:'#806aa8', accent:'#ffe18a', eye:'#51447a', lip:'#dd8395' },
    face: { ...featuredSoul.appearance.face, shape:'round', eyeStyle:'round', cheek:'glow', expression:'joy', eyeColor:'#51447a' },
    hair: { ...featuredSoul.appearance.hair, style:'twin' },
    body: { ...featuredSoul.appearance.body, build:'compact', silhouette:'round', pose:'open' },
    outfit: { ...featuredSoul.appearance.outfit, cut:'layered', pattern:'badge' },
    fx: { ...featuredSoul.appearance.fx, aura:'stars', accessory:'✦', propLabel:'纸飞机', heroMascot:true }
  });
  return <div className="home-page home-cinematic">
    <GalaxyDepth/>
    <svg className="home-programmatic-sky" viewBox="0 0 1440 850" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="homeGalaxy" cx="80%" cy="25%"><stop offset="0" stopColor="#91b7ff" stopOpacity=".65"/><stop offset=".3" stopColor="#4c62d8" stopOpacity=".2"/><stop offset="1" stopColor="#050918" stopOpacity="0"/></radialGradient><linearGradient id="homeRim" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2f62d6" stopOpacity="0"/><stop offset=".5" stopColor="#b8d2ff" stopOpacity=".9"/><stop offset="1" stopColor="#6742b8" stopOpacity="0"/></linearGradient><filter id="homeBlur"><feGaussianBlur stdDeviation="16"/></filter></defs><ellipse cx="1180" cy="220" rx="390" ry="180" fill="url(#homeGalaxy)" filter="url(#homeBlur)"/><path d="M690 850C1010 685 1220 660 1570 748" fill="none" stroke="url(#homeRim)" strokeWidth="30" opacity=".55" filter="url(#homeBlur)"/><path d="M680 850C1000 690 1220 665 1580 750" fill="none" stroke="url(#homeRim)" strokeWidth="4" opacity=".85"/><g className="programmatic-dipper"><path d="M95 120L210 66L310 134L420 95L528 190L680 165L760 275"/><circle cx="95" cy="120" r="7"/><circle cx="210" cy="66" r="10"/><circle cx="310" cy="134" r="8"/><circle cx="420" cy="95" r="11"/><circle cx="528" cy="190" r="9"/><circle cx="680" cy="165" r="10"/><circle cx="760" cy="275" r="8"/></g><g className="programmatic-constellation"><path d="M920 115L1015 165L1110 130L1195 215L1280 172"/><circle cx="920" cy="115" r="5"/><circle cx="1015" cy="165" r="4"/><circle cx="1110" cy="130" r="6"/><circle cx="1195" cy="215" r="4"/><circle cx="1280" cy="172" r="6"/></g></svg>
    <div className="programmatic-stars">{Array.from({length:48},(_,index)=><i key={index} style={{'--star-index':index}}/>)}</div>
    <div className="home-constellation home-constellation-a"><i/><i/><i/><i/><b/><b/><b/></div><div className="home-constellation home-constellation-b"><i/><i/><i/><i/><b/><b/><b/></div><div className="home-constellation home-constellation-c"><i/><i/><i/><b/><b/></div>
    <div className="home-nebula nebula-purple"/><div className="home-nebula nebula-blue"/><div className="home-planet planet-small-a"/><div className="home-planet planet-small-b"/><div className="home-planet planet-small-c"/>
    <div className="edition-mark"><span>VOL. 01</span><i/>音乐人格实验室</div>
    <div className="hero-copy"><span className="hero-coordinate">LS-07 / ECHO</span><p className="eyebrow">QQ MUSIC · MUSIC SOCIAL UNIVERSE</p><h1><span>你的故事，</span><em>生成你的音乐<br/>角色。</em></h1><p className="hero-sub">上传一段人生，让角色替你表达情绪，去遇见另一个人的音乐世界。</p><div className="hero-evidence"><ShieldCheck size={14}/><span>不是随机捏脸</span><i/>照片、声音、故事与 MBTI 都会留下生成依据</div><div className="hero-actions"><button type="button" className="primary-button" onClick={() => navigate('/create/photo')}>生成我的角色 <ArrowRight size={18}/></button><button type="button" className="ghost-button" onClick={() => navigate('/plaza')}>进入音乐广场</button><button type="button" className="hero-guide-button" onClick={() => setGuideOpen(true)}><Sparkles size={16}/> 我想先了解</button></div><div className="hero-proof"><div><small>SOULS</small><strong>12.8K</strong><span>音乐灵魂</span></div><div><small>MEETINGS</small><strong>3,046</strong><span>次温柔相遇</span></div><div><small>LIVE</small><strong>24h</strong><span>广场持续在线</span></div></div></div>
    <div className="hero-character home-soul-scene"><span className="scene-coordinate scene-coordinate-a">NO. 0721</span><span className="scene-coordinate scene-coordinate-b">BIG DIPPER · MUSIC GUIDE</span><span className="scene-coordinate scene-coordinate-c">MUSIC NORTH</span><div className="scene-star scene-star-a">✦</div><div className="scene-star scene-star-b">♫</div><div className="scene-star scene-star-c">♫</div><div className="solar-orbit solar-orbit-a"/><div className="solar-orbit solar-orbit-b"/><div className="solar-orbit solar-orbit-c"/><div className="scene-source source-photo"><span>01</span><b>照片色彩</b><small>PHOTO DNA</small></div><div className="scene-source source-mbti"><span>02</span><b>MBTI 性格</b><small>SOUL CORE</small></div><div className="scene-source source-music"><span>03</span><b>代表歌曲</b><small>MUSIC MEMORY</small></div><div className="soul-planet-core"/><div className="home-character-halo"/><div className="hero-avatar"><CharacterAvatar appearance={homeMascot}/></div><div className="floating-note note-a">♫</div><div className="floating-note note-b">✦</div><div className="hero-song"><Music2 size={16}/><span>角色主题曲 · 那些年</span></div><div className="hero-identity"><small>HOME SOUL · 纸飞机来信</small><strong>{displayName(featuredSoul.name).split('·')[0].trim()}</strong><span>{featuredSoul.traits.slice(0,3).join(' · ')}</span><i>▰▰▰▰▰▰▰</i><button type="button" onClick={() => navigate('/create/photo')} aria-label="创建自己的角色">▶</button></div><div className="dipper-caption"><strong>北斗七星</strong><small>BIG DIPPER · MUSIC GUIDE</small></div></div>
    <div className="home-bottom"><span><b>01</b> 上传一段人生</span><ArrowRight size={16}/><span><b>02</b> 生成一个角色</span><ArrowRight size={16}/><span><b>03</b> 遇见另一个灵魂</span></div>{guideOpen && <OnboardingGuide onClose={() => setGuideOpen(false)}/>}</div>
}
function OnboardingPage() { return <OnboardingGuide standalone/> }

const createSteps = [{ key: 'photo', label: '照片' }, { key: 'voice', label: '声音' }, { key: 'story', label: '故事' }, { key: 'mbti', label: 'MBTI' }, { key: 'song', label: '歌曲' }, { key: 'goal', label: '目标' }];
function CreateLayout({ children, step, onNext, onBack, onStep, data = {}, last = false }) {
  const navigate = useNavigate();
  const profile = buildCharacterProfile(data);
  const completion = [data.photo, data.voice, data.story, data.mbti, data.song, data.goal].filter(Boolean).length;
  const current = createSteps[step];
  const stepNotes = ['用照片提取角色色彩与场景', '用声音感知你的情绪温度', '用文字编织角色的第一段人生', '用 MBTI 确定人格原型', '用歌曲确定角色的音乐记忆', '用目标设置角色的成长方向'];
  const materialLabels = [['photo', '视觉色彩'], ['voice', '声音情绪'], ['story', '人生故事'], ['mbti', '人格原型'], ['song', '主题音乐'], ['goal', '成长目标']];
  return <div className="flow-page creation-page">
    <div className="flow-header creation-header"><button className="icon-button" type="button" aria-label="返回" onClick={() => step === 0 ? navigate('/') : onBack()}><ArrowLeft size={18}/></button><div><span>创建我的音乐角色</span><small>把一段人生，变成可以相遇的音乐灵魂</small></div><span className="step-count">{String(step + 1).padStart(2,'0')} / 06</span></div>
    <div className="creation-intro"><div><p className="eyebrow">MUSIC SOUL BUILDER · {String(step + 1).padStart(2,'0')}</p><h1>让你的故事，逐渐长出一个角色。</h1><p>每一份素材都会留下来源，最终生成一个能被理解、也能去理解别人的音乐角色。</p></div><div className="creation-progress"><strong>{completion}<span>/6</span></strong><small>素材已就绪</small><i><b style={{width:`${Math.round(completion / 6 * 100)}%`}}/></i></div></div>
    <div className="stepper">{createSteps.map((item,index)=><button type="button" key={item.key} disabled={index>step} onClick={()=>onStep(index)} className={index===step?'step active current':index<step?'step active complete':'step'}><span>{index<step?<Check size={14}/>:index+1}</span>{item.label}</button>)}</div>
    <div className="creation-body">
      <aside className="creation-roadmap"><p className="eyebrow">CREATION MAP</p><h2>角色生成路径</h2><p className="creation-side-copy">你正在完成：<strong>{current.label}</strong></p><div className="roadmap-list">{createSteps.map((item,index)=><button type="button" key={item.key} disabled={index>step} onClick={()=>onStep(index)} className={index===step?'roadmap-item current':index<step?'roadmap-item done':'roadmap-item'}><span>{index<step?<Check size={14}/>:String(index+1).padStart(2,'0')}</span><div><strong>{item.label}</strong><small>{stepNotes[index]}</small></div></button>)}</div><div className="judge-note"><Sparkles size={16}/><div><strong>为什么这样生成？</strong><p>让每个角色元素都有现实来源，避免随机生成。</p></div></div></aside>
      <div className="creation-main"><section className="flow-card">{children}</section><div className="flow-footer"><button type="button" className="ghost-button" onClick={() => step === 0 ? navigate('/') : onBack()}>上一步</button><button type="button" className="primary-button" onClick={onNext}>{last ? <><WandSparkles size={18}/> 让角色诞生</> : <>下一步 <ArrowRight size={18}/></>}</button></div></div>
      <aside className="creation-preview"><p className="eyebrow">LIVE CHARACTER PREVIEW</p><div className="preview-orbit"><div className="preview-stars">✦　·　♫</div><CharacterAvatar appearance={profile.appearance}/></div><div className="preview-name"><span>当前原型</span><h2>{displayName(profile.name)}</h2><p>{profile.traits.join(' · ')}</p></div><div className="preview-signals">{materialLabels.map(([key,label])=><div key={key} className={data[key]?'signal ready':'signal'}><span>{data[key]?<Check size={14}/>:<i/>}</span><div><strong>{label}</strong><small>{data[key] ? key === 'song' ? `《${data[key]}》` : key === 'mbti' ? `${data[key]} · ${MBTI_PROFILES[data[key]]?.title || ''}` : '已接收线索' : '等待你的输入'}</small></div></div>)}</div></aside>
    </div>
  </div>
}
function CreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const photoInput = useRef(null); const audioInput = useRef(null); const recorder = useRef(null); const chunks = useRef([]); const stream = useRef(null); const startedAt = useRef(0);
  const [data, setData] = useState(() => {
    const defaults = { photo: null, voice: null, story: '', mbti: 'INFP', song: '那些年', songId: 'song_001', goal: '', emotion: '期待' };
    try {
      const saved = JSON.parse(sessionStorage.getItem('characterDraft') || '{}') || {};
      return { ...defaults, ...saved, story: typeof saved.story === 'string' ? saved.story : '', goal: typeof saved.goal === 'string' ? saved.goal : '', song: typeof saved.song === 'string' && saved.song ? saved.song : defaults.song, mbti: MBTI_PROFILES[saved.mbti] ? saved.mbti : defaults.mbti, emotion: EMOTION_SIGNALS[saved.emotion] ? saved.emotion : defaults.emotion };
    } catch { return defaults; }
  });
  const [recording, setRecording] = useState(false); const [permissionError, setPermissionError] = useState(''); const [analyzingPhoto,setAnalyzingPhoto]=useState(false); const [availableSongs, setAvailableSongs] = useState([]); const [songQuery, setSongQuery] = useState('');
  useEffect(() => {
    let active = true;
    api('/songs')
      .then(items => { if (active) setAvailableSongs(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setAvailableSongs([]); });
    return () => { active = false; };
  }, []);
  const steps = ['/create/photo','/create/voice','/create/story','/create/mbti','/create/song','/create/goal'];
  const step = Math.max(0, steps.indexOf(location.pathname));
  const update = (key, value) => setData(current => { const next = { ...current, [key]: value }; sessionStorage.setItem('characterDraft', JSON.stringify(next)); return next; });
  const next = () => { sessionStorage.setItem('characterDraft', JSON.stringify(data)); if (step === steps.length - 1) navigate('/create/generate'); else navigate(steps[step + 1]); };
  const back = () => navigate(steps[step - 1]);
  const choosePhoto = async event => { const file = event.target.files?.[0]; if (!file) return; setAnalyzingPhoto(true); const objectUrl=URL.createObjectURL(file); const image=new Image(); try { image.src=objectUrl; await image.decode(); const analysis=await analyzePhotoImage(image); const previewUrl=createLocalPhotoPreview(image); update('photo',{name:file.name,url:previewUrl,size:file.size,...analysis}); } catch { update('photo',{name:file.name,url:'',size:file.size,color:'#596e9d',palette:['#596e9d'],hairColor:'#292434',outfitColor:'#596e9d',scene:'未能识别场景',temperature:'中性色',composition:'未知构图'}); } finally { URL.revokeObjectURL(objectUrl); event.target.value=''; setAnalyzingPhoto(false); } };
  const chooseAudio = async event => { const file = event.target.files?.[0]; if (!file) return; const metrics = await analyzeVoiceBlob(file); update('voice', { name: file.name, url: URL.createObjectURL(file), duration: metrics.durationSeconds ? `${metrics.durationSeconds} 秒` : '已上传', source: 'file', ...metrics }); };
  const toggleRecording = async () => {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    try {
      setPermissionError(''); stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks.current = []; startedAt.current = Date.now();
      recorder.current = new MediaRecorder(stream.current); recorder.current.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      recorder.current.onstop = async () => { const blob = new Blob(chunks.current, { type: recorder.current?.mimeType || 'audio/webm' }); const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)); const metrics = await analyzeVoiceBlob(blob); update('voice', { name: '我的声音片段', url: URL.createObjectURL(blob), duration: `${metrics.durationSeconds || seconds} 秒`, source: 'microphone', ...metrics }); stream.current?.getTracks().forEach(track => track.stop()); };
      recorder.current.start(); setRecording(true);
    } catch { setPermissionError('没有获得麦克风权限。请在浏览器地址栏中允许访问，或直接上传音频文件。'); }
  };
  const songs = Array.isArray(availableSongs) && availableSongs.length ? availableSongs : [{ id:'song_001', title: '那些年', artist: '胡夏', mood:'校园 / 告别 / 出发' }, { id:'song_002', title: '夜空中最亮的星', artist: '逃跑计划', mood:'深夜 / 坚持 / 微光' }, { id:'song_003', title: '平凡之路', artist: '朴树', mood:'远方 / 自由 / 成长' }];
  const filteredSongs = songs.filter(song => `${song.title} ${song.artist} ${song.mood || song.tags || ''}`.toLowerCase().includes(songQuery.trim().toLowerCase()));
  const chooseSong = song => setData(current => { const next = { ...current, song: song.title, songId: song.id }; sessionStorage.setItem('characterDraft', JSON.stringify(next)); return next; });
  return <CreateLayout step={step} data={data} onNext={next} onBack={back} onStep={index=>navigate(steps[index])} last={step === 5}>
    {step === 0 && <><div className="section-icon"><Camera size={20}/></div><h2>让照片真正参与角色生成</h2><p className="muted">本地识别人脸位置与照片色彩，从人物附近提取发色和服装配色；无人物时使用整张照片的色板。</p><input ref={photoInput} className="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传照片" onChange={choosePhoto}/>{analyzingPhoto?<div className="photo-analyzing"><span/><strong>正在读取照片视觉线索</strong><small>本地识别人像位置、色板与角色配色…</small></div>:data.photo ? <><div className="media-preview photo-preview">{data.photo.url?<img src={data.photo.url} alt="上传预览"/>:<Camera size={20}/>}<div><strong>{data.photo.name}</strong><span>{data.photo.scene} · {data.photo.temperature} · {data.photo.composition}</span></div><button type="button" aria-label="移除照片" onClick={() => update('photo', null)}><Trash2 size={18}/></button></div><div className="photo-insights"><div className="photo-insight-head"><div><small>PHOTO DNA · 本地识别完成</small><strong>{data.photo.faceCount ? `识别到 ${data.photo.faceCount} 张人脸，已定位主要人物` : data.photo.visionSource === 'color-fallback' ? '人脸模型未能加载，已切换为色彩分析' : '未检测到人脸，已使用场景色板'}</strong></div><div className="photo-palette">{(data.photo.palette||[data.photo.color]).map((color,index)=><i key={`${color}-${index}`} style={{background:color}} title={color}/>)}</div></div><div className="photo-insight-grid"><span><b>场景倾向</b>{data.photo.scene||'日常场景'}</span><span><b>发色取样</b><i style={{background:data.photo.hairColor||data.photo.color}}/>{data.photo.hairColor||data.photo.color}</span><span><b>服装取样</b><i style={{background:data.photo.outfitColor||data.photo.color}}/>{data.photo.outfitColor||data.photo.color}</span><span><b>视觉特征</b>亮度 {data.photo.brightness??'—'} · 对比 {data.photo.contrast??'—'}</span></div><button type="button" onClick={()=>photoInput.current?.click()}><Camera size={16}/>重新选择照片</button></div></> : <button type="button" className="upload-box photo-upload-box" onClick={() => photoInput.current?.click()}><div className="upload-symbol"><Upload size={20}/></div><strong>上传照片并识别</strong><span>支持 JPG、PNG、WEBP · 人像或生活场景均可</span><small>照片越清晰，角色配色越贴近你</small></button>}<div className="permission-note"><ShieldCheck size={16}/><span>照片只在当前浏览器中分析；生成时仅保存提取的视觉特征，不上传原始图片。首次识别会加载本地模型。</span></div></>}
    {step === 1 && <><div className="section-icon"><Mic size={20}/></div><h2>说一段现在的你</h2><p className="muted">录下 10–30 秒的声音，系统会在本地分析能量与节奏，不会克隆或上传你的声线。</p><button type="button" className={recording ? 'record-button recording' : data.voice ? 'record-button recorded' : 'record-button'} onClick={toggleRecording}><span>{recording ? <i className="record-pulse"/> : data.voice ? <Check size={16}/> : <Mic size={20}/>}</span>{recording ? '点击结束录音' : data.voice ? `${data.voice.duration} · 重新录制` : '允许麦克风并录音'}</button>{permissionError && <p className="permission-error">{permissionError}</p>}<input ref={audioInput} className="hidden-input" type="file" accept="audio/*" aria-label="上传音频" onChange={chooseAudio}/><button type="button" className="audio-upload-button" onClick={() => audioInput.current?.click()}><FileAudio size={16}/>{data.voice?.source === 'file' ? data.voice.name : '或者上传已有音频'}</button>{data.voice && <div className="voice-preview"><audio controls src={data.voice.url}/><div className="voice-signal"><span>能量 {data.voice.energy ?? '—'}</span><span>节奏 {data.voice.rhythm ?? '—'}</span></div><button type="button" aria-label="移除音频" onClick={() => update('voice', null)}><Trash2 size={18}/></button></div>}<div className="permission-note"><ShieldCheck size={16}/><span>分析只提取数字特征并保存在当前创作会话；拒绝权限后仍可上传音频或仅填写文字。</span></div></>}
    {step === 2 && <><div className="section-icon"><Sparkles size={20}/></div><h2>你的故事，想被怎样记住？</h2><p className="muted">日记、人生片段、最近的烦恼都可以。你拥有最终修改权。</p><textarea className="story-area" aria-label="人生故事" maxLength={500} placeholder="例如：毕业以后，我想去远方看看，但也有一点舍不得……" value={data.story || ''} onChange={e => update('story', e.target.value)}/><div className="text-counter"><span>只有你和你的角色能看到原文</span><strong>{String(data.story || '').length} / 500</strong></div><div className="chips" role="group" aria-label="故事标签">{['敏感','好奇','想去远方','重新开始','还没放弃'].map(k => { const story = String(data.story || ''); return <button type="button" key={k} className={story.includes(k) ? 'chip active' : 'chip'} onClick={() => !story.includes(k) && update('story', `${story}${story ? ' · ' : ''}${k}`)}>{k}</button>; })}</div></>}
    {step === 3 && <><div className="section-icon"><UserRound size={20}/></div><h2>选择你的 MBTI</h2><p className="muted">人格类型会参与角色称号、核心性格、专属符号与光环生成。</p><div className="mbti-grid" role="group" aria-label="MBTI 类型">{Object.entries(MBTI_PROFILES).map(([type,item]) => <button type="button" key={type} className={data.mbti === type ? 'mbti-option active' : 'mbti-option'} onClick={() => update('mbti', type)}><strong>{type}</strong><span>{item.title}</span><small>{item.group} · {item.trait}</small>{data.mbti === type && <Check size={16}/>}</button>)}</div><div className="mbti-selection"><span style={{background:MBTI_PROFILES[data.mbti]?.color}}>{MBTI_PROFILES[data.mbti]?.icon}</span><div><small>当前人格原型</small><strong>{data.mbti} · {MBTI_PROFILES[data.mbti]?.title}</strong></div></div></>}
    {step === 4 && <><div className="section-icon"><Music2 size={20}/></div><h2>选择一首最像你的歌</h2><p className="muted">从推荐歌单或搜索结果中选择，它会成为角色的主题曲。</p><div className="song-search"><Search size={16}/><input aria-label="搜索歌曲" value={songQuery} onChange={event => setSongQuery(event.target.value)} placeholder="搜索歌曲名、歌手或情绪标签"/><button type="button" onClick={() => setSongQuery('')} aria-label="清空搜索">{songQuery ? <X size={16}/> : null}</button></div><div className="song-result-meta"><span>{songQuery ? `搜索“${songQuery}”` : '推荐给你的音乐'}</span><small>{filteredSongs.length} 首</small></div><div className="song-choice-list" role="group" aria-label="选择歌曲">{filteredSongs.map((song, index) => <button type="button" key={song.id || song.title} className={(data.songId === song.id || (!data.songId && data.song === song.title)) ? 'song-select selected' : 'song-select'} onClick={() => chooseSong(song)}><div className={`song-cover ${index % 3 === 1 ? 'warm' : index % 3 === 2 ? 'teal' : ''}`}>♫</div><div><strong>{song.title}</strong><span>{song.artist} · {song.mood || song.tags || '音乐记忆'}</span></div>{(data.songId === song.id || (!data.songId && data.song === song.title)) && <Check size={18}/>}</button>)}{!filteredSongs.length && <div className="song-empty"><Music2 size={20}/><strong>还没有找到这首歌</strong><span>可以换个关键词搜索歌曲名、歌手或情绪。</span></div>}</div></>}
    {step === 5 && <><div className="section-icon"><Compass size={20}/></div><h2>接下来，你想走向哪里？</h2><p className="muted">目标会成为角色的成长主线，情绪会影响初始动作与表情。</p><div className="goal-grid" role="group" aria-label="成长目标">{['去远方看看','完成一件重要的事','找回自己的节奏','好好告别','重新开始','寻找懂我的人'].map(goal => <button type="button" key={goal} className={data.goal === goal ? 'goal active' : 'goal'} onClick={() => update('goal', goal)}>{goal}</button>)}</div><input className="custom-goal" aria-label="自定义成长目标" placeholder="或者写下自己的目标……" value={data.goal && !['去远方看看','完成一件重要的事','找回自己的节奏','好好告别','重新开始','寻找懂我的人'].includes(data.goal) ? data.goal : ''} onChange={e => update('goal', e.target.value)}/><span className="emotion-label" id="emotion-label">现在的心情</span><div className="emotion-row" role="group" aria-labelledby="emotion-label">{['期待','平静','焦虑','低落','兴奋'].map(emotion => <button type="button" key={emotion} className={data.emotion === emotion ? 'emotion active' : 'emotion'} onClick={() => update('emotion', emotion)}>{emotion}</button>)}</div></>}
  </CreateLayout>;
}

function GeneratePage() {
  const navigate = useNavigate();
  const [draft] = useState(() => { try { return JSON.parse(sessionStorage.getItem('characterDraft') || '{}'); } catch { return {}; } });
  const phases = [
    { title: '读取视觉线索', detail: draft.photo ? `从「${draft.photo.name}」提取光线与颜色` : '使用你的音乐选择建立初始色谱' },
    { title: '聆听声音情绪', detail: draft.voice ? `感知 ${draft.voice.duration} 声音中的节奏` : '根据文字语气推断当前状态' },
    { title: '编织人生故事', detail: draft.story ? '将你的文字转译为角色性格与道具' : '用目标与主题曲建立角色故事' },
    { title: '融合 MBTI 人格', detail: `${draft.mbti || 'INFP'} · ${MBTI_PROFILES[draft.mbti || 'INFP'].title}成为角色核心原型` },
    { title: '匹配音乐人格', detail: `把《${draft.song || '那些年'}》写入角色记忆` },
    { title: '完成角色绘制', detail: '正在为每个元素添加可解释的来源' }
  ];
  const [phase, setPhase] = useState(0); const [done, setDone] = useState(false); const [saveState, setSaveState] = useState('idle'); const [saveError, setSaveError] = useState('');
  const profile = buildCharacterProfile(draft);
  const result = { name: profile.name, variantId: profile.variantId, mbti: profile.mbti, mood: profile.mood, goal: profile.goal, story: profile.story, personality: profile.traits, color: profile.color, avatar: '2D', appearance: profile.appearance, prop: profile.prop, reason: profile.reason, generation: profile.generation, songId: draft.songId || (draft.song === '平凡之路' ? 'song_003' : draft.song === '夜空中最亮的星' ? 'song_002' : 'song_001') };
  const persistCharacter = async () => { setSaveState('saving'); setSaveError(''); try { await api('/characters/me', { method: 'PUT', body: JSON.stringify(result) }); sessionStorage.removeItem('characterDraft'); setSaveState('saved'); } catch { setSaveState('error'); setSaveError('角色已经生成，但保存到本地宇宙失败。请重试，当前结果不会丢失。'); } };
  // 3s generation tempo: 6 phases × 500ms, then hold reveal briefly before plaza.
  useEffect(() => {
    const stepMs = 500;
    const holdMs = 1600;
    const timer = setInterval(() => {
      setPhase(current => {
        if (current >= phases.length - 1) {
          clearInterval(timer);
          setDone(true);
          persistCharacter().finally(() => setTimeout(() => navigate('/plaza?welcome=1', { replace: true }), holdMs));
          return current;
        }
        return current + 1;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, []);
  const progress = done ? 100 : Math.round(((phase + 1) / phases.length) * 100);
  return <div className={done ? 'generate-page reveal-complete' : 'generate-page'}><div className="generation-shell"><div className="generation-sources"><p className="eyebrow">YOUR STORY SAMPLES</p><div className={draft.photo ? 'source-tile ready' : 'source-tile'}>{draft.photo ? <img src={draft.photo.url} alt="素材照片"/> : <Camera size={20}/>}<span>{draft.photo ? `${draft.photo.scene||'照片色谱'} · ${draft.photo.color||''}` : '还没有上传照片'}</span></div><div className={draft.voice ? 'source-tile ready' : 'source-tile'}><Mic size={20}/><span>{draft.voice ? `声音 ${draft.voice.duration}` : '使用文字情绪'}</span></div><div className={draft.story ? 'source-tile ready' : 'source-tile'}><Sparkles size={20}/><span>{draft.story ? `${draft.story.slice(0,18)}…` : '目标故事线'}</span></div><div className="source-tile ready"><UserRound size={20}/><span>{draft.mbti || 'INFP'} · {MBTI_PROFILES[draft.mbti || 'INFP'].title}</span></div><div className="source-tile ready"><Music2 size={20}/><span>《{draft.song || '那些年'}》</span></div></div><div className="generation-center"><div className="generation-orbit"><div className="generation-vinyl"/><div className="generation-avatar"><CharacterAvatar appearance={result.appearance}/></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/><span className="scan-line"/></div>{done ? <div className="reveal-title"><p className="eyebrow">YOUR MUSIC SOUL IS HERE</p><h1>{displayName(result.name)}</h1><p>{result.personality.join(' · ')}</p><div className="generated-reason"><span>{result.appearance.fx.accessory}</span><div><strong>{result.prop} · 变体 {result.generation.variant?.label || result.variantId}</strong><small>{result.reason}</small></div></div><div className={`generation-save-status ${saveState}`}><span>{saveState === 'saved' ? <Check size={14}/> : saveState === 'error' ? '!' : '…'}</span><div><strong>{saveState === 'saved' ? '角色已保存到你的音乐宇宙' : saveState === 'error' ? '保存遇到一点问题' : '正在保存角色记忆'}</strong><small>{saveState === 'error' ? saveError : `生成置信度 ${Math.round(result.generation.confidence * 100)}% · 已记录 ${result.generation.sources.length} 个素材来源`}</small></div>{saveState === 'error' && <button type="button" onClick={persistCharacter}>重试</button>}</div></div> : <><p className="eyebrow">CHARACTER GENERATION · {String(phase + 1).padStart(2,'0')}</p><h1>{phases[phase].title}</h1><p className="muted">{phases[phase].detail}</p></>}<div className="progress"><span style={{ width: `${progress}%` }}/></div><span className="progress-number">{progress}%</span>{done && <button type="button" className="primary-button reveal-button" disabled={saveState === 'saving'} onClick={() => navigate('/character/me')}>进入我的角色空间 <ArrowRight size={18}/></button>}</div><div className="generation-analysis"><p className="eyebrow">LIVE INTERPRETATION</p>{phases.map((item,index) => <div key={item.title} className={index < phase || done ? 'analysis-row complete' : index === phase ? 'analysis-row active' : 'analysis-row'}><span>{index < phase || done ? <Check size={14}/> : String(index + 1).padStart(2,'0')}</span><div><strong>{item.title}</strong><small>{index <= phase || done ? item.detail : '等待分析中…'}</small></div></div>)}</div></div><p className="generation-privacy"><ShieldCheck size={16}/> 照片只参与本地视觉分析；服务器仅保存提取后的色板与场景标签。</p></div>;
}

function CharacterPage({ mine = false }) { const { id } = useParams(); const selectedFallback = mine ? fallbackCharacter : fallbackCharacters.find(c => c.id === id) || fallbackCharacters[1]; const [character, setCharacter] = useState(selectedFallback); const navigate = useNavigate(); const targetQuery = mine ? '' : `?to=${character.id}`; useEffect(() => { api(mine ? '/characters/me' : `/characters/${id}`).then(item => setCharacter({ ...item, appearance: item.appearance || fallbackCharacter.appearance })).catch(() => {}); }, [mine,id]); const look = normalizeAppearance(character.appearance || defaultAppearance); return <div className="character-page"><div className="page-heading character-heading"><button className="icon-button" type="button" aria-label="返回" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button><div><span>{mine ? 'MY MUSIC SOUL' : 'MUSIC SOUL'}</span><strong>{mine ? '我的角色' : '角色详情'}</strong></div><button type="button" className="icon-button" aria-label="送歌" onClick={()=>navigate(`/social/send-song${targetQuery}`)}><Send size={18}/></button></div><div className="character-stage" style={{ '--character-color': character.color }}><div className="stage-grid"/><div className="stage-vinyl"/><div className="stage-glow"/><span className="stage-number">SOUL / 0721</span><span className="stage-location"><MapPin size={14}/> 乐生广场 · 东侧</span><div className="stage-avatar"><CharacterAvatar appearance={look}/></div><div className="floating-note">♫</div><div className="stage-song"><Music2 size={16}/> 正在听《{character.song_title}》</div></div><div className="character-title"><div><p className="eyebrow">YOUR VISUALIZED STORY</p><h1>{displayName(character.name)}</h1><p>{character.personality?.join(' · ') || '敏感 · 好奇 · 想去远方'}</p></div><span className="mood-tag"><i/> {character.mood}</span></div><blockquote>“{character.story}”</blockquote><div className="action-grid"><button type="button" onClick={() => navigate(`/social/send-song${targetQuery}`)}><Music2 size={20}/>送一首歌<small>用旋律打个招呼</small></button><button type="button" onClick={() => navigate(`/social/postcards/create${targetQuery}`)}><Mail size={20}/>音乐明信片<small>寄出一句没说的话</small></button><button type="button" onClick={() => navigate(`/social/listening${targetQuery}`)}><Headphones size={20}/>一起共听<small>安静地陪一会儿</small></button><button type="button" onClick={() => navigate('/social/relationships')}><Heart size={20}/>关系记忆<small>看看走过的旋律</small></button></div><div className="info-grid"><div className="info-card"><span>成长目标 / NEXT STOP</span><strong>{character.goal}</strong></div>{character.mbti&&<div className="info-card mbti-info-card"><span>人格原型 / MBTI</span><strong>{character.mbti} · {MBTI_PROFILES[character.mbti]?.title}</strong></div>}<div className="info-card"><span>角色色谱 / PALETTE</span><strong><i className="color-dot" style={{ background: character.color }}/>{character.color}</strong></div><div className="info-card"><span>视觉基因 / CHARACTER DNA</span><strong>{HAIR_LABELS[look.hair.style]||'专属形象'} · {EYE_LABELS[look.face.eyeStyle]||'自然眼型'}</strong><small>{OUTFIT_LABELS[look.outfit.cut]||'经典上装'} · {OUTFIT_LABELS[look.outfit.pattern]||'纯色'} · {EXPRESSION_LABELS[look.face.expression]||'平静'}表情</small></div><div className="info-card generated-prop-card"><span>生成道具 / SIGNATURE</span><strong>{look.fx.accessory || '✈'} {character.prop || '纸飞机'}</strong><small>{character.reason || '来自你的照片、文字与音乐线索'}</small></div></div></div> }

function PlazaModal({ children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="plaza-dialog" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>{children}</dialog>, document.body);
}

function Plaza() {
  const plazaFallback = fallbackCharacters.map((item,index) => ({ ...item, position: [[47,28],[60,48],[32,64]][index] || {x:50,y:50} }));
  const navigate = useNavigate(); const myId = myCharacterId(); const [people,setPeople] = useState(plazaFallback); const [selected,setSelected] = useState(null); const [fountain,setFountain] = useState(false); const socket = useRef(null);
  const playback = useMusicPlayer();
  const stagePlaying = playback.status === 'playing' || playback.status === 'buffering';
  const stageSong = playback.active;
  const toggleStagePlayback = event => { event.stopPropagation(); musicPlayer.toggle(); };
  useEffect(() => { api('/plaza').then(items => { if (Array.isArray(items) && items.length) setPeople(items); }).catch(() => {}); try { const wsToken = authToken(); socket.current = new WebSocket(`${WS_URL}${wsToken ? `?token=${encodeURIComponent(wsToken)}` : ''}`); socket.current.onmessage = event => { try { const message = JSON.parse(event.data); if (message.type === 'plaza:move') setPeople(current => current.map(person => person.id === message.id ? { ...person, position: message.position } : person)); if (message.type === 'community:post' && message.item) setPeople(current => current.map(person => person.id === message.item.character_id ? { ...person, moodBubble: { text: message.item.content, emotion: message.item.emotion || '此刻', song_title: '那些年' }, appearance: { ...(person.appearance || defaultAppearance), moodBubble: { text: message.item.content, emotion: message.item.emotion || '此刻' } } } : person)); } catch {} }; } catch {} return () => socket.current?.close(); }, []);
  const moveMe = event => { if (event.target !== event.currentTarget || stagePlaying || window.matchMedia('(max-width: 1024px)').matches) return; if (!authToken() || !myId) { navigate(`/auth/login?redirect=${encodeURIComponent('/plaza')}`); return; } const rect = event.currentTarget.getBoundingClientRect(); const position = { x: Math.max(8,Math.min(92,Math.round(((event.clientX - rect.left) / rect.width) * 100))), y: Math.max(12,Math.min(80,Math.round(((event.clientY - rect.top) / rect.height) * 100))) }; setPeople(current => current.map(person => person.id === myId ? { ...person, position } : person)); api(`/plaza/${myId}/position`,{ method:'PUT',body:JSON.stringify(position) }).catch(()=>{}); socket.current?.send(JSON.stringify({ type:'plaza:move',id:myId,position })); };
  const listenerPositions = [[27,30],[38,18],[62,18],[73,30],[73,68],[62,82],[38,82],[27,68]];
  const visiblePeople = [...people].sort((a,b) => Number(b.id === myId) - Number(a.id === myId)).slice(0, listenerPositions.length);
  const spots = [{ name:'音乐舞台',x:'11%',y:'20%',icon:'◉',note:stageSong?.title || '选择一首歌',action:()=>musicPlayer.play() },{ name:'音乐喷泉',x:'88%',y:'18%',icon:'♒',note:'今日循环 128 次',action:()=>setFountain(true) },{ name:'共听区',x:'11%',y:'76%',icon:'♫',note:'6 个房间开放',action:()=>navigate('/social/listening/create') },{ name:'明信片邮局',x:'89%',y:'76%',icon:'✉',note:'你有新来信',action:()=>navigate('/social/postcards') },{ name:'星轨市集',x:'49%',y:'12%',icon:'✦',note:'3 件限定道具',action:()=>navigate('/plaza/shop') },{ name:'心情电台',x:'50%',y:'87%',icon:'◌',note:'12 条新动态',action:()=>navigate('/community') }];
  return <div className="plaza-page"><div className="page-heading plaza-heading"><div><p className="eyebrow">MUSIC COMMUNITY · LIVE</p><h1>乐生广场</h1><p>点击中央舞台播放，角色会围绕音乐站在一起。</p></div><div className="plaza-weather"><span>☾</span><div><small>{stagePlaying ? '共听进行中' : '夜间漫游'}</small><strong>{people.length} 个灵魂在线</strong></div></div></div><div className="event-ribbon"><span>LIVE</span><strong>今晚 20:00 · 「离开校园以后」主题共听</strong><button type="button" onClick={() => navigate('/plaza/events')}>查看活动 <ArrowRight size={16}/></button></div><div className={`plaza-map ${stagePlaying ? 'stage-active' : ''}`} onClick={moveMe}><div className="map-label map-label-a">MOON SIDE</div><div className="map-label map-label-b">QUIET ZONE</div><div className="map-river"/><div className="plaza-orbit-notes">{['♫','✦','♪','·','♫','✧'].map((note,index)=><i key={index} style={{'--note-index':index}}>{note}</i>)}</div><div className="plaza-stage-ring"/><div className="plaza-stage"><div className="stage-light stage-light-a"/><div className="stage-light stage-light-b"/><div className="stage-screen"><div className="stage-screen-top"><span className="stage-live-dot">LIVE</span><span>{stagePlaying ? `共听中 · ${visiblePeople.length} 个角色` : '舞台待机'}</span></div><div className="stage-screen-main"><div className="stage-album"><Music2 size={20}/></div><div><small>NOW PLAYING · MUSIC PLAZA</small><strong>{stageSong?.title}</strong><span>{stageSong?.artist} · {stageSong?.mood || '音乐广场'}</span></div></div><div className="stage-lyrics">{playback.error || (stagePlaying ? '和身边的角色，完整听完这一首。' : '点击播放，让角色聚到音乐身边')}</div><div className="stage-bars">{[1,2,3,4,5,6,7,8,9].map(bar=><i key={bar} style={{'--bar':bar}}/>)}</div><div className="stage-progress"><span style={{width:`${playback.duration ? Math.min(100, playback.elapsed / playback.duration * 100) : 0}%`}}/></div><div className="stage-screen-bottom"><span>{formatTime(playback.elapsed)} / {formatTime(playback.duration)}</span><button type="button" className="stage-play" onClick={toggleStagePlayback} aria-label={stagePlaying?'暂停舞台播放':'播放舞台歌曲'}>{stagePlaying ? <Pause size={16}/> : <Play size={16}/>}</button><span>♫ 共同记忆</span></div></div><strong className="stage-name">中央音乐舞台</strong></div>{spots.map(s => <button type="button" key={s.name} className="plaza-spot" style={{left:s.x,top:s.y}} onClick={s.action}><span>{s.icon}</span><strong>{s.name}</strong><small>{s.note}</small></button>)}{visiblePeople.map((person,index) => { const position = stagePlaying ? { x: listenerPositions[index][0], y: listenerPositions[index][1] } : person.position || { x: listenerPositions[index][0], y: listenerPositions[index][1] }; return <button type="button" key={person.id} className={`plaza-person ${person.id === myId ? 'is-me' : ''} ${stagePlaying ? 'is-listening' : ''}`} style={{'--audience-row':index < 4 ? 3 : 5,'--audience-column':(index % 4) * 3 + 1,left:`${position.x}%`,top:`${position.y}%`}} onClick={() => setSelected(person)}>{person.appearance || person.avatar === '2D' ? <CharacterAvatar appearance={person.appearance} compact/> : <span className="avatar-fallback" aria-label={displayName(person.name)}>{avatarGlyph(person.avatar)}</span>}<small>{displayName(person.name)}{person.id === myId ? ' · 我' : ''}</small>{stagePlaying && <i>♫</i>}</button>})}</div>{people.length > visiblePeople.length && <button type="button" className="plaza-nearby-link" onClick={()=>navigate('/plaza/discover')}>附近展示 {visiblePeople.length} 位 · 查看其余 {people.length-visiblePeople.length} 位灵魂 <ArrowRight size={16}/></button>}<section className="plaza-live-grid"><button type="button" onClick={()=>navigate('/social/listening')}><span>LIVE ROOMS</span><strong>{stagePlaying ? `${visiblePeople.length} 个角色共听中` : '6 个共听房间'}</strong><small>{stagePlaying ? '正在播放' : '当前选曲'}《{stageSong?.title}》</small><Headphones size={20}/></button><button type="button" onClick={()=>navigate('/community')}><span>COMMUNITY</span><strong>12 条新心情</strong><small>“今天也有一首歌懂我”</small><MessageCircle size={20}/></button><button type="button" onClick={()=>navigate('/plaza/events')}><span>UP NEXT</span><strong>20:00 毕业季共听</strong><small>284 个角色已预约</small><CalendarDays size={20}/></button><button type="button" onClick={()=>navigate('/plaza/shop')}><span>SOUL MARKET</span><strong>星轨限定市集</strong><small>月光耳机正在展出</small><ShoppingBag size={20}/></button></section>{selected && <PlazaModal onClose={() => setSelected(null)}><div className="character-popover" role="dialog" aria-modal="true" aria-label="附近角色"><button className="close-pop" type="button" aria-label="关闭角色卡片" onClick={() => setSelected(null)}>×</button><div className="popover-avatar">{selected.appearance || selected.avatar === '2D' ? <CharacterAvatar appearance={selected.appearance} compact/> : <span className="avatar-fallback" aria-label={displayName(selected.name)}>{avatarGlyph(selected.avatar)}</span>}</div><div><span className="eyebrow">MUSIC SOUL NEARBY</span><h3>{displayName(selected.name)}</h3><p>{stagePlaying ? '正在中央舞台共听' : `${selected.mood} · 正在听《${selected.song_title}》`}</p><div className="popover-actions"><button type="button" onClick={() => navigate(selected.id === myId ? '/character/me' : `/character/${selected.id}`)}>查看角色</button>{selected.id !== myId && <button type="button" onClick={() => navigate(`/social/send-song?to=${selected.id}`)}>交换歌曲</button>}</div></div></div></PlazaModal>}{fountain && <PlazaModal onClose={() => setFountain(false)}><div className="feature-modal" role="dialog" aria-modal="true" aria-label="音乐喷泉介绍"><button type="button" aria-label="关闭介绍" onClick={() => setFountain(false)}><X size={18}/></button><span className="feature-symbol">♒</span><p className="eyebrow">MUSIC FOUNTAIN</p><h2>音乐喷泉正在播放</h2><h3>《夜空中最亮的星》</h3><p>今晚已有 128 个角色在这里停留。</p><button type="button" className="primary-button" onClick={() => {setFountain(false);navigate('/social/listening')}}>加入共听</button></div></PlazaModal>}<div className="plaza-hint"><Move size={16}/> <span className="plaza-desktop-hint">{stagePlaying ? '舞台播放中 · 点击角色互动' : '点击空地移动 · 点击角色互动'}</span><span className="plaza-mobile-hint">角色围坐共听 · 点击角色互动</span></div></div>;
}

const discoveryKeywords = ['毕业','校园','深夜','焦虑','远方','治愈','朋友','自由','陪伴','想念','考试','旅行','勇气','目标','音乐'];
function discoveryMatch(person, reference, mode) {
  const mine = reference || fallbackCharacter;
  const ownSong = String(mine.song_title || '').trim();
  const theirSong = String(person.song_title || '').trim();
  const ownText = [mine.mood, mine.goal, mine.story].filter(Boolean).join(' ');
  const theirText = [person.mood, person.goal, person.story].filter(Boolean).join(' ');
  const shared = discoveryKeywords.filter(word => ownText.includes(word) && theirText.includes(word));
  if (mode === '音乐相似') {
    if (ownSong && theirSong && ownSong === theirSong) return { score: 100, reason: '你们的代表歌曲相同' };
    if (mine.song_artist && mine.song_artist === person.song_artist) return { score: 70, reason: '喜欢同一位音乐人' };
    return { score: shared.length * 7, reason: shared.length ? '故事都提到' + shared[0] : '交换一首新歌，认识不同的音乐世界' };
  }
  if (mode === '情绪相似') {
    if (mine.mood && person.mood && mine.mood === person.mood) return { score: 90, reason: '此刻都在经历「' + person.mood + '」' };
    return { score: shared.length * 10, reason: shared.length ? '都在关注' + shared[0] : '也许一首歌能打开话题' };
  }
  if (mine.goal && person.goal && mine.goal === person.goal) return { score: 90, reason: '正朝着相同目标前进' };
  return { score: shared.length * 12, reason: shared.length ? '人生故事里都有' + shared[0] : '从彼此的故事开始了解' };
}
function Discover() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('音乐相似');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(8);
  const [characters, setCharacters] = useState([]);
  const [reference, setReference] = useState(fallbackCharacter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/characters').then(items => setCharacters(Array.isArray(items) ? items : [])).catch(() => setError('暂时无法加载音乐灵魂，请刷新页面重试。')).finally(() => setLoading(false));
    if (authToken()) api('/characters/me').then(setReference).catch(() => {});
  }, []);
  const words = query.trim().toLocaleLowerCase();
  const ranked = characters.filter(person => person.id !== (myCharacterId() || (authToken() ? reference?.id : 'character_001'))).filter(person => !words || [person.name, person.song_title, person.goal, person.mood].some(value => String(value || '').toLocaleLowerCase().includes(words))).map(person => ({ person, match: discoveryMatch(person, reference, filter) })).sort((a, b) => b.match.score - a.match.score || String(a.person.name || '').localeCompare(String(b.person.name || ''), 'zh-CN'));
  const shown = ranked.slice(0, limit);
  return <div className="content-page discovery-page"><div className="page-heading"><div><p className="eyebrow">FIND YOUR PEOPLE · MUSIC SOULS</p><h1>遇见与你同频的音乐灵魂</h1><p>先听见彼此的故事，再决定要不要送出第一首歌。</p></div><Compass size={20}/></div>
    <section className="discovery-tools"><div><strong>从哪一段共鸣开始？</strong><p>{authToken() ? '根据你的音乐角色资料排序；你的故事由你决定是否分享。' : '当前以「纸飞机少年」为示例排序，登录后可参考你的角色。'}</p></div><label className="discovery-search"><Search size={17}/><input value={query} onChange={event => { setQuery(event.target.value); setLimit(8); }} placeholder="搜索角色、歌曲或目标" aria-label="搜索音乐灵魂"/></label></section>
    <div className="filter-row" role="group" aria-label="发现方式">{['音乐相似','情绪相似','人生经历'].map(item => <button type="button" key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => { setFilter(item); setLimit(8); }}>{item}</button>)}</div>
    <p className="filter-result">{loading ? '正在寻找音乐灵魂…' : '按「' + filter + '」排序 · ' + ranked.length + ' 位角色'}。匹配理由仅供探索，不代表真实心理判断。</p>
    {error && <p className="market-feedback error" role="alert">{error}</p>}
    {!loading && !error && !ranked.length && <div className="market-empty">没有找到符合条件的角色，试试另一首歌或关键词。</div>}
    <div className="discover-grid">{shown.map(({ person: c, match }) => <article className="discover-card" key={c.id}><div className="discover-art" style={{ '--character-color': c.color }}><CharacterAvatar appearance={c.appearance} compact/><i>♫</i></div><div className="discovery-card-copy"><span className="discovery-match">✦ {match.reason}</span><h3>{displayName(c.name)}</h3><p>{c.mood || '听见此刻'} · {c.goal || '故事正在生长'}</p><small>代表歌曲 · 《{c.song_title || '等待分享'}》</small><div className="discovery-actions"><button type="button" className="secondary-button" onClick={() => navigate('/character/' + c.id)}>查看故事 <ArrowRight size={15}/></button><button type="button" className="discovery-send" onClick={() => navigate('/social/send-song?to=' + encodeURIComponent(c.id))}>送一首歌</button></div></div></article>)}</div>
    {limit < ranked.length && <button type="button" className="discovery-more" onClick={() => setLimit(current => current + 8)}>再遇见更多角色 <ArrowRight size={16}/></button>}
  </div>;
}

function SocialPage() {
  const navigate=useNavigate();
  const location=useLocation();
  const requestedRecipient=new URLSearchParams(location.search).get('to');
  const [characters,setCharacters]=useState([]);
  const [songs,setSongs]=useState([]);
  const [recipient,setRecipient]=useState(requestedRecipient||'character_002');
  const [song,setSong]=useState('song_001');
  const [emotion,setEmotion]=useState('陪伴');
  const [message,setMessage]=useState('我不知道你今天发生了什么，但这首歌可以陪你走一会儿。');
  const [sent,setSent]=useState(null);
  const [sending,setSending]=useState(false);
  useEffect(()=>{Promise.all([api('/characters'),api('/songs')]).then(([c,s])=>{setCharacters((Array.isArray(c)?c:[]).filter(x=>x.id!==(myCharacterId()||'character_001')));setSongs(Array.isArray(s)?s:[])}).catch(()=>{setCharacters([]);setSongs([])})},[]);
  const selectedRecipient=characters.find(item=>item.id===recipient);
  const selectedSong=songs.find(item=>item.id===song);
  const submit=async()=>{setSending(true);try{const item=await api('/song-messages',{method:'POST',body:JSON.stringify({toCharacterId:recipient,songId:song,message,emotion})});setSent(item)}finally{setSending(false)}};
  return <div className="content-page social-page">
    <div className="page-heading send-page-heading"><div><p className="eyebrow">SEND A SONG · MUSIC CONNECTION</p><h1>送一首歌</h1><p>选一个音乐灵魂，让旋律替你说出此刻的心意。</p></div><span className="heading-orbit"><Music2 size={20}/></span></div>
    {!sent&&<div className="send-flow-summary" aria-label="送歌流程"><span className={selectedRecipient?'ready':''}><b>01</b>选择角色</span><i/><span className={selectedSong?'ready':''}><b>02</b>选择歌曲</span><i/><span className={message.trim()?'ready':''}><b>03</b>写下心意</span></div>}
    {sent?<div className="success-card"><div className="success-icon"><Check size={16}/></div><h2>歌曲已经出发</h2><p>已保存发送记录，关系成长值同步增加。</p><small>记录编号：{sent.id}</small><div className="success-actions"><button type="button" className="secondary-button" onClick={()=>setSent(null)}>再送一首</button><button type="button" className="primary-button" onClick={()=>navigate('/account/messages')}>查看消息记录</button></div></div>:
    <div className="send-workspace">
      <div className="send-composer">
        <section className="send-section">
          <div className="send-section-title"><span>01</span><div><h2>选择收歌的人</h2><p>TA 会收到你的歌曲和留言</p></div></div>
          <div className="recipient-grid">{characters.map(item=><button type="button" key={item.id} className={recipient===item.id?'recipient selected':'recipient'} onClick={()=>setRecipient(item.id)}><CharacterAvatar appearance={item.appearance} compact/><div><strong>{displayName(item.name)}</strong><small>{item.mood}</small></div><i>{recipient===item.id?<Check size={16}/>:<ArrowRight size={16}/>}</i></button>)}</div>
        </section>
        <section className="send-section">
          <div className="send-section-title"><span>02</span><div><h2>挑选一首歌</h2><p>用歌曲建立第一次情绪连接</p></div></div>
          <div className="send-song-grid">{songs.map((item,index)=><button type="button" key={item.id} className={song===item.id?'song-select selected':'song-select'} onClick={()=>setSong(item.id)}><div className={`song-cover send-cover cover-${index%4}`}>{String(index+1).padStart(2,'0')}</div><div><strong>{item.title}</strong><span>{item.artist} · {item.mood}</span></div>{song===item.id&&<Check size={18}/>}</button>)}</div>
        </section>
        <section className="send-section send-message-section">
          <div className="send-section-title"><span>03</span><div><h2>附上一句话</h2><p>选择语气，也可以写下自己的话</p></div></div>
          <div className="emotion-row send-emotions" role="group" aria-label="送歌语气">{['陪伴','鼓励','想念','庆祝'].map(item=><button type="button" key={item} className={emotion===item?'emotion active':'emotion'} onClick={()=>setEmotion(item)}>{item}</button>)}</div>
          <div className="message-field"><textarea aria-label="想说的话" value={message} maxLength={120} onChange={e=>setMessage(e.target.value)} placeholder="写下想对 TA 说的话…"/><span>{message.length}/120</span></div>
        </section>
      </div>
      <aside className="send-preview">
        <p className="eyebrow">YOUR MUSIC MESSAGE</p><h2>这一首，送给你</h2>
        <div className="send-preview-recipient">{selectedRecipient?<CharacterAvatar appearance={selectedRecipient.appearance} compact/>:<span className="preview-placeholder"><UserRound size={20}/></span>}<div><small>TO</small><strong>{selectedRecipient?displayName(selectedRecipient.name):'选择一个角色'}</strong><span>{selectedRecipient?.mood||'等待与你相遇'}</span></div></div>
        <div className="preview-route"><i/><span>♫</span><i/></div>
        <div className="preview-song"><div className="preview-disc"><Music2 size={20}/></div><div><small>SELECTED TRACK</small><strong>{selectedSong?.title||'选择一首歌'}</strong><span>{selectedSong?.artist||'—'} · {emotion}</span></div></div>
        <blockquote>{message||'你的留言会显示在这里。'}</blockquote>
        <div className="send-preview-meta"><span>公开范围</span><strong>仅双方可见 <ShieldCheck size={16}/></strong></div>
        <button type="button" className="primary-button full send-submit" disabled={sending||!message.trim()||!selectedRecipient||!selectedSong} onClick={submit}><Send size={16}/>{sending?'正在发送…':'确认送出这首歌'}</button>
      </aside>
    </div>}
  </div>
}

function Postcards() {
  const navigate=useNavigate(); const [cards,setCards]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api('/postcards').then(items=>setCards(Array.isArray(items)?items:[])).catch(()=>setCards([])).finally(()=>setLoading(false))},[]);
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">MUSIC POSTCARDS</p><h1>音乐明信片</h1></div><button type="button" className="round-button" aria-label="制作明信片" onClick={()=>navigate('/social/postcards/create')}><Plus size={18}/></button></div><div className="social-tabs" role="tablist" aria-label="音乐社交"><span role="tab" aria-selected="false" tabIndex={0} onClick={()=>navigate('/social/send-song')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')navigate('/social/send-song')}}>送歌</span><span role="tab" className="active" aria-selected="true">明信片</span><span role="tab" aria-selected="false" tabIndex={0} onClick={()=>navigate('/social/listening/create')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')navigate('/social/listening/create')}}>共听</span><span role="tab" aria-selected="false" tabIndex={0} onClick={()=>navigate('/social/relationships')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')navigate('/social/relationships')}}>关系</span></div><div className="postcard-list">{loading&&<div className="empty-card">正在加载音乐记忆…</div>}{cards.map(card=><article className={`postcard-card scene-${card.background}`} key={card.id}><div className="postcard-art"><span className="decor-note" aria-hidden="true">✦</span><span className="decor-note" aria-hidden="true">☾</span><strong aria-hidden="true">♫</strong></div><div><span className="eyebrow">{new Date(card.created_at).toLocaleString()}</span><h3>{card.title}</h3><p>{card.message}</p><small>场景：{card.background}</small></div></article>)}{!loading&&!cards.length&&<div className="empty-card"><Mail size={20}/><span>还没有明信片，去制作第一张音乐记忆吧</span></div>}<button type="button" className="secondary-button" onClick={()=>navigate('/social/postcards/create')}>制作新明信片</button></div></div>
}

function CreatePostcard() {
  const navigate=useNavigate(); const location=useLocation(); const requestedRecipient=new URLSearchParams(location.search).get('to'); const [characters,setCharacters]=useState([]); const [songs,setSongs]=useState([]); const [recipient,setRecipient]=useState(requestedRecipient||'character_002'); const [background,setBackground]=useState('校园黄昏'); const [title,setTitle]=useState('今晚一起加油'); const [message,setMessage]=useState('你不用马上变得勇敢，但你已经走了很远。'); const [songId,setSongId]=useState('song_002'); const [sending,setSending]=useState(false);
  useEffect(()=>{Promise.all([api('/characters'),api('/songs')]).then(([c,s])=>{setCharacters((Array.isArray(c)?c:[]).filter(x=>x.id!==(myCharacterId()||'character_001')));setSongs(Array.isArray(s)?s:[])}).catch(()=>{setCharacters([]);setSongs([])})},[]);
  const submit=async()=>{setSending(true);try{await api('/postcards',{method:'POST',body:JSON.stringify({toCharacterId:recipient,title,message,songId,background})});navigate('/social/postcards')}finally{setSending(false)}};
  const song=songs.find(item=>item.id===songId);
  return <div className="content-page postcard-create"><div className="page-heading"><div><p className="eyebrow">CREATE A MEMORY</p><h1>制作音乐明信片</h1></div><button className="icon-button" type="button" aria-label="关闭" onClick={()=>navigate(-1)}><X size={18}/></button></div><div className="postcard-editor"><div className="editor-controls"><label htmlFor="postcard-recipient">寄给谁</label><select id="postcard-recipient" value={recipient} onChange={e=>setRecipient(e.target.value)}>{characters.map(item=><option key={item.id} value={item.id}>{displayName(item.name)}</option>)}</select><label id="postcard-scene-label">选择场景</label><div className="option-row" role="group" aria-labelledby="postcard-scene-label">{['校园黄昏','深夜窗边','城市夜路'].map(item=><button type="button" key={item} className={background===item?'option active':'option'} onClick={()=>setBackground(item)}>{item}</button>)}</div><label htmlFor="postcard-title">标题</label><input id="postcard-title" value={title} onChange={e=>setTitle(e.target.value)}/><label htmlFor="postcard-message">想说的话</label><textarea id="postcard-message" value={message} onChange={e=>setMessage(e.target.value)}/><label id="postcard-song-label">代表歌曲</label><div className="song-choice-list" role="group" aria-label="选择歌曲">{songs.map(item=><button type="button" key={item.id} className={songId===item.id?'song-select selected':'song-select'} onClick={()=>setSongId(item.id)}><div className="song-cover">♫</div><div><strong>{item.title}</strong><span>{item.artist}</span></div>{songId===item.id&&<Check size={18}/>}</button>)}</div><button type="button" className="primary-button full" disabled={sending||!message.trim()||!title.trim()} onClick={submit}>{sending?'正在生成…':'生成并发送'}</button></div><div className={`postcard-preview scene-${background}`}><span className="decor-note" aria-hidden="true">✦　♫　☾</span><small>{background}</small><h2>{title||'明信片标题'}</h2><p>{message||'想说的话会显示在这里。'}</p><small>♫ {song?.title||'选择一首歌'}</small></div></div></div>
}

function Listening() {
  const navigate = useNavigate(); const location = useLocation();
  const guestId = new URLSearchParams(location.search).get('to') || 'character_002';
  const [guestCharacter, setGuestCharacter] = useState(fallbackCharacters[1]);
  const [room, setRoom] = useState(null); const [reaction, setReaction] = useState('');
  const [roomError, setRoomError] = useState(''); const [saving, setSaving] = useState(false);
  const playback = useMusicPlayer();
  const playing = playback.status === 'playing' || playback.status === 'buffering';
  const elapsed = playback.elapsed;
  const listenedMs = useRef(0); const startedAt = useRef(null); const reactionTimer = useRef(null);
  useEffect(() => {
    let cancelled = false;
    api('/listening/rooms', { method: 'POST', body: JSON.stringify({ guest: guestId, songId: musicPlayer.getSnapshot().active?.id }) }).then(created => { if (!cancelled) setRoom(created); }).catch(error => { if (!cancelled) setRoomError(error.message); });
    api('/characters/' + guestId).then(guest => { if (!cancelled) setGuestCharacter(guest); }).catch(() => {});
    return () => { cancelled = true; clearTimeout(reactionTimer.current); };
  }, [guestId]);
  useEffect(() => {
    if (!playing) return;
    startedAt.current = Date.now();
    return () => { listenedMs.current += Date.now() - startedAt.current; startedAt.current = null; };
  }, [playing]);
  const toggle = async () => {
    await musicPlayer.toggle();
    const current = musicPlayer.getSnapshot();
    if (room) try { await api('/listening/rooms/' + room.id, { method:'PUT', body:JSON.stringify({ playing:current.status === 'playing', position:current.elapsed }) }); }
    catch (error) { setRoomError(error.message); }
  };
  const react = async value => {
    setReaction(value); clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(''), 1200);
    if (room) try { const updated = await api('/listening/rooms/' + room.id, { method:'PUT', body:JSON.stringify({ reactions:[...(room.reactions || []), value] }) }); setRoom(updated); } catch (error) { setRoomError(error.message); }
  };
  const finish = async () => {
    if (!room) return;
    setSaving(true); setRoomError('');
    const totalMs = listenedMs.current + (startedAt.current === null ? 0 : Date.now() - startedAt.current);
    try {
      await api('/listening/rooms/' + room.id, { method:'PUT', body:JSON.stringify({ status:'ended', playing:false, position:elapsed, minutes:Math.max(1, Math.ceil(totalMs / 60000)) }) });
      musicPlayer.pause(); navigate('/social/relationships');
    } catch (error) { setRoomError(error.message || '保存失败，请重试。'); }
    finally { setSaving(false); }
  };
  const clock = formatTime(elapsed);
  return <div className="listening-page"><div className="page-heading"><div><p className="eyebrow">LISTEN TOGETHER · {room?.id||'连接中'}</p><h1>一起听歌</h1></div><button className="icon-button" type="button" aria-label="返回广场" onClick={()=>navigate('/plaza')}><ArrowLeft size={18}/></button></div><div className="listening-scene"><div className="listen-person"><span className="avatar-fallback" aria-hidden="true">✦</span><small>纸飞机少年</small></div><button type="button" className={`record-disc ${playing?'playing':''}`} onClick={toggle} aria-label={playing?'暂停':'播放'}>{playing?<Pause size={28}/>:<Play size={28}/>}<span>{clock}</span></button><div className="listen-person"><span className="avatar-fallback" aria-hidden="true">{avatarGlyph(guestCharacter.avatar || guestCharacter.name)}</span><small>{displayName(guestCharacter.name)}</small></div>{reaction&&<div className="reaction-toast">{reaction}</div>}</div><div className="lyrics"><small>{playing?'正在播放':'已暂停'} · {playback.active?.title}</small><h2>{playback.active?.artist || '让音乐陪着你'}</h2><p>{playback.error || roomError || (playback.active?.source === 'local' ? '本地文件仅在当前设备播放。' : '与底部播放器同步，完整听完这一首。')}</p></div><div className="player-progress"><span style={{width:`${playback.duration ? Math.min(100, elapsed / playback.duration * 100) : 0}%`}}/></div><div className="listen-actions">{[['♡','喜欢'],['♫','点歌'],['☆','惊喜'],['✦','共鸣']].map(([item,label])=><button key={item} type="button" aria-label={label} onClick={()=>react(item)}>{item}</button>)}</div><button type="button" className="primary-button full" disabled={!room || saving} onClick={finish}>{saving ? '正在保存…' : '结束共听，保存这段记忆'}</button></div>
}

function Relationships() {
  const [relations,setRelations]=useState([]); useEffect(()=>{api('/relationships').then(items=>setRelations(Array.isArray(items)?items:[])).catch(()=>setRelations([]))},[]);
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">RELATIONSHIP MEMORY</p><h1>关系记忆</h1></div><Heart size={20}/></div>{relations.map(item=><div key={item.id}><div className="relationship-card"><div className="relation-avatars" aria-label="双方角色"><span className="avatar-fallback" aria-hidden="true">✦</span> <span aria-hidden="true">♫</span> <span className="avatar-fallback" aria-hidden="true">☾</span></div><h2>你和深夜旅人</h2><p>{item.level}</p><div className="relation-progress"><span style={{width:`${item.score}%`}}/></div><div className="relation-stats"><span><strong>{item.songs_shared}</strong>共同歌曲</span><span><strong>{item.listening_minutes}</strong>共听分钟</span><span><strong>{item.postcards_sent}</strong>张明信片</span></div></div>{(item.memories||[]).map((memory,index)=><div className="memory-card" key={`${memory.created_at}-${index}`}><span className="eyebrow">MUSIC MEMORY</span><h3>{memory.title}</h3><p>{new Date(memory.created_at).toLocaleString()}</p></div>)}</div>)}</div>
}

function MessagesPage() {
  const navigate=useNavigate(); const [data,setData]=useState({notices:[],messages:[],cards:[]}); useEffect(()=>{Promise.all([api('/notifications'),api('/song-messages'),api('/postcards')]).then(([notices,messages,cards])=>setData({notices:Array.isArray(notices)?notices:[],messages:Array.isArray(messages)?messages:[],cards:Array.isArray(cards)?cards:[]})).catch(()=>setData({notices:[],messages:[],cards:[]}))},[]);
  const mark=async item=>{await api(`/notifications/${item.id}/read`,{method:'PUT'});setData(current=>({...current,notices:current.notices.map(n=>n.id===item.id?{...n,read:true}:n)}));if(item.target)navigate(item.target)};
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">INBOX & ACTIVITY</p><h1>消息中心</h1></div><MessageCircle size={20}/></div><section className="data-section"><h2>动态通知</h2>{data.notices.map(item=><button type="button" key={item.id} className={`notice-card ${item.read?'read':''}`} onClick={()=>mark(item)}><span>{item.read?'✓':'●'}</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></button>)}{!data.notices.length&&<p className="empty-inline">还没有新的通知</p>}</section><section className="data-section"><h2>送歌记录 · {data.messages.length}</h2>{data.messages.map(item=><div className="history-row" key={item.id}><Music2 size={20}/><div><strong>{item.emotion} · {item.message}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div></div>)}</section><section className="data-section"><h2>明信片记录 · {data.cards.length}</h2></section></div>
}

function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/events').then(items => setEvents(Array.isArray(items) ? items : [])).catch(() => setError('活动暂时无法加载，请稍后重试。')).finally(() => setLoading(false)); }, []);
  const join = async id => {
    if (!authToken()) { navigate('/auth/login?redirect=%2Fplaza%2Fevents'); return; }
    setPendingId(id); setError('');
    try { const updated = await api(`/events/${id}/join`, { method: 'POST' }); setEvents(current => current.map(item => item.id === id ? updated : item)); }
    catch (caught) { setError(caught.message || '加入失败，请稍后重试。'); }
    finally { setPendingId(''); }
  };
  return <div className="content-page events-page"><div className="page-heading"><div><p className="eyebrow">LIVE MUSIC EVENTS · 星轨活动</p><h1>把一首歌，听成一段相遇。</h1><p>加入活动，与广场里的角色分享此刻。共听结束后，故事仍会留在你的音乐记忆里。</p></div><CalendarDays size={20}/></div>
    <div className="events-intro"><span>01 / 选择一个活动</span><span>02 / 加入音乐场景</span><span>03 / 去共听空间相遇</span></div>
    {loading && <div className="market-empty">正在打开活动星图…</div>}
    {error && <div className="market-feedback error" role="alert">{error}</div>}
    {!loading && !events.length && !error && <div className="market-empty">活动正在准备中，先去音乐广场逛逛吧。</div>}
    <div className="event-grid">{events.map((item, index) => <article className={`event-card event-feature event-tone-${index % 2}`} key={item.id}><div className="event-art"><span>ORBIT / 0{index + 1}</span><div className="event-art-core">{index % 2 ? '♫' : '✦'}</div><small>{item.participants} 个角色已加入</small></div><div className="event-feature-copy"><span className="event-kicker">{item.status} · {item.time}</span><h2>{item.title}</h2><p>{item.subtitle}</p><div className="event-feature-actions"><button type="button" className={item.joined ? 'secondary-button' : 'primary-button'} disabled={pendingId === item.id} onClick={() => item.joined ? navigate('/social/listening') : join(item.id)}>{pendingId === item.id ? '加入中…' : item.joined ? '进入共听空间' : '加入活动'} <ArrowRight size={16}/></button><small>{item.joined ? '已加入 · 可以继续去共听' : '加入后可继续进入共听空间'}</small></div></div></article>)}</div>
  </div>;
}

const shopDetails = {
  item_001: { line: '把每一次出发，留成一条会发光的路线。', note: '角色特效 · 适合毕业与远行', tone: 'paper' },
  item_002: { line: '把深夜的一首歌，戴成温柔的月光。', note: '角色道具 · 适合共听与陪伴', tone: 'moon' },
  item_003: { line: '让共同听过的歌，有一片可以回来的星河。', note: '房间背景 · 适合纪念共听', tone: 'vinyl' }
};
function ShopPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('item_002');
  const [filter, setFilter] = useState('全部');
  const [character, setCharacter] = useState(fallbackCharacter);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); api('/shop').then(rows => setItems(Array.isArray(rows) ? rows : [])).catch(() => setError('市集暂时无法加载，请稍后重试。')).finally(() => setLoading(false)); };
  useEffect(() => { load(); if (authToken()) api('/characters/me').then(setCharacter).catch(() => {}); }, []);
  const selected = items.find(item => item.id === selectedId) || items[0];
  const visible = items.filter(item => filter === '全部' || (filter === '我的衣橱' ? item.owned : item.type === filter));
  const detail = selected ? shopDetails[selected.id] || { line: '给角色添上一段新的音乐记忆。', note: selected.type, tone: 'paper' } : null;
  const baseLook = normalizeAppearance(character.appearance);
  const previewLook = selected ? normalizeAppearance({ ...baseLook, fx: { ...baseLook.fx, accessory: selected.icon, propLabel: selected.name, aura: selected.id === 'item_002' ? 'moon' : selected.id === 'item_003' ? 'stars' : 'orbit' } }) : baseLook;
  const buy = async item => {
    if (!authToken()) { navigate('/auth/login?redirect=%2Fplaza%2Fshop'); return; }
    setPendingId(item.id); setError(''); setNotice('');
    try { const updated = await api(`/shop/${item.id}/buy`, { method: 'POST' }); setItems(current => current.map(row => row.id === item.id ? updated : row)); setNotice(`「${item.name}」已收入衣橱。当前为体验收藏，不扣除音符。`); }
    catch (caught) { setError(caught.message || '收藏失败，请稍后重试。'); }
    finally { setPendingId(''); }
  };
  return <div className="content-page market-page">
    <div className="page-heading market-heading"><div><p className="eyebrow">SOUL MARKET · 星轨市集</p><h1>给你的故事，添一件信物。</h1><p>为角色挑选道具、特效与共听背景。先预览，再决定是否收藏。</p></div><ShoppingBag size={22}/></div>
    <div className="market-overview"><span><Sparkles size={15}/> 本期展出 <strong>{items.length}</strong> 件</span><span><Check size={15}/> 已收藏 <strong>{items.filter(item => item.owned).length}</strong> 件</span><small>体验版：音符为展示价格，收藏不会扣费</small></div>
    <div className="market-layout"><section className="market-catalog" aria-label="市集商品"><div className="market-section-head"><div><p className="eyebrow">CURATED OBJECTS</p><h2>本期星轨藏品</h2></div><span>点击物品，预览角色效果</span></div><div className="market-filters" role="group" aria-label="筛选物品">{['全部','角色特效','角色道具','房间背景','我的衣橱'].map(value => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); const first = items.find(item => value === '全部' || (value === '我的衣橱' ? item.owned : item.type === value)); if (first) setSelectedId(first.id); }}>{value}</button>)}</div>
      {loading && <div className="market-empty">正在点亮市集…</div>}
      {!loading && !error && !visible.length && <div className="market-empty">这个分类暂时还没有物品，看看其他星轨吧。</div>}
      <div className="market-items">{visible.map((item, index) => { const meta = shopDetails[item.id] || { line:'一件来自音乐宇宙的小礼物。', tone:'paper' }; return <article className={`market-item tone-${meta.tone} ${selected?.id === item.id ? 'is-selected' : ''}`} key={item.id}><button type="button" className="market-item-art" onClick={() => setSelectedId(item.id)} aria-label={`预览${item.name}`} aria-pressed={selected?.id === item.id}><span className="market-item-orbit"/><b>{item.icon}</b><small>0{index + 1} / SOUL OBJECT</small></button><div className="market-item-copy"><div className="market-item-top"><span>{item.type}</span><span>{item.owned ? '已收藏' : item.price ? `展示价 ${item.price} 音符` : '免费'}</span></div><h3>{item.name}</h3><p>{meta.line}</p><div className="market-item-actions"><button type="button" className="market-preview-link" onClick={() => setSelectedId(item.id)}>查看预览 <ArrowRight size={15}/></button><button type="button" className="market-collect" disabled={item.owned || pendingId === item.id} onClick={() => buy(item)}>{item.owned ? '已在衣橱' : pendingId === item.id ? '收藏中…' : '收入衣橱'}</button></div></div></article>; })}</div>
    </section><aside className="market-preview" aria-label="物品预览"><div className="market-preview-head"><span>LIVE PREVIEW</span><strong>角色试穿台</strong></div><div className={`market-preview-stage tone-${detail?.tone || 'paper'}`}><div className="market-preview-ring"/><CharacterAvatar appearance={previewLook}/><span className="market-preview-stamp">{selected?.icon || '✦'}</span></div><div className="market-preview-copy"><small>SELECTED OBJECT / 0{Math.max(1, items.findIndex(item => item.id === selected?.id) + 1)}</small><h2>{selected?.name || '挑选你的第一件信物'}</h2><p>{detail?.line || '点击左侧物品，看看它如何融入你的音乐角色。'}</p><span>{detail?.note || '音乐故事正在生长'}</span></div><div className="market-preview-footer"><p>这里是搭配示意，收藏后道具会记录在衣橱；角色装备功能仍在制作中。</p><button type="button" onClick={() => navigate('/character/me')}>查看我的角色 <ArrowRight size={16}/></button></div></aside></div>
    {(notice || error) && <div className={error ? 'market-feedback error' : 'market-feedback'} role={error ? 'alert' : 'status'}>{error || notice}{error && <button type="button" onClick={load}>重试</button>}</div>}
  </div>;
}

function CommunityPage() {
  const [posts,setPosts]=useState([]); const [content,setContent]=useState(''); const [emotion,setEmotion]=useState('此刻'); const [sending,setSending]=useState(false); useEffect(()=>{api('/community').then(items=>setPosts(Array.isArray(items)?items:[])).catch(()=>setPosts([]))},[]); const publish=async()=>{setSending(true);try{const item=await api('/community',{method:'POST',body:JSON.stringify({content,emotion,songId:'song_001'})});setPosts(current=>[item,...current]);setContent('')}finally{setSending(false)}};
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">COMMUNITY MOMENTS</p><h1>音乐社区</h1><p className="section-lead">你发布的心情会同步到音乐广场，成为角色头顶的一句话。</p></div><MessageCircle size={20}/></div><div className="community-compose"><CharacterAvatar compact/><div className="community-compose-main"><textarea aria-label="分享此刻心情" value={content} onChange={e=>setContent(e.target.value)} placeholder="让角色分享此刻的心情…"/><div className="mood-picker" role="group" aria-label="心情标签">{['此刻','期待','低落','焦虑','开心','想念'].map(item=><button type="button" key={item} className={emotion===item?'active':''} onClick={()=>setEmotion(item)}>{item}</button>)}</div></div><button type="button" className="primary-button" disabled={sending||!content.trim()} onClick={publish}>{sending?'发布中':'发布动态'}</button></div><div className="community-feed">{posts.map(item=><article key={item.id}><div className="feed-author"><span className="decor-note" aria-hidden="true">✦</span><div><strong>{displayName(item.author_name) || '音乐灵魂'}{item.mine ? '（我）' : ''}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div></div><p>{item.content}</p><span>{item.emotion || '此刻'} · ♫ 那些年　♡ {item.likes}</span></article>)}{!posts.length&&<div className="empty-card">还没有动态，成为第一个分享音乐心情的人</div>}</div></div>
}

function SettingsPage() {
  const [profile,setProfile]=useState(null); const [saved,setSaved]=useState(false); useEffect(()=>{api('/profile').then(setProfile)},[]); if(!profile)return <div className="content-page">正在加载设置…</div>; const toggle=key=>setProfile(current=>({...current,settings:{...current.settings,[key]:!current.settings[key]}})); const save=async()=>{const next=await api('/profile',{method:'PUT',body:JSON.stringify({settings:profile.settings})});setProfile(next);setSaved(true);setTimeout(()=>setSaved(false),1500)};
  const labels={publicCharacter:'公开我的角色',strangerMessages:'允许陌生角色送歌',autoplay:'进入共听后自动播放',notifications:'接收关系成长通知'};
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">PRIVACY & EXPERIENCE</p><h1>偏好设置</h1></div><Settings size={20}/></div><div className="settings-card">{Object.entries(labels).map(([key,label])=><button className="setting-row" key={key} type="button" role="switch" aria-checked={!!profile.settings[key]} onClick={()=>toggle(key)}><div><strong>{label}</strong><small>{profile.settings[key]?'已开启':'已关闭'}</small></div><span className={profile.settings[key]?'toggle on':'toggle'}><i/></span></button>)}<button type="button" className="primary-button full" onClick={save}><Save size={16}/>{saved?'设置已保存':'保存设置'}</button></div></div>
}

function Profile() {
  const navigate=useNavigate(); const [profile,setProfile]=useState(null); const [character,setCharacter]=useState(fallbackCharacter); const [editing,setEditing]=useState(false); const [stats,setStats]=useState({rooms:0,relations:0,memories:0}); useEffect(()=>{Promise.all([api('/profile'),api('/characters/me'),api('/listening/rooms'),api('/relationships')]).then(([p,c,rooms,relations])=>{const safeRooms=Array.isArray(rooms)?rooms:[];const safeRelations=Array.isArray(relations)?relations:[];setProfile(p||null);setCharacter(c||fallbackCharacter);setStats({rooms:safeRooms.length,relations:safeRelations.length,memories:safeRelations.reduce((sum,item)=>sum+(item.memories?.length||0),0)})}).catch(()=>{setCharacter(fallbackCharacter);setStats({rooms:0,relations:0,memories:0})})},[]); const save=async()=>{const next=await api('/profile',{method:'PUT',body:JSON.stringify({name:profile.name,bio:profile.bio})});setProfile(next);setEditing(false)};
  return <div className="content-page"><div className="page-heading"><div><p className="eyebrow">YOUR MUSIC LIFE</p><h1>我的空间</h1></div><button className="icon-button" type="button" aria-label="偏好设置" onClick={()=>navigate('/account/settings')}><Settings size={18}/></button></div><div className="profile-card"><CharacterAvatar appearance={character.appearance} compact/><div>{editing?<><input aria-label="昵称" value={profile?.name||''} onChange={e=>setProfile(current=>({...current,name:e.target.value}))}/><input aria-label="个人简介" value={profile?.bio||''} onChange={e=>setProfile(current=>({...current,bio:e.target.value}))}/></>:<><h2>{displayName(profile?.name || character.name)}</h2><p>{profile?.bio||character.story}</p></>}</div><button type="button" className="secondary-button" onClick={editing?save:()=>setEditing(true)}>{editing?'保存资料':'编辑资料'}</button></div><div className="profile-grid"><div><span>主题曲</span><strong>{character.song_title}</strong></div><div><span>共听次数</span><strong>{stats.rooms} 次</strong></div><div><span>关系好友</span><strong>{stats.relations} 位</strong></div><div><span>音乐记忆</span><strong>{stats.memories} 条</strong></div></div><div className="profile-shortcuts"><button type="button" onClick={()=>navigate('/community')}><MessageCircle size={20}/>音乐社区</button><button type="button" onClick={()=>navigate('/plaza/events')}><CalendarDays size={20}/>广场活动</button><button type="button" onClick={()=>navigate('/plaza/shop')}><ShoppingBag size={20}/>角色商店</button><button type="button" onClick={()=>navigate('/account/messages')}><Bell size={20}/>消息中心</button></div></div>
}

function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const register = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('lesheng-auth-token', result.token); localStorage.setItem('lesheng-auth-user', JSON.stringify(result.user)); if (result.characterId) localStorage.setItem('lesheng-auth-character', result.characterId);
      if (register) { navigate('/create/photo'); } else { const params = new URLSearchParams(location.search); const redirect = params.get('redirect'); navigate(redirect && redirect.startsWith('/') && !redirect.startsWith('/auth/') ? redirect : '/'); }
    } catch (requestError) { setError(requestError.message || '暂时无法完成请求，请稍后再试'); } finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-orbit auth-orbit-one"/><div className="auth-orbit auth-orbit-two"/><section className="auth-card"><div className="auth-brand"><span className="brand-mark">✦</span><div><strong>乐生宇宙</strong><small>LES HENG · MUSIC SOUL</small></div></div><div className="auth-copy"><p className="eyebrow">{register ? 'BEGIN YOUR STORY' : 'WELCOME BACK'}</p><h1>{register ? '让你的故事，拥有一个角色' : '欢迎回到你的音乐宇宙'}</h1><p>{register ? '注册后保存你的角色、音乐记忆和关系成长。' : '登录后继续生成角色，回到你的音乐关系。'}</p></div><form className="auth-form" onSubmit={submit}>{register && <label htmlFor="auth-name"><span>你的昵称</span><input id="auth-name" autoComplete="name" value={form.name} onChange={event=>setForm({...form,name:event.target.value})} placeholder="例如：纸飞机少年" required/></label>}<label htmlFor="auth-email"><span>邮箱</span><input id="auth-email" type="email" autoComplete="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} placeholder="you@example.com" required/></label><label htmlFor="auth-password"><span>密码</span><input id="auth-password" type="password" minLength={6} autoComplete={register?'new-password':'current-password'} value={form.password} onChange={event=>setForm({...form,password:event.target.value})} placeholder="至少 6 位字符" required/></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? '正在连接音乐宇宙…' : register ? '创建我的账号' : '进入我的宇宙'} <ArrowRight size={18}/></button></form><div className="auth-switch">{register ? '已经有账号？' : '第一次来到这里？'}<Link to={register ? '/auth/login' : '/auth/register'}>{register ? '直接登录' : '注册账号'}</Link></div><p className="auth-privacy"><ShieldCheck size={14}/> 你的故事素材只会在你确认后用于生成角色</p></section></div>;
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!authToken()) return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
function App() { return <BrowserRouter><AppShell><Routes><Route path="/" element={<Home/>}/><Route path="/auth/login" element={<AuthPage/>}/><Route path="/auth/register" element={<AuthPage mode="register"/>}/><Route path="/welcome" element={<OnboardingPage/>}/><Route path="/create" element={<Navigate to="/create/photo" replace/>}/><Route path="/create/generate" element={<RequireAuth><GeneratePage/></RequireAuth>}/><Route path="/create/*" element={<RequireAuth><CreatePage/></RequireAuth>}/><Route path="/character" element={<Navigate to="/character/me" replace/>}/><Route path="/character/me" element={<RequireAuth><CharacterPage mine/></RequireAuth>}/><Route path="/character/:id" element={<CharacterPage/>}/><Route path="/plaza" element={<Plaza/>}/><Route path="/plaza/discover" element={<Discover/>}/><Route path="/plaza/events" element={<EventsPage/>}/><Route path="/plaza/shop" element={<ShopPage/>}/><Route path="/community" element={<CommunityPage/>}/><Route path="/social" element={<Navigate to="/social/send-song" replace/>}/><Route path="/social/send-song" element={<RequireAuth><SocialPage/></RequireAuth>}/><Route path="/social/postcards" element={<RequireAuth><Postcards/></RequireAuth>}/><Route path="/social/postcards/create" element={<RequireAuth><CreatePostcard/></RequireAuth>}/><Route path="/social/listening" element={<RequireAuth><Listening/></RequireAuth>}/><Route path="/social/listening/create" element={<RequireAuth><Listening/></RequireAuth>}/><Route path="/social/relationships" element={<RequireAuth><Relationships/></RequireAuth>}/><Route path="/account" element={<Navigate to="/profile" replace/>}/><Route path="/account/messages" element={<RequireAuth><MessagesPage/></RequireAuth>}/><Route path="/account/settings" element={<RequireAuth><SettingsPage/></RequireAuth>}/><Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></AppShell></BrowserRouter> }

createRoot(document.getElementById('root')).render(<App />);
