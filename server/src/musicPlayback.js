// Complete, attributed tracks hosted with this application; never substitute for another song.
export const bundledSongs = [1, 2].map(number => ({
  id: `soundhelix_${number}`, title: `SoundHelix Song ${number}`, artist: 'T. Schürger',
  cover: '♫', mood: number === 1 ? '电子 / 星轨漫游' : '电子 / 夜间共听',
  duration: number === 1 ? 372.715 : 425.953,
  audio_url: `/media/audio/bundled/soundhelix-${number}-indexed.mp3`, audio_source: 'open',
  attribution: 'SoundHelix · T. Schürger', source_page: 'https://www.soundhelix.com/audio-examples'
}));

const providerError = (code, message) => Object.assign(new Error(message), { code });
const isPreview = payload => payload.mode === 'preview' || payload.preview === true || payload.isPreview === true;

export async function resolveSongPlayback(song, { providerUrl = '', providerToken = '', fetchImpl = fetch, timeout = 10000 } = {}) {
  const base = { songId: song.id, title: song.title, duration: song.duration };
  if (song.audio_url) {
    return { ...base, playable: true, mode: song.audio_source === 'open' ? 'open' : song.audio_source === 'user-authorized-upload' ? 'uploaded' : 'licensed', url: song.audio_url };
  }
  if (!providerUrl) return { ...base, mode: 'unavailable', playable: false, message: '这首歌尚未接入授权完整音源，请选择完整曲目或导入本地音频。' };
  let response;
  try {
    response = await fetchImpl(providerUrl.replace(':id', encodeURIComponent(song.id)), {
      headers: providerToken ? { Authorization: `Bearer ${providerToken}` } : {}, signal: AbortSignal.timeout(timeout)
    });
  } catch {
    throw providerError('MUSIC_PROVIDER_NETWORK_ERROR', '音乐服务连接失败或超时，请稍后重试。');
  }
  if (!response.ok) throw providerError('MUSIC_PROVIDER_ERROR', '音乐服务暂时不可用。');
  let payload;
  try { payload = await response.json(); } catch { throw providerError('MUSIC_PROVIDER_RESPONSE_ERROR', '音乐服务返回格式错误。'); }
  if (!payload || typeof payload !== 'object') throw providerError('MUSIC_PROVIDER_RESPONSE_ERROR', '音乐服务返回格式错误。');
  const detail = payload.data && typeof payload.data === 'object' ? payload.data : {};
  if (payload.playable === false || detail.playable === false) return { ...base, mode: 'unavailable', playable: false, message: '这首歌目前没有可用的完整音源。' };
  if (isPreview(payload) || isPreview(detail)) return { ...base, mode: 'preview', playable: false, message: '这个音源仅提供试听片段，不是完整歌曲。' };
  const url = payload.url || payload.playUrl || detail.url || detail.playUrl;
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw providerError('MUSIC_PLAYBACK_URL_MISSING', '音乐服务未返回有效的播放地址。');
  const duration = Number(payload.duration || detail.duration);
  return { ...base, mode: 'licensed', playable: true, url, ...(duration > 0 && Number.isFinite(duration) ? { duration } : {}) };
}
