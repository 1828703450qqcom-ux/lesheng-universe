// Start a disposable backend, so a smoke run never modifies the user's data.
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const workspace = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'lesheng-smoke-'));
const serverRoot = path.join(temporary, 'server');
mkdirSync(serverRoot);
mkdirSync(path.join(serverRoot, 'src'));
for (const file of readdirSync(path.join(workspace, 'server/src'), { withFileTypes: true })) {
  if (file.isFile()) copyFileSync(path.join(workspace, 'server/src', file.name), path.join(serverRoot, 'src', file.name));
}
copyFileSync(path.join(workspace, 'server/package.json'), path.join(serverRoot, 'package.json'));
symlinkSync(path.join(workspace, 'server/node_modules'), path.join(serverRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
mkdirSync(path.join(temporary, 'client/public'), { recursive: true });
symlinkSync(path.join(workspace, 'client/public/music'), path.join(temporary, 'client/public/music'), process.platform === 'win32' ? 'junction' : 'dir');
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const selected = probe.address().port; probe.close(() => resolve(selected)); }); });
const child = spawn(process.execPath, ['src/index.js'], { cwd: serverRoot, env: { ...process.env, PORT: String(port), MUSIC_PROVIDER_URL: '', MUSIC_PROVIDER_TOKEN: '' }, stdio: ['ignore', 'ignore', 'pipe'] });
let failureOutput = '';
child.stderr.on('data', buffer => { failureOutput += buffer.toString(); });
const base = `http://127.0.0.1:${port}`;
const request = async (route, options = {}) => {
  const response = await fetch(base + route, { ...options, signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', ...options.headers } });
  assert.ok(response.ok, `${route}: HTTP ${response.status}`);
  return response.json();
};
try {
  let healthy = false;
  for (let count = 0; count < 60; count++) {
    if (child.exitCode !== null) throw new Error('Disposable backend exited: ' + failureOutput);
    try { healthy = (await request('/api/health')).ok; if (healthy) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(healthy, 'Backend did not become healthy');
  const health = await request('/api/health');
  assert.equal(health.users, 1, 'Smoke run must use clean seed data');
  const catalog = await request('/api/songs');
  assert.ok(catalog.some(song => song.id === 'soundhelix_1'));
  const playback = await request('/api/songs/soundhelix_1/playback');
  assert.equal(playback.playable, true);
  const audio = await fetch(new URL(playback.url, base), { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(10000) });
  assert.equal(audio.status, 206);
  assert.equal((await audio.arrayBuffer()).byteLength, 1024);
  const absent = await request('/api/songs/song_001/playback');
  assert.equal(absent.playable, false, 'Commercial catalog metadata must not pretend to have an audio source');
  const account = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Local Demo', email: 'demo@example.invalid', password: 'local-only-smoke-pass' }) });
  assert.ok(account.token);
  const headers = { Authorization: `Bearer ${account.token}` };
  const { buildCharacterProfile } = await import('../client/src/character/generation.js');
  const profile = buildCharacterProfile({ story: '毕业后想去远方，收藏朋友的歌。', mbti: 'ENFP', goal: '去远方看看', song: '那些年' });
  const character = await request('/api/characters/me', { method: 'PUT', headers, body: JSON.stringify({ ...profile, name: '演示音乐旅人', songId: 'song_001' }) });
  assert.ok(character.id);
  assert.equal((await request('/api/characters/me', { headers })).id, character.id);
  await request('/api/community', { method: 'POST', headers, body: JSON.stringify({ content: '今天想分享一首温柔的歌。', emotion: '期待' }) });
  const plaza = await request('/api/plaza');
  assert.ok(plaza.some(person => person.id === character.id));
  assert.ok(existsSync(path.join(serverRoot, 'data/lesheng.json')));
  assert.ok(JSON.parse(readFileSync(path.join(serverRoot, 'data/lesheng.json'), 'utf8')).users.length === 2);
  console.log('PASS: fresh seed, registration, local character generation, persistence, community, plaza and full-audio Range delivery.');
} finally {
  if (child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  // Retained for inspection; no recursive delete follows symlinked user directories.
  console.log('Disposable test directory retained:', temporary);
}
