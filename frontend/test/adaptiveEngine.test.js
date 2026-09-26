import assert from 'node:assert';
import {
  DIFFICULTY_LEVELS,
  QUESTION_TIMEOUT_SECONDS,
  FAST_THRESHOLD_SECONDS,
  calculateNextDifficulty,
  computeSessionResults
} from '../src/utils/adaptiveEngine.js';
import { QUESTION_BANK } from '../src/data/questions.js';

console.log('🧪 Running QUANTA Frontend Adaptive Engine & Question Bank Tests...\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// 1. ADAPTIVE LOGIC SUITE
// ----------------------------------------------------
console.log('--- 1. Adaptive Difficulty Transition Tests ---');

it('Correct + Fast promotes from MEDIUM to HARD', () => {
  const result = calculateNextDifficulty('MEDIUM', true, 5.2);
  assert.strictEqual(result.nextDifficulty, 'HARD');
  assert.strictEqual(result.transitionType, 'UP');
});

it('Correct + Fast promotes from EASY to MEDIUM', () => {
  const result = calculateNextDifficulty('EASY', true, 7.0);
  assert.strictEqual(result.nextDifficulty, 'MEDIUM');
  assert.strictEqual(result.transitionType, 'UP');
});

it('Correct + Fast on HARD remains at HARD (clamped upper bound)', () => {
  const result = calculateNextDifficulty('HARD', true, 4.0);
  assert.strictEqual(result.nextDifficulty, 'HARD');
  assert.strictEqual(result.transitionType, 'MAINTAIN');
});

it('Correct + Slow holds difficulty', () => {
  const result = calculateNextDifficulty('MEDIUM', true, 12.5);
  assert.strictEqual(result.nextDifficulty, 'MEDIUM');
  assert.strictEqual(result.transitionType, 'MAINTAIN');
});

it('Incorrect + Fast holds difficulty', () => {
  const result = calculateNextDifficulty('HARD', false, 6.0);
  assert.strictEqual(result.nextDifficulty, 'HARD');
  assert.strictEqual(result.transitionType, 'MAINTAIN');
});

it('Incorrect + Slow demotes from HARD to MEDIUM', () => {
  const result = calculateNextDifficulty('HARD', false, 14.2);
  assert.strictEqual(result.nextDifficulty, 'MEDIUM');
  assert.strictEqual(result.transitionType, 'DOWN');
});

it('Incorrect + Slow demotes from MEDIUM to EASY', () => {
  const result = calculateNextDifficulty('MEDIUM', false, 18.0);
  assert.strictEqual(result.nextDifficulty, 'EASY');
  assert.strictEqual(result.transitionType, 'DOWN');
});

it('Incorrect + Slow on EASY remains at EASY (clamped lower bound)', () => {
  const result = calculateNextDifficulty('EASY', false, 25.0);
  assert.strictEqual(result.nextDifficulty, 'EASY');
  assert.strictEqual(result.transitionType, 'MAINTAIN');
});

// ----------------------------------------------------
// 2. SCORING & SESSION ANALYTICS SUITE
// ----------------------------------------------------
console.log('\n--- 2. Scoring & Telemetry Analytics Tests ---');

it('Computes accuracy, speed index, and consistency correctly', () => {
  const mockHistory = [
    { difficulty: 'MEDIUM', isCorrect: true, responseTime: 6.0 },
    { difficulty: 'HARD', isCorrect: true, responseTime: 7.5 },
    { difficulty: 'HARD', isCorrect: false, responseTime: 12.0 },
    { difficulty: 'MEDIUM', isCorrect: true, responseTime: 5.5 },
    { difficulty: 'HARD', isCorrect: true, responseTime: 8.0 },
    { difficulty: 'HARD', isCorrect: true, responseTime: 6.8 }
  ];

  const results = computeSessionResults(mockHistory);
  assert.strictEqual(results.total, 6);
  assert.strictEqual(results.correctCount, 5);
  assert.strictEqual(results.accuracyPercent, 83); // 5/6 = 83.33% -> 83%
  assert.ok(results.averageResponseTime > 0 && results.averageResponseTime < 25);
  assert.ok(results.speedIndex >= 0 && results.speedIndex <= 100);
  assert.ok(results.consistencyPercent >= 0 && results.consistencyPercent <= 100);
  assert.ok(typeof results.difficultyClimbText === 'string' && results.difficultyClimbText.length > 0);
  assert.ok(typeof results.summary === 'string' && results.summary.length > 0);
});

// ----------------------------------------------------
// 3. QUESTION BANK INTEGRITY SUITE
// ----------------------------------------------------
console.log('\n--- 3. Question Bank Integrity & Structure Tests ---');

it('Question bank contains at least 12 realistic questions', () => {
  assert.ok(QUESTION_BANK.length >= 12, `Expected >= 12 questions, got ${QUESTION_BANK.length}`);
});

it('All questions have required schema fields and valid answer indices', () => {
  const categories = new Set();
  const difficulties = new Set();

  QUESTION_BANK.forEach((q, idx) => {
    assert.ok(q.id, `Question at index ${idx} missing id`);
    assert.ok(q.category, `Question ${q.id} missing category`);
    assert.ok(q.difficulty, `Question ${q.id} missing difficulty`);
    assert.ok(q.question, `Question ${q.id} missing question text`);
    assert.ok(Array.isArray(q.options) && q.options.length === 4, `Question ${q.id} must have 4 options`);
    assert.ok(typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4, `Question ${q.id} has invalid answer index`);
    assert.ok(q.explanation, `Question ${q.id} missing explanation`);

    categories.add(q.category);
    difficulties.add(q.difficulty);
  });

  assert.ok(difficulties.has('EASY'), 'Missing EASY questions');
  assert.ok(difficulties.has('MEDIUM'), 'Missing MEDIUM questions');
  assert.ok(difficulties.has('HARD'), 'Missing HARD questions');
  assert.ok(categories.size >= 3, 'Must cover at least 3 categories');
});

console.log(`\n=================================================`);
console.log(`🏁 Test Summary: ${passedTests}/${totalTests} tests passed.`);
console.log(`=================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
