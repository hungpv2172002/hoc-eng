import { KidsGrade } from './kidsLearning';

export type KidsProgress = {
  wrongWords: string[];
  earnedBadges: string[];
  completedRounds: number;
  correctStreak: number;
  adventureStage: number;
  practicedWords: string[];
  lastActivityDate: string;
};

const STORAGE_PREFIX = 'hoc-eng:kids-progress:v1:grade:';

export function emptyKidsProgress(): KidsProgress {
  return { wrongWords: [], earnedBadges: [], completedRounds: 0, correctStreak: 0, adventureStage: 0, practicedWords: [], lastActivityDate: '' };
}

export function readKidsProgress(grade: KidsGrade): KidsProgress {
  if (typeof window === 'undefined') return emptyKidsProgress();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${grade}`);
    if (!raw) return emptyKidsProgress();
    const value = JSON.parse(raw) as Partial<KidsProgress>;
    return {
      wrongWords: Array.isArray(value.wrongWords) ? [...new Set(value.wrongWords.filter((word): word is string => typeof word === 'string'))] : [],
      earnedBadges: Array.isArray(value.earnedBadges) ? [...new Set(value.earnedBadges.filter((id): id is string => typeof id === 'string'))] : [],
      completedRounds: Number.isFinite(value.completedRounds) ? Math.max(0, Number(value.completedRounds)) : 0,
      correctStreak: Number.isFinite(value.correctStreak) ? Math.max(0, Number(value.correctStreak)) : 0,
      adventureStage: Number.isFinite(value.adventureStage) ? Math.min(5, Math.max(0, Number(value.adventureStage))) : 0,
      practicedWords: Array.isArray(value.practicedWords) ? [...new Set(value.practicedWords.filter((word): word is string => typeof word === 'string'))] : [],
      lastActivityDate: typeof value.lastActivityDate === 'string' ? value.lastActivityDate : '',
    };
  } catch {
    return emptyKidsProgress();
  }
}

export function writeKidsProgress(grade: KidsGrade, progress: KidsProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${grade}`, JSON.stringify(progress));
  } catch {
    // Progress remains available for the current session when storage is blocked.
  }
}
