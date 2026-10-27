// One playback engine for the dock and plaza. No synthesized fallback or preview loop.
export const FULL_TRACKS = [1, 2].map(number => ({
  id: `soundhelix_${number}`, title: `SoundHelix Song ${number}`, artist: 'T. Schürger',
  mood: number === 1 ? '电子 / 星轨漫游' : '电子 / 夜间共听',
  url: `/music/soundhelix-${number}-indexed.mp3`, source: 'open', available: true,
  attribution: 'SoundHelix · T. Schürger', sourcePage: 'https://www.soundhelix.com/audio-examples'
}));

export const formatTime = value => {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function createPlayer({ makeAudio = () => new Audio(), resolveTrack, tracks = FULL_TRACKS, loadTimeout = 25000 } = {}) {
  let snapshot = { tracks, active: tracks[0], status: 'idle', elapsed: 0, duration: 0, buffered: 0, volume: .72, repeat: 'list', error: '' };
  const listeners = new Set();
  let audio = null, sequence = 0, playSequence = 0, wantsPlayback = false, request = null, loadTimer = null, cleanup = () => {};
  const notify = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const clearLoadTimer = () => { clearTimeout(loadTimer); loadTimer = null; };
  const release = () => {
    clearLoadTimer(); cleanup(); cleanup = () => {};
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  };
  const fail = message => { ++sequence; ++playSequence; wantsPlayback = false; request?.abort(); release(); notify({ status: 'error', error: message }); };
  const armTimeout = () => { clearLoadTimer(); loadTimer = setTimeout(() => fail('音频加载超时，请重试或选择其他歌曲。'), loadTimeout); };
  const playAudio = async (element, ticket) => {
    if (!element.paused && snapshot.status === 'playing') return;
    const playTicket = ++playSequence;
    wantsPlayback = true;
    armTimeout();
    try { await element.play(); }
    catch (error) {
      if (ticket !== sequence || playTicket !== playSequence || error.name === 'AbortError') return;
      clearLoadTimer();
      wantsPlayback = false;
      notify({ status: error.name === 'NotAllowedError' ? 'paused' : 'error', error: error.name === 'NotAllowedError' ? '点击播放继续收听。' : '这段音频无法播放，请重试或更换音频文件。' });
    }
  };
  const load = async (track, autoplay = true) => {
    if (!track) return;
    const ticket = ++sequence;
    ++playSequence; wantsPlayback = autoplay;
    request?.abort(); request = new AbortController(); release();
    notify({ active: track, elapsed: 0, duration: 0, buffered: 0, status: 'loading', error: '' });
    armTimeout();
    try {
      const resolved = track.url ? { url: track.url, mode: track.source } : await resolveTrack?.(track, request.signal);
      if (ticket !== sequence) return;
      if (!resolved?.url || resolved.playable === false) {
        clearLoadTimer();
        notify({ status: 'unavailable', error: resolved?.mode === 'preview' ? '这个音源只提供试听片段，请选择完整曲目或导入本地音频。' : `《${track.title}》暂未接入完整音源。可以导入本地音频，或选择「完整曲目」继续听。` });
        return;
      }
      if (resolved.mode === 'preview' || resolved.preview === true || resolved.isPreview === true) {
        clearLoadTimer(); notify({ status: 'unavailable', error: '这个音源只提供试听片段，请选择完整曲目或导入本地音频。' }); return;
      }
      // Keep the user-activated element across songs (important for mobile autoplay).
      const element = audio || makeAudio(); audio = element;
      element.preload = 'auto'; element.volume = snapshot.volume;
      element.setAttribute?.('playsinline', '');
      const handlers = {
        loadedmetadata: () => { notify({ duration: Number.isFinite(element.duration) ? element.duration : 0, ...(!autoplay ? { status: 'paused' } : {}) }); if (!autoplay) clearLoadTimer(); },
        durationchange: () => notify({ duration: Number.isFinite(element.duration) ? element.duration : 0 }),
        timeupdate: () => notify({ elapsed: element.currentTime || 0 }),
        progress: () => { let buffered = 0; for (let i = 0; i < element.buffered.length; i++) if (element.buffered.start(i) <= element.currentTime + .5) buffered = Math.max(buffered, element.buffered.end(i)); notify({ buffered }); },
        playing: () => { if (!wantsPlayback) { element.pause(); return; } clearLoadTimer(); notify({ status: 'playing', error: '' }); },
        pause: () => { clearLoadTimer(); if (!element.ended) notify({ status: 'paused' }); },
        waiting: () => { if (wantsPlayback && !element.paused) { notify({ status: 'buffering' }); armTimeout(); } },
        error: () => fail(element.error?.code === 4 ? '当前浏览器无法解码这个音频，请换用 MP3/M4A 文件或其他浏览器。' : element.error?.code === 3 ? '音频解码失败，文件可能损坏或编码不受支持，请更换音频。' : '音频加载失败。请检查网络后重试，或更换音频文件。'),
        ended: () => {
          clearLoadTimer();
          if (snapshot.repeat === 'one') { element.currentTime = 0; playAudio(element, ticket); }
          else if (snapshot.repeat === 'list') player.next(1);
          else { wantsPlayback = false; notify({ status: 'ended', elapsed: element.duration }); }
        }
      };
      const guardedHandlers = Object.entries(handlers).map(([name, handler]) => [name, () => { if (ticket === sequence) handler(); }]);
      for (const [name, handler] of guardedHandlers) element.addEventListener(name, handler);
      cleanup = () => { for (const [name, handler] of guardedHandlers) element.removeEventListener(name, handler); };
      // Relative API URLs belong to the API host, bundled/local files to the page.
      element.src = resolved.url;
      notify({ active: { ...track, source: track.source || resolved.mode, available: true }, tracks: snapshot.tracks.map(item => item.id === track.id ? { ...item, available: true } : item) });
      element.load();
      if (autoplay) await playAudio(element, ticket);
    } catch (error) {
      if (ticket !== sequence || error.name === 'AbortError') return;
      fail(error.message || '无法取得播放地址，请重试。');
    }
  };
  const player = {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    load,
    toggle: () => {
      if (snapshot.status === 'loading') return player.pause();
      if (!audio?.src || ['error', 'unavailable'].includes(snapshot.status)) return load(snapshot.active);
      if (!audio.paused) player.pause();
      else { if (audio.ended) audio.currentTime = 0; notify({ error: '' }); return playAudio(audio, sequence); }
    },
    pause: () => { ++playSequence; wantsPlayback = false; clearLoadTimer(); if (snapshot.status === 'loading') { ++sequence; request?.abort(); release(); } audio?.pause(); notify({ status: 'paused' }); },
    play: () => { if (snapshot.status === 'loading') return; if (!audio?.src || ['error', 'unavailable'].includes(snapshot.status)) return load(snapshot.active); if (audio.ended) audio.currentTime = 0; return playAudio(audio, sequence); },
    next: (direction = 1) => {
      const playable = snapshot.tracks.filter(item => item.available || item.url);
      if (!playable.length) return;
      const current = playable.findIndex(item => item.id === snapshot.active?.id);
      const index = current < 0 ? (direction > 0 ? 0 : playable.length - 1) : (current + direction + playable.length) % playable.length;
      return load(playable[index]);
    },
    seek: value => {
      if (!audio?.src || !Number.isFinite(Number(value)) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const time = Math.max(0, Math.min(audio.duration, Number(value) || 0));
      audio.currentTime = time; notify({ elapsed: time });
    },
    setVolume: value => { const volume = Math.max(0, Math.min(1, Number(value) || 0)); if (audio) audio.volume = volume; notify({ volume }); },
    setRepeat: repeat => { if (['list', 'one', 'off'].includes(repeat)) notify({ repeat }); },
    addTracks: items => {
      const merged = new Map(snapshot.tracks.map(item => [item.id, item]));
      for (const item of items) {
        if (!item?.id) continue;
        merged.set(item.id, { ...merged.get(item.id), ...item });
      }
      const updated = merged.get(snapshot.active?.id);
      notify({ tracks: [...merged.values()], ...(updated ? { active: { ...snapshot.active, ...updated } } : {}) });
    },
    removeLocal: id => {
      const item = snapshot.tracks.find(track => track.id === id && track.source === 'local');
      if (!item) return;
      const tracks = snapshot.tracks.filter(track => track.id !== id);
      if (snapshot.active?.id === id) { ++sequence; ++playSequence; wantsPlayback = false; request?.abort(); release(); notify({ active: tracks[0], status: 'idle', duration: 0, elapsed: 0, buffered: 0, error: '' }); }
      notify({ tracks }); URL.revokeObjectURL(item.url);
    },
    dispose: () => { ++sequence; ++playSequence; wantsPlayback = false; request?.abort(); release(); for (const item of snapshot.tracks) if (item.source === 'local') URL.revokeObjectURL(item.url); audio = null; listeners.clear(); }
  };
  return player;
}
