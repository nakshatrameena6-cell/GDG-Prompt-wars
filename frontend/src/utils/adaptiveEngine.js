/**
 * QUANTA Adaptive Assessment Engine
 * Governs difficulty state transitions, timing telemetry, and session analytics.
 */

export const DIFFICULTY_LEVELS = ['EASY', 'MEDIUM', 'HARD'];

export const QUESTION_TIMEOUT_SECONDS = 25;
export const FAST_THRESHOLD_SECONDS = 8.5;
export const TOTAL_QUESTIONS_PER_DRILL = 6;

/**
 * Computes next difficulty level based on accuracy and response time.
 * 
 * Rules:
 * - Correct + Fast (<= threshold) -> UP
 * - Correct + Slow (> threshold) -> MAINTAIN
 * - Incorrect + Fast (<= threshold) -> MAINTAIN
 * - Incorrect + Slow (> threshold) -> DOWN
 */
export function calculateNextDifficulty(currentDifficulty, isCorrect, responseTime) {
  const currentIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);
  const isFast = responseTime <= FAST_THRESHOLD_SECONDS;

  let nextIndex = currentIndex;
  let transitionType = 'MAINTAIN'; // 'UP' | 'DOWN' | 'MAINTAIN'
  let reason = '';

  if (isCorrect && isFast) {
    if (currentIndex < DIFFICULTY_LEVELS.length - 1) {
      nextIndex = currentIndex + 1;
      transitionType = 'UP';
      reason = 'High speed and precision detected';
    } else {
      transitionType = 'MAINTAIN';
      reason = 'Max difficulty sustained at peak speed';
    }
  } else if (isCorrect && !isFast) {
    nextIndex = currentIndex;
    transitionType = 'MAINTAIN';
    reason = 'Accurate response with measured deliberation';
  } else if (!isCorrect && isFast) {
    nextIndex = currentIndex;
    transitionType = 'MAINTAIN';
    reason = 'Rapid submission with precision lapse; holding level';
  } else {
    // Incorrect and slow (or timed out)
    if (currentIndex > 0) {
      nextIndex = currentIndex - 1;
      transitionType = 'DOWN';
      reason = 'Time pressure / latency detected; recalibrating';
    } else {
      nextIndex = currentIndex;
      transitionType = 'MAINTAIN';
      reason = 'Calibrating baseline at foundation level';
    }
  }

  const nextDifficulty = DIFFICULTY_LEVELS[nextIndex];

  return {
    previousDifficulty: currentDifficulty,
    nextDifficulty,
    transitionType,
    reason,
    isFast
  };
}

/**
 * Computes session analytics, speed index, consistency, and deterministic summary.
 */
export function computeSessionResults(history) {
  if (!history || history.length === 0) {
    return null;
  }

  const total = history.length;
  const correctCount = history.filter(h => h.isCorrect).length;
  const accuracyPercent = Math.round((correctCount / total) * 100);

  const totalTime = history.reduce((sum, h) => sum + h.responseTime, 0);
  const averageResponseTime = Number((totalTime / total).toFixed(1));

  // Speed Index: normalized between 30 and 98 based on fast response
  // avg 4s -> ~92, avg 8s -> ~80, avg 15s -> ~55, avg 25s -> ~35
  const rawSpeed = 100 - (averageResponseTime / QUESTION_TIMEOUT_SECONDS) * 70;
  const speedIndex = Math.max(28, Math.min(98, Math.round(rawSpeed)));

  // Consistency calculation based on standard deviation of response times
  const variance = history.reduce((acc, h) => acc + Math.pow(h.responseTime - averageResponseTime, 2), 0) / total;
  const stdDev = Math.sqrt(variance);
  // Lower stdDev means higher consistency
  const consistencyPercent = Math.max(45, Math.min(98, Math.round(100 - (stdDev / QUESTION_TIMEOUT_SECONDS) * 120)));

  // Difficulty progression
  const diffNumeric = { EASY: 1, MEDIUM: 2, HARD: 3 };
  const startingVal = diffNumeric[history[0].difficulty] || 2;
  const maxVal = Math.max(...history.map(h => diffNumeric[h.difficulty]));
  const finalVal = diffNumeric[history[history.length - 1].difficulty];

  let difficultyClimbText = '';
  const climbDelta = maxVal - startingVal;
  if (climbDelta > 0) {
    difficultyClimbText = `You climbed ${climbDelta} difficulty level${climbDelta > 1 ? 's' : ''} to peak at ${history.find(h => diffNumeric[h.difficulty] === maxVal)?.difficulty || 'HARD'}.`;
  } else if (maxVal === 3 && startingVal === 2) {
    difficultyClimbText = 'You reached and defended the HARD tier.';
  } else if (finalVal === startingVal) {
    difficultyClimbText = 'You stabilized at your initial calibration tier.';
  } else {
    difficultyClimbText = 'Adaptive engine optimized question load for steady pacing.';
  }

  // Deterministic summary statements
  const summaryPoints = [];
  if (accuracyPercent >= 80) {
    summaryPoints.push('Accuracy remained strong throughout the drill under time constraints.');
  } else if (accuracyPercent >= 50) {
    summaryPoints.push('Solid baseline accuracy achieved across multi-category questions.');
  } else {
    summaryPoints.push('Accuracy dipped under rapid tempo; prioritization of precision is recommended.');
  }

  if (averageResponseTime <= FAST_THRESHOLD_SECONDS) {
    summaryPoints.push('You maintained a fast response pace without stalling on complex options.');
  } else {
    summaryPoints.push('Response times showed deliberate verification on intermediate steps.');
  }

  if (history.some(h => h.difficulty === 'HARD' && h.isCorrect)) {
    summaryPoints.push('You successfully progressed into harder questions and answered them correctly.');
  } else if (history.some(h => h.difficulty === 'HARD' && !h.isCorrect)) {
    summaryPoints.push('Faced HARD-tier placement challenges with room to refine problem patterns.');
  }

  return {
    total,
    correctCount,
    accuracyPercent,
    averageResponseTime,
    speedIndex,
    consistencyPercent,
    stdDev: stdDev.toFixed(1),
    difficultyClimbText,
    summary: summaryPoints.join(' ')
  };
}
