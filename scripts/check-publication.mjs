// A baseline guard, not a substitute for secret scanning or human review.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
if (!files.length) throw new Error('No tracked/staged files. Stage the curated publication files first.');
const errors = [];
const privatePath = /(?:^|\/)(?:node_modules|dist|data|uploads|audit-artifacts|交付资料|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)(?!example$)|\.(?:pem|key|log)$/i;
const tokens = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/;
const binary = /\.(?:png|jpe?g|webp|gif|mp3|wasm|tflite)$/i;
for (const file of files) {
  if (privatePath.test(file)) errors.push(`${file}: private/runtime path must not be published`);
  const absolute = new URL(file, new URL('../', import.meta.url));
  if (statSync(absolute).size >= 50 * 1024 * 1024) errors.push(`${file}: asset exceeds the repository's 50 MB budget`);
  if (binary.test(file)) continue;
  const content = readFileSync(absolute, 'utf8');
  if (tokens.test(content)) errors.push(`${file}: possible credential; content deliberately not printed`);
  if (/(?:C:[/\\]+Users[/\\]+|\/opt\/lesheng-universe)/i.test(content)) errors.push(`${file}: machine-specific/deployment information`);
  for (const match of content.matchAll(/\b(?:password|passwd|MUSIC_PROVIDER_TOKEN)\s*[:=]\s*['"]([^'"\r\n]{8,})['"]/gi)) {
    if (!/example|placeholder|dummy|test|fixture|not-a-real|local-only/i.test(match[1]) && !file.endsWith('.test.js')) errors.push(`${file}: literal credential-like value; inspect privately`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Publication guard passed: ${files.length} tracked files; no runtime data or common credentials detected.`);
