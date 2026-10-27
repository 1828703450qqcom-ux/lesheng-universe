import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from './playerStore.js';

class FakeAudio extends EventTarget {
  duration = 210; currentTime = 0; paused = true; ended = false; volume = 1;
  buffered = { length: 0 };
  load() { this.currentTime = 0; this.ended = false; if (this.src) this.dispatchEvent(new Event('loadedmetadata')); }
  removeAttribute() { this.src = ''; }
  play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
}
const tracks = [{ id: 'one', title: 'One', url: '/one.mp3', available: true }, { id: 'two', title: 'Two', url: '/two.mp3', available: true }];
const setup = options => {
  const audio = [];
  const player = createPlayer({ tracks, makeAudio: () => { const element = new FakeAudio(); audio.push(element); return element; }, ...options });
  return { player, audio };
};
test('keeps actual full duration and advances beyond the former 16-second cutoff', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0]); audio[0].currentTime = 65; audio[0].dispatchEvent(new Event('timeupdate')); assert.equal(player.getSnapshot().duration, 210); assert.equal(player.getSnapshot().elapsed, 65); assert.equal(player.getSnapshot().status, 'playing'); player.seek(195); assert.equal(audio[0].currentTime, 195); } finally { player.dispose(); }
});
test('a late source response cannot replace a newer selection', async () => {
  let resolve;
  const { player, audio } = setup({ resolveTrack: () => new Promise(done => { resolve = done; }) });
  try { const pending = player.load({ id: 'remote', title: 'Remote' }); await player.load(tracks[1]); resolve({ url: '/stale.mp3' }); await pending; assert.equal(player.getSnapshot().active.id, 'two'); assert.equal(audio.length, 1); assert.equal(audio[0].src, '/two.mp3'); } finally { player.dispose(); }
});
test('missing and preview sources never synthesize another song', async () => {
  for (const response of [{ playable: false }, { url: '/preview.mp3', mode: 'preview' }]) {
    const { player, audio } = setup({ resolveTrack: async () => response });
    try { await player.load({ id: 'remote', title: 'Remote' }); assert.equal(player.getSnapshot().status, 'unavailable'); assert.equal(audio.length, 0); } finally { player.dispose(); }
  }
});
test('end advances to next full track and skips tracks without a source', async () => {
  const { player, audio } = setup();
  try { player.addTracks([{ id: 'unavailable', title: 'No source' }]); await player.load(tracks[1]); audio[0].ended = true; audio[0].dispatchEvent(new Event('ended')); assert.equal(player.getSnapshot().active.id, 'one'); assert.equal(audio.length, 1); assert.equal(audio[0].src, '/one.mp3'); } finally { player.dispose(); }
});

test('switching tracks reuses one activated audio element and retains volume', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0]); player.setVolume(.3); await player.load(tracks[1]); assert.equal(audio.length, 1); assert.equal(audio[0].src, '/two.mp3'); assert.equal(audio[0].volume, .3); assert.equal(player.getSnapshot().status, 'playing'); } finally { player.dispose(); }
});

test('refreshing catalog updates existing songs without duplicating them', async () => {
  const { player } = setup();
  try { player.addTracks([{ id: 'one', title: 'Updated', url: '/updated.mp3' }]); assert.equal(player.getSnapshot().tracks.length, 2); assert.equal(player.getSnapshot().active.title, 'Updated'); assert.equal(player.getSnapshot().active.url, '/updated.mp3'); } finally { player.dispose(); }
});

test('pause cancels a pending play and ignores its delayed failure', async () => {
  let rejectPlay;
  const { player, audio } = setup();
  try {
    await player.load(tracks[0]);
    audio[0].play = () => new Promise((_resolve, reject) => { rejectPlay = reject; });
    player.pause(); const pending = player.play(); player.pause();
    rejectPlay(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); await pending;
    assert.equal(player.getSnapshot().status, 'paused'); assert.equal(player.getSnapshot().error, '');
    audio[0].paused = false; audio[0].dispatchEvent(new Event('playing'));
    assert.equal(audio[0].paused, true);
  } finally { player.dispose(); }
});

test('autoplay rejection offers a tap to resume instead of fake playing state', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0], false); audio[0].play = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); await player.play(); assert.equal(player.getSnapshot().status, 'paused'); assert.match(player.getSnapshot().error, /点击播放/); } finally { player.dispose(); }
});

test('pausing buffering cancels its timeout without stopping a later retry', async () => {
  const { player, audio } = setup({ loadTimeout: 15 });
  try { await player.load(tracks[0]); audio[0].dispatchEvent(new Event('waiting')); assert.equal(player.getSnapshot().status, 'buffering'); player.pause(); await new Promise(done => setTimeout(done, 30)); assert.equal(player.getSnapshot().status, 'paused'); await player.play(); assert.equal(player.getSnapshot().status, 'playing'); } finally { player.dispose(); }
});

test('a stalled source resolver times out and cannot start playback late', async () => {
  let resolve;
  const { player, audio } = setup({ loadTimeout: 10, resolveTrack: () => new Promise(done => { resolve = done; }) });
  try { const pending = player.load({ id: 'stalled', title: 'Stalled' }); await new Promise(done => setTimeout(done, 30)); assert.equal(player.getSnapshot().status, 'error'); resolve({ url: '/late.mp3' }); await pending; assert.equal(audio.length, 0); } finally { player.dispose(); }
});

test('invalid seeks and invalid repeat modes do not corrupt playback', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0]); player.seek(50); player.seek('not-a-number'); player.setRepeat('invalid'); assert.equal(audio[0].currentTime, 50); assert.equal(player.getSnapshot().repeat, 'list'); } finally { player.dispose(); }
});

test('a redundant play request does not install a false loading timeout', async () => {
  const { player } = setup({ loadTimeout: 10 });
  try { await player.load(tracks[0]); await player.play(); await new Promise(done => setTimeout(done, 30)); assert.equal(player.getSnapshot().status, 'playing'); } finally { player.dispose(); }
});

test('unsupported native codecs show a format error and release the failed source', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0]); audio[0].error = { code: 4 }; audio[0].dispatchEvent(new Event('error')); assert.match(player.getSnapshot().error, /无法解码/); assert.equal(audio[0].src, ''); } finally { player.dispose(); }
});
test('single repeat and stop after current song modes work', async () => {
  const { player, audio } = setup();
  try { await player.load(tracks[0]); player.setRepeat('one'); audio[0].currentTime = 210; audio[0].dispatchEvent(new Event('ended')); assert.equal(audio[0].currentTime, 0); assert.equal(audio.length, 1); player.setRepeat('off'); audio[0].dispatchEvent(new Event('ended')); assert.equal(player.getSnapshot().status, 'ended'); } finally { player.dispose(); }
});
test('load cancellation and audio errors leave a retryable player', async () => {
  let resolve;
  const { player, audio } = setup({ resolveTrack: () => new Promise(done => { resolve = done; }) });
  try { const pending = player.load({ id: 'remote', title: 'Remote' }); player.toggle(); resolve({ url: '/cancelled.mp3' }); await pending; assert.equal(audio.length, 0); assert.equal(player.getSnapshot().status, 'paused'); await player.load(tracks[0]); audio[0].dispatchEvent(new Event('error')); assert.equal(player.getSnapshot().status, 'error'); await player.toggle(); assert.equal(player.getSnapshot().status, 'playing'); } finally { player.dispose(); }
});
