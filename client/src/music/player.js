import { useSyncExternalStore } from 'react';
import { createPlayer } from './playerStore.js';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${location.hostname}:4000/api` : '/api');
export const musicPlayer = createPlayer({
  resolveTrack: async (track, signal) => {
    const response = await fetch(`${API}/songs/${encodeURIComponent(track.id)}/playback`, { signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '暂时无法连接音乐服务。');
    if (!payload || typeof payload !== 'object') throw new Error('音乐服务返回了无效的播放信息。');
    if (payload.url) payload.url = new URL(payload.url, new URL(API, location.href)).href;
    return payload;
  }
});
export const useMusicPlayer = () => useSyncExternalStore(musicPlayer.subscribe, musicPlayer.getSnapshot);

let catalogRequest;
export function loadMusicCatalog() {
  if (!catalogRequest) catalogRequest = fetch(`${API}/songs`).then(response => {
    if (!response.ok) throw new Error('无法加载歌曲目录');
    return response.json();
  }).then(items => { if (Array.isArray(items)) musicPlayer.addTracks(items.map(item => ({ ...item, available: Boolean(item.audio_url), ...(item.audio_url ? { url: new URL(item.audio_url, new URL(API, location.href)).href } : {}) }))); }).catch(() => { catalogRequest = null; });
  return catalogRequest;
}
