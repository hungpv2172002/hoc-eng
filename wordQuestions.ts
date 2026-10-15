import { Question } from '../types';

type WordItem = [vi: string, en: string, level: Question['level'], category?: string];

// Các mục này là bài dịch từ/cụm từ độc lập. Không lấy token từ câu dài để tránh
// ghép sai nghĩa (ví dụ "bạn" không bị suy diễn thành "what").
const WORD_ITEMS: WordItem[] = [
  // A1: từ vựng nền tảng
  // Disambiguate the Vietnamese homonym so learners know this entry is the
  // second-person pronoun. The noun "bạn" (friend) is covered by "bạn bè".
  ['bạn (đại từ)', 'you', 'A1'], ['tôi', 'I', 'A1'], ['chúng tôi', 'we', 'A1'], ['họ', 'they', 'A1'],
  ['anh ấy', 'he', 'A1'], ['cô ấy', 'she', 'A1'], ['nó', 'it', 'A1'], ['cái này', 'this', 'A1'],
  ['cái kia', 'that', 'A1'], ['ai', 'who', 'A1'], ['cái gì', 'what', 'A1'], ['ở đâu', 'where', 'A1'],
  ['khi nào', 'when', 'A1'], ['tại sao', 'why', 'A1'], ['như thế nào', 'how', 'A1'], ['xin chào', 'hello', 'A1'],
  ['tạm biệt', 'goodbye', 'A1'], ['cảm ơn', 'thank you', 'A1'], ['xin lỗi', 'sorry', 'A1'], ['làm ơn', 'please', 'A1'],
  ['có (trả lời đồng ý)', 'yes', 'A1'], ['không (trả lời phủ định)', 'no', 'A1'], ['hôm nay', 'today', 'A1'], ['ngày mai', 'tomorrow', 'A1'],
  ['hôm qua', 'yesterday', 'A1'], ['buổi sáng', 'morning', 'A1'], ['buổi tối', 'evening', 'A1'], ['nước', 'water', 'A1'],
  ['thức ăn', 'food', 'A1'], ['ngôi nhà', 'house', 'A1'], ['trường học', 'school', 'A1'], ['bạn bè', 'friends', 'A1'],
  // A2: giao tiếp hằng ngày
  ['bắt đầu', 'start', 'A2'], ['kết thúc', 'finish', 'A2'], ['mua', 'buy', 'A2'], ['bán', 'sell', 'A2'],
  ['mượn', 'borrow', 'A2'], ['cho mượn', 'lend', 'A2'], ['mang theo', 'bring', 'A2'], ['lấy đi', 'take', 'A2'],
  ['đợi', 'wait', 'A2'], ['giúp đỡ', 'help', 'A2'], ['quên', 'forget', 'A2'], ['nhớ', 'remember', 'A2'],
  ['hiểu', 'understand', 'A2'], ['giải thích', 'explain', 'A2'], ['đồng ý', 'agree', 'A2'], ['từ chối', 'refuse', 'A2'],
  ['cần', 'need', 'A2'], ['muốn', 'want', 'A2'], ['thích', 'like', 'A2'], ['ghét', 'hate', 'A2'],
  ['đắt', 'expensive', 'A2'], ['rẻ', 'cheap', 'A2'], ['gần', 'near', 'A2'], ['xa', 'far', 'A2'],
  ['bận', 'busy', 'A2'], ['rảnh', 'free', 'A2'], ['khỏe mạnh', 'healthy', 'A2'], ['mệt mỏi', 'tired', 'A2'],
  ['đói', 'hungry', 'A2'], ['khát', 'thirsty', 'A2'], ['vé', 'ticket', 'A2'], ['hành lý', 'luggage', 'A2'],
  // B1: ý kiến và công việc
  ['mục tiêu', 'goal', 'B1'], ['kế hoạch', 'plan', 'B1'], ['kết quả', 'result', 'B1'], ['lý do', 'reason', 'B1'],
  ['ý tưởng', 'idea', 'B1'], ['lựa chọn', 'choice', 'B1'], ['thói quen', 'habit', 'B1'], ['kinh nghiệm', 'experience', 'B1'],
  ['cơ hội', 'opportunity', 'B1'], ['thách thức', 'challenge', 'B1'], ['quyết định', 'decision', 'B1'], ['giải pháp', 'solution', 'B1'],
  ['cải thiện', 'improve', 'B1'], ['phát triển', 'develop', 'B1'], ['so sánh', 'compare', 'B1'], ['đề xuất', 'suggest', 'B1'],
  ['đạt được', 'achieve', 'B1'], ['tránh', 'avoid', 'B1'], ['cho phép', 'allow', 'B1'], ['hỗ trợ', 'support', 'B1'],
  ['tin cậy', 'reliable', 'B1'], ['hữu ích', 'useful', 'B1'], ['linh hoạt', 'flexible', 'B1'], ['chính xác', 'accurate', 'B1'],
  ['cuộc họp', 'meeting', 'B1'], ['nhiệm vụ', 'task', 'B1'], ['hạn chót', 'deadline', 'B1'], ['đồng nghiệp', 'colleague', 'B1'],
  ['khách hàng', 'customer', 'B1'], ['báo cáo', 'report', 'B1'], ['ngân sách', 'budget', 'B1'], ['lịch trình', 'schedule', 'B1'],
  // B2: cụm từ học thuật và chuyên môn
  ['mang lại lợi ích', 'bring benefits', 'B2'], ['tác động', 'impact', 'B2'], ['ưu tiên', 'prioritize', 'B2'], ['phân tích', 'analyze', 'B2'],
  ['đánh giá', 'evaluate', 'B2'], ['đàm phán', 'negotiate', 'B2'], ['thuyết phục', 'persuade', 'B2'], ['phối hợp', 'coordinate', 'B2'],
  ['triển khai', 'implement', 'B2'], ['duy trì', 'maintain', 'B2'], ['giảm thiểu', 'minimize', 'B2'], ['mở rộng', 'expand', 'B2'],
  ['đáng kể', 'significant', 'B2'], ['bền vững', 'sustainable', 'B2'], ['minh bạch', 'transparent', 'B2'], ['hiệu quả', 'efficient', 'B2'],
  ['rủi ro', 'risk', 'B2'], ['nguồn lực', 'resource', 'B2'], ['bằng chứng', 'evidence', 'B2'], ['quan điểm', 'perspective', 'B2'],
  ['phản hồi', 'feedback', 'B2'], ['tiêu chuẩn', 'standard', 'B2'], ['quy trình', 'process', 'B2'], ['xu hướng', 'trend', 'B2'],
  ['có trách nhiệm', 'responsible', 'B2'], ['có tính cạnh tranh', 'competitive', 'B2'], ['sáng tạo', 'innovative', 'B2'], ['cụ thể', 'specific', 'B2'],
  ['đáng tin cậy', 'credible', 'B2'], ['phù hợp', 'appropriate', 'B2'], ['tác động lâu dài', 'long-term impact', 'B2'], ['lợi thế cạnh tranh', 'competitive advantage', 'B2'],
  // C1: từ/cụm từ nâng cao
  ['giảm nhẹ', 'mitigate', 'C1'], ['tạo điều kiện', 'facilitate', 'C1'], ['chứng minh', 'substantiate', 'C1'], ['suy giảm', 'deterioration', 'C1'],
  ['toàn diện', 'comprehensive', 'C1'], ['không thể thiếu', 'indispensable', 'C1'], ['mơ hồ', 'ambiguous', 'C1'], ['hợp lý', 'plausible', 'C1'],
  ['đột phá', 'breakthrough', 'C1'], ['sự đồng thuận', 'consensus', 'C1'], ['sự chênh lệch', 'disparity', 'C1'], ['tính khả thi', 'feasibility', 'C1'],
  ['tính minh bạch', 'transparency', 'C1'], ['trách nhiệm giải trình', 'accountability', 'C1'], ['phân bổ', 'allocate', 'C1'], ['tiền lệ', 'precedent', 'C1'],
  ['hệ quả không lường trước', 'unintended consequence', 'C1'], ['lợi ích chung', 'collective interest', 'C1'], ['hiệu chỉnh', 'calibrate', 'C1'], ['giải quyết trước', 'preempt', 'C1'],
  ['sự mạch lạc', 'coherence', 'C1'], ['sắc thái', 'nuance', 'C1'], ['tính nhất quán', 'consistency', 'C1'], ['mâu thuẫn', 'contradiction', 'C1'],
  ['tinh chỉnh', 'refine', 'C1'], ['suy luận', 'inference', 'C1'], ['phân kỳ', 'diverge', 'C1'], ['tổng hợp', 'synthesize', 'C1'],
  ['sự đánh đổi', 'trade-off', 'C1'], ['điều kiện tiên quyết', 'prerequisite', 'C1'], ['phạm vi ảnh hưởng', 'scope of influence', 'C1'], ['khả năng mở rộng', 'scalability', 'C1'],
  // Cụm từ chuyên môn giữ đúng nghĩa, dành cho các khu VIP
  ['yêu cầu kéo mã', 'pull request', 'B2', 'it'], ['báo cáo lỗi', 'bug report', 'B2', 'it'], ['cơ sở dữ liệu', 'database', 'B1', 'it'], ['mã nguồn', 'source code', 'B1', 'it'],
  ['cuộc gọi bán hàng', 'sales call', 'B1', 'business'], ['biên lợi nhuận', 'profit margin', 'B2', 'business'], ['hợp đồng', 'contract', 'B1', 'business'], ['thị trường mục tiêu', 'target market', 'B2', 'business'],
  ['nhận phòng', 'check-in', 'A2', 'hospitality'], ['trả phòng', 'check-out', 'A2', 'hospitality'], ['đặt chỗ', 'reservation', 'A2', 'hospitality'], ['dịch vụ phòng', 'room service', 'A2', 'hospitality'],
];

export const WORD_QUESTIONS: Question[] = WORD_ITEMS.map(([vi, en, level, category], index) => ({
  id: 900000 + index,
  vi,
  hints: `${en} = ${vi}`,
  answers: [en],
  category: category || 'general',
  level,
}));

