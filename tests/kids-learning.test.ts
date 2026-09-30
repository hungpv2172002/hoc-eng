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
