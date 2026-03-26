/**
 * SM-2 spaced repetition update.
 * Quality score should be an integer in [0..5].
 */
export function sm2Update({ interval, easeFactor, repetitions, quality }) {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const prevEF = typeof easeFactor === "number" ? easeFactor : 2.5;
  const prevI = typeof interval === "number" ? interval : 1;
  const prevR = typeof repetitions === "number" ? repetitions : 0;

  if (q < 3) {
    return {
      interval: 1,
      easeFactor: Math.max(1.3, prevEF - 0.2),
      repetitions: 0,
    };
  }

  const ef =
    prevEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const nextEF = Math.max(1.3, ef);

  let nextI;
  if (prevR <= 0) nextI = 1;
  else if (prevR === 1) nextI = 6;
  else nextI = Math.round(prevI * nextEF);

  return {
    interval: Math.max(1, nextI),
    easeFactor: nextEF,
    repetitions: prevR + 1,
  };
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function scoreToQuality(score10) {
  const n = Number(score10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n / 2)));
}

