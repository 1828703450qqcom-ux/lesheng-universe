import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDetections } from './photoVision.js';
import { buildCharacterProfile } from './generation.js';

test('local face detection chooses largest face and normalizes its location', () => {
  const result = summarizeDetections([
    { boundingBox: { originX: 10, originY: 10, width: 20, height: 20 } },
    { boundingBox: { originX: 80, originY: 30, width: 60, height: 80 } }
  ], 200, 200);
  assert.equal(result.faceCount, 2);
  assert.deepEqual(result.faceBox, { x: .4, y: .15, width: .3, height: .4 });
  assert.deepEqual(summarizeDetections([], 200, 200), { faceCount: 0, faceBox: null });
});

test('detected photo shape and position affect generated portrait', () => {
  const draft = { story: '想去远方', mbti: 'INFP', song: '平凡之路', photo: { color: '#778899', hairColor: '#292834', outfitColor: '#6980aa', faceCount: 1, faceBox: { x: .3, y: .2, width: .3, height: .3 } } };
  const round = buildCharacterProfile(draft);
  const oval = buildCharacterProfile({ ...draft, photo: { ...draft.photo, faceBox: { x: .3, y: .2, width: .2, height: .35 } } });
  assert.equal(round.appearance.face.shape, 'round');
  assert.equal(oval.appearance.face.shape, 'oval');
  assert.notEqual(round.variantId, oval.variantId);
  assert.match(round.generation.sources[0], /定位 1 张人脸/);
});
