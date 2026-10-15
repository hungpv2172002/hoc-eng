export type KidsActivity = 'listen' | 'picture';
export type KidsGrade = 1 | 2 | 3 | 4 | 5 | 6;
export type KidsWord = { word: string; meaning: string; picture: string; grades: KidsGrade[] };
export type KidsQuestion = {
  id: string;
  target: KidsWord;
  options: KidsWord[];
};

export const KIDS_WORDS: KidsWord[] = [
  { word: 'cat', meaning: 'Con mèo', picture: '🐱', grades: [1, 2] },
  { word: 'dog', meaning: 'Con chó', picture: '🐶', grades: [1, 2] },
  { word: 'bird', meaning: 'Con chim', picture: '🐦', grades: [1, 2] },
  { word: 'fish', meaning: 'Con cá', picture: '🐟', grades: [1, 2] },
  { word: 'rabbit', meaning: 'Con thỏ', picture: '🐰', grades: [1, 2, 3] },
  { word: 'lion', meaning: 'Sư tử', picture: '🦁', grades: [2, 3, 4] },
  { word: 'elephant', meaning: 'Con voi', picture: '🐘', grades: [2, 3, 4] },
  { word: 'butterfly', meaning: 'Con bướm', picture: '🦋', grades: [2, 3, 4] },
  { word: 'apple', meaning: 'Quả táo', picture: '🍎', grades: [1, 2] },
  { word: 'banana', meaning: 'Quả chuối', picture: '🍌', grades: [1, 2] },
  { word: 'orange', meaning: 'Quả cam', picture: '🍊', grades: [1, 2, 3] },
  { word: 'carrot', meaning: 'Củ cà rốt', picture: '🥕', grades: [1, 2, 3] },
  { word: 'cake', meaning: 'Bánh ngọt', picture: '🎂', grades: [1, 2, 3] },
  { word: 'car', meaning: 'Ô tô', picture: '🚗', grades: [1, 2] },
  { word: 'bus', meaning: 'Xe buýt', picture: '🚌', grades: [1, 2, 3] },
  { word: 'bicycle', meaning: 'Xe đạp', picture: '🚲', grades: [2, 3, 4] },
  { word: 'airplane', meaning: 'Máy bay', picture: '✈️', grades: [2, 3, 4] },
  { word: 'school', meaning: 'Trường học', picture: '🏫', grades: [1, 2, 3] },
  { word: 'book', meaning: 'Quyển sách', picture: '📖', grades: [1, 2, 3] },
  { word: 'pencil', meaning: 'Bút chì', picture: '✏️', grades: [1, 2, 3] },
  { word: 'sun', meaning: 'Mặt trời', picture: '☀️', grades: [1, 2, 3] },
  { word: 'moon', meaning: 'Mặt trăng', picture: '🌙', grades: [1, 2, 3] },
  { word: 'rainbow', meaning: 'Cầu vồng', picture: '🌈', grades: [2, 3, 4] },
  { word: 'flower', meaning: 'Bông hoa', picture: '🌻', grades: [1, 2, 3] },
  { word: 'mountain', meaning: 'Núi', picture: '⛰️', grades: [3, 4, 5] },
  { word: 'river', meaning: 'Con sông', picture: '🌊', grades: [3, 4, 5] },
  { word: 'doctor', meaning: 'Bác sĩ', picture: '🧑‍⚕️', grades: [3, 4, 5] },
  { word: 'teacher', meaning: 'Giáo viên', picture: '🧑‍🏫', grades: [1, 2, 3] },
  { word: 'friend', meaning: 'Bạn bè', picture: '🧑‍🤝‍🧑', grades: [2, 3, 4] },
  { word: 'happy', meaning: 'Vui vẻ', picture: '😊', grades: [3, 4, 5] },
  { word: 'strong', meaning: 'Mạnh mẽ', picture: '💪', grades: [4, 5, 6] },
  { word: 'planet', meaning: 'Hành tinh', picture: '🪐', grades: [4, 5, 6] },
  { word: 'rocket', meaning: 'Tên lửa', picture: '🚀', grades: [4, 5, 6] },
  { word: 'computer', meaning: 'Máy tính', picture: '💻', grades: [4, 5, 6] },
  { word: 'library', meaning: 'Thư viện', picture: '📚', grades: [4, 5, 6] },
  { word: 'future', meaning: 'Tương lai', picture: '🔮', grades: [5, 6] },
  { word: 'adventure', meaning: 'Cuộc phiêu lưu', picture: '🗺️', grades: [5, 6] },
];

export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getKidsWordsForGrade(grade: KidsGrade, words: readonly KidsWord[] = KIDS_WORDS): KidsWord[] {
  const gradeWords = words.filter((word) => word.grades.includes(grade));
  // Early versions had only a few advanced words. Keep every grade playable
  // while the themed vocabulary continues to grow.
  return gradeWords.length >= 10 ? gradeWords : [...words];
}

function randomDistractors(source: readonly KidsWord[], target: KidsWord, count = 3): KidsWord[] {
  const wanted = Math.min(count, Math.max(0, source.length - 1));
  const selected = new Set<number>();
  const selectedWords = new Set<string>();
  let attempts = 0;
  while (selected.size < wanted && attempts < source.length * 10) {
    attempts += 1;
    const index = Math.floor(Math.random() * source.length);
    const key = source[index].word.toLowerCase();
    if (key !== target.word.toLowerCase() && !selectedWords.has(key)) {
      selected.add(index);
      selectedWords.add(key);
    }
  }
  if (selected.size < wanted) {
    source.forEach((word, index) => {
      const key = word.word.toLowerCase();
      if (selected.size < wanted && key !== target.word.toLowerCase() && !selectedWords.has(key)) {
        selected.add(index);
        selectedWords.add(key);
      }
    });
  }
  return [...selected].map((index) => source[index]);
}

export function createKidsQuestionBank(grade: KidsGrade = 1, words: readonly KidsWord[] = KIDS_WORDS): KidsQuestion[] {
  const source = getKidsWordsForGrade(grade, words);
  return source.map((target, index) => {
    const distractors = randomDistractors(source, target);
    return {
      id: `${grade}-${index + 1}`,
      target,
      options: shuffled([target, ...distractors]),
    };
  });
}

export function getKidsQuestionCount(grade: KidsGrade = 1, words: readonly KidsWord[] = KIDS_WORDS): number {
  return getKidsWordsForGrade(grade, words).length;
}

export function createKidsRound(grade: KidsGrade = 1, words: readonly KidsWord[] = KIDS_WORDS): KidsQuestion[] {
  const source = getKidsWordsForGrade(grade, words);
  return shuffled(source).slice(0, 10).map((target, index) => ({
    id: `${grade}-${index + 1}`,
    target,
    options: shuffled([target, ...randomDistractors(source, target)]),
  }));
}
