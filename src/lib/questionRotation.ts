import { Question, CEFRLevel } from '../types';

/**
 * Xáo trộn ngẫu nhiên hoàn toàn mảng bằng thuật toán Fisher-Yates shuffle chuẩn.
 * Đảm bảo mỗi lần gọi (kể cả F5/refresh trang) sẽ tạo ra thứ tự câu hỏi ngẫu nhiên hoàn toàn mới.
 */
export function shuffleQuestions<T>(array: T[]): T[] {
  if (!array || array.length === 0) return [];
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

/**
 * Tự động đảo câu hỏi ngẫu nhiên HOÀN TOÀN MỚI mỗi khi tải/refresh lại trang.
 */
export function getDailyQuestions(allQuestions: Question[], _dateStr?: string): Question[] {
  if (!allQuestions || allQuestions.length === 0) return [];
  return shuffleQuestions(allQuestions);
}

export const getDailyRotatedQuestions = getDailyQuestions;

/**
 * Xác định trình độ CEFR của câu hỏi:
 * - Nếu câu hỏi đã có thuộc tính `level` (A1, A2, B1, B2, C1): dùng trực tiếp.
 * - Nếu chưa có: tự động phân tích độ dài từ, cấu trúc câu và từ vựng để gán trình độ chính xác.
 */
export function getQuestionLevel(q: Question): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' {
  if (q.level) return q.level;

  const sampleAnswer = q.answers?.[0] || '';
  const wordCount = sampleAnswer.trim().split(/\s+/).length;
  const hints = (q.hints || '').toLowerCase();
  const vi = (q.vi || '').toLowerCase();

  // A1: Mẫu câu cơ bản, đời sống sinh hoạt tối giản, gọi món, cảm ơn, hỏi thăm
  const a1Keywords = [
    'cà phê',
    'nói chậm',
    'cảm ơn',
    'xin lỗi',
    'đi dạo',
    'tách',
    'uống',
    'ăn',
    'bao nhiêu tiền',
    'mấy giờ',
    'ở đâu',
    'tên bạn',
    'ngồi',
    'thức dậy',
    'chào',
    'nhà vệ sinh',
    'cơm gà',
    'nước cam',
    'sinh nhật',
    'speak slowly',
    'cup of',
    'coffee',
    'thank you',
    'sorry',
    'walk',
  ];
  if (a1Keywords.some((k) => vi.includes(k) || hints.includes(k)) && wordCount <= 13) {
    return 'A1';
  }

  // C1: Cao cấp - Ngoại giao, chiến lược, ngôn từ hàn lâm, đàm phán đỉnh cao
  const c1Keywords = [
    'đàm phán',
    'chiến lược',
    'pháp lý',
    'sáp nhập',
    'chuyển đổi số',
    'vĩ mô',
    'bền vững',
    'rủi ro',
    'đồng thuận',
    'tiêu chuẩn quốc tế',
    'văn phong',
    'tiêu chuẩn',
    'khủng hoảng',
    'kiến trúc phần mềm',
    'quản trị',
    'ứng biến',
    'củng cố',
    'tập đoàn',
    'hội đồng quản trị',
    'dự phòng',
    'groundbreaking',
    'diversify',
    'mitigate',
  ];
  if (c1Keywords.some((k) => vi.includes(k) || hints.includes(k)) || wordCount >= 18) {
    return 'C1';
  }

  // B2: Trung cao cấp - IT, kinh doanh, câu ghép phức, lập luận
  const b2Keywords = [
    'dự án',
    'hợp đồng',
    'ngân sách',
    'báo cáo',
    'sản phẩm mới',
    'kinh nghiệm',
    'triển khai',
    'deploy',
    'api',
    'bug',
    'doanh thu',
    'đền đáp',
    'trí tuệ nhân tạo',
    'hồ bơi',
    'đưa đón',
    'khách sạn',
    'đặt phòng',
    'thực tế ảo',
    'scrum',
    'sprint',
  ];
  if (
    q.category === 'it' ||
    q.category === 'business' ||
    b2Keywords.some((k) => vi.includes(k) || hints.includes(k)) ||
    wordCount >= 14
  ) {
    return 'B2';
  }

  // B1: Trung cấp - Thảo luận, ý kiến, kế hoạch, cải thiện
  const b1Keywords = [
    'quan điểm',
    'hoàn toàn',
    'cải thiện',
    'ý tưởng',
    'hoãn lại',
    'rảnh rỗi',
    'thử thách',
    'lý thuyết',
    'nỗ lực',
    'liên hệ',
    'trợ giúp',
    'thời tiết',
  ];
  if (b1Keywords.some((k) => vi.includes(k) || hints.includes(k)) || wordCount >= 10) {
    return 'B1';
  }

  // A2: Sơ cấp
  return 'A2';
}

/**
 * Lọc câu hỏi theo trình độ CEFR được chọn:
 * Nếu level là 'all': trả về toàn bộ
 * Nếu level là 'A1'..'C1': chỉ trả về các câu có trình độ tương ứng
 */
export function filterQuestionsByLevel(
  questions: Question[],
  selectedLevel: CEFRLevel
): Question[] {
  if (selectedLevel === 'all') return questions;
  return questions.filter((q) => getQuestionLevel(q) === selectedLevel);
}

/**
 * Định dạng ngày thân thiện để hiển thị trên giao diện (ví dụ: "Thứ Bảy, 19/09/2026")
 */
export function formatFriendlyDate(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const days = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const dayName = days[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dayName}, ${dd}/${mm}/${yyyy}`;
  } catch {
    return 'Hôm nay';
  }
}
