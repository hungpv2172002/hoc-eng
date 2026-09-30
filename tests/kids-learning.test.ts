import assert from 'node:assert/strict';
import { createKidsRound, KIDS_WORDS } from '../src/lib/kidsLearning';
const original = JSON.stringify(KIDS_WORDS);
for (let i = 0; i < 100; i++) {
  const round = createKidsRound();
  assert.equal(round.length, 10);
  assert.equal(new Set(round.map(q => q.target.word)).size, 10);
  for (const question of round) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(w => w.word)).size, 4);
    assert.equal(question.options.filter(w => w.word === question.target.word).length, 1);
    assert.ok(question.target.picture && question.target.meaning);
  }
}
assert.equal(JSON.stringify(KIDS_WORDS), original);
console.log('PASS: 100 randomized rounds; unique questions, four distinct options, exactly one correct answer.');
const { readFileSync } = await import('node:fs');
const recordings = JSON.parse(readFileSync(new URL('../src/data/kidsAudio.json', import.meta.url), 'utf8'));
for (const item of KIDS_WORDS) {
  assert.ok(recordings[item.word]?.startsWith('data:audio/mpeg;base64,'));
  assert.ok(Buffer.from(recordings[item.word].split(',')[1], 'base64').length > 1000);
}
console.log('PASS: every vocabulary word has a bundled MP3 recording.');
