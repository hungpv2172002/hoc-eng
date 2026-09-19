import { Question } from '../types';

/**
 * Tạo bộ sinh số giả ngẫu nhiên có seed (Mulberry32)
 * Giúp tạo thứ tự câu hỏi nhất quán trong cùng 1 ngày,
 * nhưng hoàn toàn khác biệt và đảo mới qua mỗi ngày khác nhau.
 */
function createSeededRandom(seedString: string) {
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed << 5) - seed + seedString.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 12345;

  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Đảo câu hỏi theo ngày (Daily Seeded Shuffle):
 * - Mỗi ngày mới (theo YYYY-MM-DD) sẽ có một thứ tự câu hỏi HOÀN TOÀN KHÁC NHAU.
 * - Ưu tiên các câu hỏi được sinh trong chính ngày hôm đó (nếu có).
 * - Học viên mở app vào ngày nào sẽ làm bộ câu đảo ngẫu nhiên của ngày đó.
 */
export function getDailyQuestions(allQuestions: Question[], dateStr?: string): Question[] {
  if (!allQuestions || allQuestions.length === 0) return [];

  const today = dateStr || new Date().toISOString().split('T')[0];
  const random = createSeededRandom(`daily_seed_${today}`);

  // Phân loại: câu hỏi được tạo hôm nay vs các câu hỏi khác
  const todayQuestions = allQuestions.filter((q) => q.created_date === today);
  const otherQuestions = allQuestions.filter((q) => q.created_date !== today);

  // Xáo trộn nhóm câu hôm nay theo seed ngày
  const shuffledToday = [...todayQuestions];
  for (let i = shuffledToday.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledToday[i], shuffledToday[j]] = [shuffledToday[j], shuffledToday[i]];
  }

  // Xáo trộn nhóm các câu còn lại theo seed ngày
  const shuffledOthers = [...otherQuestions];
  for (let i = shuffledOthers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
  }

  // Ghép lại: câu của ngày hôm nay đưa lên đầu, tiếp theo là toàn bộ câu đã được đảo
  return [...shuffledToday, ...shuffledOthers];
}

export const getDailyRotatedQuestions = getDailyQuestions;

/**
 * Xáo trộn ngẫu nhiên tức thì (khi người dùng bấm nút Đảo câu hỏi)
 */
export function shuffleQuestions(questions: Question[]): Question[] {
  const cloned = [...questions];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

/**
 * Định dạng ngày thân thiện để hiển thị trên giao diện (ví dụ: "Thứ Bảy, 19/09/2026")
 */
export function formatFriendlyDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return dateStr || '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[d.getDay()];

  return `${dayName}, ${day}/${month}/${year}`;
}
