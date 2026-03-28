const STORAGE_KEY = 'piano-note-scores';

export interface ScoreState {
  score: number;
  streak: number;
  bestStreak: number;
  round: number;
  correctThisSession: number;
  totalThisSession: number;
}

export function createScoreState(): ScoreState {
  return {
    score: 0,
    streak: 0,
    bestStreak: 0,
    round: 0,
    correctThisSession: 0,
    totalThisSession: 0,
  };
}

export function scoreCorrect(state: ScoreState): ScoreState {
  const streak = state.streak + 1;
  const multiplier = streak >= 10 ? 3 : streak >= 5 ? 2 : 1;
  const points = 10 * multiplier;
  return {
    ...state,
    score: state.score + points,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    round: state.round + 1,
    correctThisSession: state.correctThisSession + 1,
    totalThisSession: state.totalThisSession + 1,
  };
}

export function scoreWrong(state: ScoreState): ScoreState {
  return {
    ...state,
    streak: 0,
    round: state.round + 1,
    totalThisSession: state.totalThisSession + 1,
  };
}

export interface HighScores {
  easy: number;
  normal: number;
  hard: number;
}

export function loadHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { easy: 0, normal: 0, hard: 0 };
}

export function saveHighScore(mode: 'easy' | 'normal' | 'hard', score: number) {
  const scores = loadHighScores();
  if (score > scores[mode]) {
    scores[mode] = score;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  }
}
