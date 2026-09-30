export type KidsActivity = 'listen' | 'picture';
export const KIDS_WORDS = [
  { word: 'cat', meaning: 'Con mèo', picture: '🐱' },
  { word: 'dog', meaning: 'Con chó', picture: '🐶' },
  { word: 'rabbit', meaning: 'Con thỏ', picture: '🐰' },
  { word: 'lion', meaning: 'Sư tử', picture: '🦁' },
  { word: 'elephant', meaning: 'Con voi', picture: '🐘' },
  { word: 'fish', meaning: 'Con cá', picture: '🐟' },
  { word: 'butterfly', meaning: 'Con bướm', picture: '🦋' },
  { word: 'apple', meaning: 'Quả táo', picture: '🍎' },
  { word: 'banana', meaning: 'Quả chuối', picture: '🍌' },
  { word: 'grapes', meaning: 'Quả nho', picture: '🍇' },
  { word: 'carrot', meaning: 'Củ cà rốt', picture: '🥕' },
  { word: 'cake', meaning: 'Bánh ngọt', picture: '🎂' },
  { word: 'car', meaning: 'Ô tô', picture: '🚗' },
  { word: 'bus', meaning: 'Xe buýt', picture: '🚌' },
  { word: 'bicycle', meaning: 'Xe đạp', picture: '🚲' },
  { word: 'airplane', meaning: 'Máy bay', picture: '✈️' },
  { word: 'sun', meaning: 'Mặt trời', picture: '☀️' },
  { word: 'moon', meaning: 'Mặt trăng', picture: '🌙' },
  { word: 'rainbow', meaning: 'Cầu vồng', picture: '🌈' },
  { word: 'flower', meaning: 'Bông hoa', picture: '🌻' },
];
export type KidsWord = typeof KIDS_WORDS[number];
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export function createKidsRound() {
  return shuffled(KIDS_WORDS).slice(0, 10).map(target => ({ target, options: shuffled([target, ...shuffled(KIDS_WORDS.filter(w => w.word !== target.word)).slice(0, 3)]) }));
}
