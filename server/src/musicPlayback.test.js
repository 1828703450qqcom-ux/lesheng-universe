import test from 'node:test';
import assert from 'node:assert/strict';
import { bundledSongs, resolveSongPlayback } from './musicPlayback.js';

const song = { id: 'song_001', title: '那些年', duration: 238 };
const options = payload => ({ providerUrl: 'https://licensed.example/play/:id', fetchImpl: async () => ({ ok: true, json: async () => payload }) });

test('bundled full tracks have independent attribution, source and duration', async () => {
  for (const track of bundledSongs) { const result = await resolveSongPlayback(track); assert.equal(result.playable, true); assert.equal(result.mode, 'open'); assert.match(result.url, /^\/media\/audio\/bundled\/soundhelix-\d-indexed\.mp3$/); assert.ok(result.duration > 300); }
});
test('a catalog entry without a provider never claims to be playable', async () => {
  const result = await resolveSongPlayback(song); assert.equal(result.playable, false); assert.equal(result.url, undefined);
});
test('uploaded full audio keeps its actual URL', async () => {
  const result = await resolveSongPlayback({ ...song, audio_url: '/media/audio/authorized.mp3', audio_source: 'user-authorized-upload' }); assert.equal(result.mode, 'uploaded'); assert.equal(result.url, '/media/audio/authorized.mp3');
});
test('licensed providers receive auth, song id and a finite timeout signal', async () => {
  let call;
  const result = await resolveSongPlayback(song, { providerUrl: 'https://licensed.example/:id', providerToken: 'test-token', fetchImpl: async (url, config) => { call = { url, config }; return { ok: true, json: async () => ({ data: { playUrl: 'https://cdn.example/full.mp3', duration: 250 } }) }; } });
  assert.equal(call.url, 'https://licensed.example/song_001'); assert.equal(call.config.headers.Authorization, 'Bearer test-token'); assert.ok(call.config.signal instanceof AbortSignal); assert.equal(result.duration, 250); assert.equal(result.playable, true);
});
test('preview flags at either level are never reported as full tracks', async () => {
  for (const payload of [{ mode: 'preview', url: 'https://cdn.example/clip.mp3' }, { data: { isPreview: true, url: 'https://cdn.example/clip.mp3' } }]) { const result = await resolveSongPlayback(song, options(payload)); assert.equal(result.playable, false); assert.equal(result.mode, 'preview'); assert.equal(result.url, undefined); }
});
test('unavailable provider response is not disguised as licensed audio', async () => {
  const result = await resolveSongPlayback(song, options({ playable: false, url: 'https://cdn.example/old.mp3' })); assert.equal(result.playable, false);
});
test('invalid URLs and malformed provider responses return clear errors', async () => {
  for (const payload of [{ url: 'javascript:bad' }, { url: '/unknown.mp3' }, {}, null]) await assert.rejects(resolveSongPlayback(song, options(payload)), /播放地址|返回格式/);
});
test('provider network and HTTP failures do not hang the player', async () => {
  await assert.rejects(resolveSongPlayback(song, { ...options({}), fetchImpl: async () => { throw new Error('offline'); } }), /连接失败或超时/);
  await assert.rejects(resolveSongPlayback(song, { ...options({}), fetchImpl: async () => ({ ok: false }) }), /暂时不可用/);
});
