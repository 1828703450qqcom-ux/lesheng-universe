import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ListMusic, Music2, Pause, Play, Repeat, Search, SkipBack, SkipForward, Trash2, Upload, Volume2 } from 'lucide-react';
import { musicPlayer, useMusicPlayer, loadMusicCatalog } from './player.js';
import { formatTime } from './playerStore.js';

const repeatLabels = { list: '列表循环', one: '单曲循环', off: '播完停止' };
const localAudioTypes = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac', webm: 'audio/webm' };
export default function MusicPlayerDock() {
  const state = useMusicPlayer();
  const { active, tracks, status, elapsed, duration, volume, error, repeat } = state;
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('full');
  const [importNotice, setImportNotice] = useState('');
  const input = useRef(null);
  const playing = status === 'playing' || status === 'buffering';
  const loading = status === 'loading' || status === 'buffering';
  useEffect(() => { loadMusicCatalog(); }, []);
  useEffect(() => {
    if (!navigator.mediaSession) return;
    const handlers = { play: () => musicPlayer.play(), pause: () => musicPlayer.pause(), previoustrack: () => musicPlayer.next(-1), nexttrack: () => musicPlayer.next(1), seekto: event => musicPlayer.seek(event.seekTime) };
    for (const [action, handler] of Object.entries(handlers)) { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} }
    return () => { for (const action of Object.keys(handlers)) { try { navigator.mediaSession.setActionHandler(action, null); } catch {} } };
  }, []);
  useEffect(() => {
    if (navigator.mediaSession && window.MediaMetadata && active) navigator.mediaSession.metadata = new MediaMetadata({ title: active.title, artist: active.artist, album: '乐生宇宙' });
  }, [active?.id]);
  useEffect(() => { if (navigator.mediaSession) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; }, [playing]);
  const importFiles = event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    const valid = files.filter(file => /\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(file.name) && file.size > 0 && file.size <= 200 * 1024 * 1024);
    const added = valid.map(file => ({ id: 'local-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2)), title: file.name.replace(/\.[^.]+$/, ''), artist: '本地音频', mood: '当前设备', source: 'local', available: true, url: URL.createObjectURL(new Blob([file], { type: localAudioTypes[file.name.split('.').pop().toLowerCase()] })) }));
    if (added.length) { musicPlayer.addTracks(added); musicPlayer.load(added[0]); setFilter('full'); setQuery(''); }
    setImportNotice(added.length ? `已导入 ${added.length} 首，完整文件仅在当前页面播放${valid.length < files.length ? '；已跳过空文件、超出 200MB 或不支持的格式' : ''}。` : '请选择 MP3、M4A、WAV、OGG、FLAC、AAC 或 WEBM 文件，单首不超过 200MB。');
  };
  const filtered = tracks.filter(track => filter !== 'full' || track.available || track.url).filter(track => `${track.title} ${track.artist}`.toLowerCase().includes(query.trim().toLowerCase()));
  const fullCount = tracks.filter(track => track.available || track.url).length;
  const cycleRepeat = () => musicPlayer.setRepeat(repeat === 'list' ? 'one' : repeat === 'one' ? 'off' : 'list');
  const label = status === 'unavailable' ? '暂无完整音源' : loading ? '正在缓冲…' : status === 'error' ? '加载失败 · 可重试' : active?.source === 'local' ? '本地完整音频' : active?.available ? '完整曲目' : '歌曲目录';
  return <section className={`music-dock full-music-player ${expanded ? 'is-expanded' : ''}`} aria-label="乐生音乐播放器">
    <div className="music-dock-main">
      <button type="button" className={`music-disc ${playing ? 'is-playing' : ''}`} onClick={musicPlayer.toggle} aria-label={playing ? '暂停音乐' : '播放音乐'}><Music2 size={18}/></button>
      <div className="music-track"><small>{label}</small><strong title={active?.title}>{active?.title || '选择一首歌'}</strong><span>{active?.artist} {duration > 0 ? '· ' + formatTime(elapsed) + ' / ' + formatTime(duration) : ''}</span></div>
      <div className="music-controls"><button type="button" onClick={() => musicPlayer.next(-1)} aria-label="上一首"><SkipBack size={17}/></button><button type="button" className="music-toggle" onClick={musicPlayer.toggle} aria-label={playing ? '暂停' : loading ? '取消加载' : '播放'}>{loading ? <i/> : playing ? <Pause size={18}/> : <Play size={18}/>}</button><button type="button" onClick={() => musicPlayer.next(1)} aria-label="下一首"><SkipForward size={17}/></button></div>
      <div className="music-timeline"><span>{formatTime(elapsed)}</span><input aria-label="播放进度" aria-valuetext={`${formatTime(elapsed)} / ${formatTime(duration)}`} disabled={!duration} type="range" min="0" max={duration || 1} step=".1" value={Math.min(elapsed, duration || 0)} onChange={event => musicPlayer.seek(event.target.value)}/><span>{formatTime(duration)}</span></div>
      <label className="music-volume"><Volume2 size={15}/><input aria-label="音量" type="range" min="0" max="1" step=".05" value={volume} onChange={event => musicPlayer.setVolume(event.target.value)}/></label>
      <button type="button" className="music-list-toggle" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={expanded ? '关闭播放列表' : '打开播放列表'}>{expanded ? <ChevronDown size={18}/> : <ListMusic size={18}/>}</button>
    </div>
    {error && <div className="player-error" role="status"><span>{error}</span><button type="button" onClick={() => musicPlayer.load(active)}>重试</button><button type="button" onClick={() => { setExpanded(true); setFilter('full'); }}>选曲</button></div>}
    {expanded && <div className="player-library">
      <div className="player-library-head"><div><small>YOUR LISTENING SPACE</small><h2>此刻，完整听一首。</h2></div><button type="button" className="player-repeat" onClick={cycleRepeat} aria-label={`播放模式：${repeatLabels[repeat]}`}><Repeat size={15}/>{repeatLabels[repeat]}</button></div>
      <div className="player-library-tools"><div className="player-filters"><button type="button" className={filter === 'full' ? 'active' : ''} onClick={() => setFilter('full')}>完整曲目 · {fullCount}</button><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部歌曲</button></div><label className="player-search"><Search size={15}/><input aria-label="搜索播放列表" placeholder="搜索歌曲 / 歌手" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <div className="music-playlist" aria-label="播放列表">{filtered.map((track, index) => <div className={`player-song ${track.id === active?.id ? 'active' : ''}`} key={track.id}><button type="button" className="player-song-select" onClick={() => musicPlayer.load(track)} aria-label={`播放 ${track.title}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{track.title}</strong><small>{track.artist} · {track.source === 'local' ? '本地完整音频' : track.available ? '完整曲目' : '待接入音源'}</small></div><i>{track.id === active?.id && playing ? '正在播放' : track.available ? '完整' : '待接入'}</i></button>{track.source === 'local' && <button type="button" className="player-remove" aria-label={`移除 ${track.title}`} onClick={() => musicPlayer.removeLocal(track.id)}><Trash2 size={14}/></button>}</div>)}{!filtered.length && <p className="player-empty">没有找到歌曲，试试其他关键词或导入本地音频。</p>}</div>
      <div className="music-import"><input ref={input} type="file" multiple accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.webm" aria-label="导入本地完整音频" onChange={importFiles}/><button type="button" onClick={() => input.current?.click()}><Upload size={14}/>导入本地完整音频</button><span role="status">{importNotice || '无需登录，按文件原始时长播放；文件不会上传。'}</span></div>
      <footer className="player-attribution">内置完整曲目：T. Schürger / <a href="https://www.soundhelix.com/audio-examples" target="_blank" rel="noreferrer">SoundHelix</a></footer>
    </div>}
  </section>;
}
