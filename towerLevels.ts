export interface MonsterInfo {
  name: string;
  title: string;
  emoji: string;
  accentColor: string;
  bgGradient: string;
  maxHp: number;
  tauntMessage: string;
  victoryMessage: string;
}

export interface TowerFloor {
  floor: number;
  monster: MonsterInfo;
  questionVi: string;
  answers: string[];
  hints: string;
  category: string;
  wordTokens: string[]; // Các từ để hỗ trợ click ghép câu nhanh trên di động
}

export const TOWER_FLOORS: TowerFloor[] = [
  {
    floor: 1,
    monster: {
      name: 'Slime Nhớt Xanh',
      title: 'Quái Tầng 1 - Vùng Ngoại Ô',
      emoji: '🟢',
      accentColor: 'emerald',
      bgGradient: 'from-emerald-500 to-teal-700',
      maxHp: 100,
      tauntMessage: 'Blob blob! Đố ngươi dịch được câu này để chém ta!',
      victoryMessage: 'Oặc! Ngươi dịch chuẩn quá... Slime tan biến!',
    },
    questionVi: 'Rất vui được gặp bạn hôm nay.',
    answers: [
      'Nice to meet you today',
      'It is nice to meet you today',
      "It's nice to meet you today",
      'Pleased to meet you today',
    ],
    hints: 'nice to meet you = rất vui được gặp; today = hôm nay',
    category: 'Giao tiếp hàng ngày',
    wordTokens: ['Nice', 'to', 'meet', 'you', 'today', 'It', 'is', 'happy', 'see'],
  },
  {
    floor: 2,
    monster: {
      name: 'Goblin Tinh Quái',
      title: 'Quái Tầng 2 - Hầm Cổ Tự',
      emoji: '🧌',
      accentColor: 'amber',
      bgGradient: 'from-amber-600 to-orange-800',
      maxHp: 120,
      tauntMessage: 'He he he! Ta sẽ cướp hết từ vựng của hiệp sĩ!',
      victoryMessage: 'Hic hic! Chiêu thức dịch thuật quá sắc bén!',
    },
    questionVi: 'Đừng quên kiểm tra hòm thư của bạn nhé.',
    answers: [
      "Don't forget to check your mailbox",
      'Do not forget to check your mailbox',
      "Don't forget to check your email",
      'Remember to check your mailbox',
    ],
    hints: "don't forget to = đừng quên; check = kiểm tra; mailbox = hòm thư",
    category: 'Đời sống',
    wordTokens: ["Don't", 'forget', 'to', 'check', 'your', 'mailbox', 'email', 'never', 'box'],
  },
  {
    floor: 3,
    monster: {
      name: 'Sói Bóng Đêm',
      title: 'Quái Tầng 3 - Rừng Sương Mù',
      emoji: '🐺',
      accentColor: 'indigo',
      bgGradient: 'from-indigo-600 to-slate-900',
      maxHp: 150,
      tauntMessage: 'Grừừừ! Ngươi có bắt kịp tốc độ của bóng đêm không?',
      victoryMessage: 'Awooo... Ánh sáng ngữ pháp đã xuyên thủng bóng đêm!',
    },
    questionVi: 'Hãy giữ liên lạc sau khi hoàn thành dự án nhé.',
    answers: [
      'Keep in touch after completing the project',
      'Let us keep in touch after finishing the project',
      "Let's keep in touch after finishing the project",
      "Let's stay in touch after finishing the project",
      'Please keep in touch after finishing the project',
    ],
    hints: 'keep in touch / stay in touch = giữ liên lạc; finish/complete = hoàn thành',
    category: 'Công việc',
    wordTokens: [
      "Let's",
      'keep',
      'in',
      'touch',
      'after',
      'finishing',
      'the',
      'project',
      'stay',
      'contact',
    ],
  },
  {
    floor: 4,
    monster: {
      name: 'Khổng Lồ Đá Golem',
      title: 'Quái Tầng 4 - Cổng Cự Thạch',
      emoji: '🗿',
      accentColor: 'cyan',
      bgGradient: 'from-cyan-700 to-slate-900',
      maxHp: 160,
      tauntMessage: 'Lớp giáp đá của ta không từ ngữ nào có thể xuyên thủng!',
      victoryMessage: 'Rắc... rắc... Lớp giáp đá đã vỡ tan tành!',
    },
    questionVi: 'Chúng tôi cần hoãn lại cuộc họp sang ngày mai.',
    answers: [
      'We need to postpone the meeting until tomorrow',
      'We need to postpone the meeting to tomorrow',
      'We need to reschedule the meeting for tomorrow',
      'We have to delay the meeting until tomorrow',
      'We need to put off the meeting until tomorrow',
    ],
    hints: 'postpone / put off / delay = hoãn lại; meeting = cuộc họp',
    category: 'Văn phòng',
    wordTokens: [
      'We',
      'need',
      'to',
      'postpone',
      'the',
      'meeting',
      'until',
      'tomorrow',
      'delay',
      'reschedule',
    ],
  },
  {
    floor: 5,
    monster: {
      name: 'Pháp Sư Hắc Ám',
      title: 'Quái Tầng 5 - Căn Phòng Huyền Bí',
      emoji: '🧙‍♂️',
      accentColor: 'purple',
      bgGradient: 'from-purple-700 to-indigo-950',
      maxHp: 180,
      tauntMessage: 'Ngươi không thể vượt qua lời nguyền thành ngữ cổ xưa!',
      victoryMessage: 'Không thể tin được! Ma pháp của ta đã bị hóa giải!',
    },
    questionVi: 'Bài kiểm tra này thực sự dễ như ăn cháo.',
    answers: [
      'This test is truly a piece of cake',
      'This exam is a piece of cake',
      'This test is really a piece of cake',
      'The test is a piece of cake',
    ],
    hints: 'a piece of cake = dễ như ăn cháo; test/exam = bài kiểm tra',
    category: 'Thành ngữ',
    wordTokens: [
      'This',
      'test',
      'is',
      'really',
      'a',
      'piece',
      'of',
      'cake',
      'easy',
      'exam',
    ],
  },
  {
    floor: 6,
    monster: {
      name: 'Ma Vương Hắc Long',
      title: 'Trùm Cuối - Đỉnh Tháp Ngôn Ngữ',
      emoji: '🐉',
      accentColor: 'rose',
      bgGradient: 'from-rose-600 via-red-800 to-slate-950',
      maxHp: 200,
      tauntMessage: 'Hahaha! Ta là kẻ cai trị tháp ma vương! Dám đọ sức với ta sao?!',
      victoryMessage: 'Gào ooo! Hiệp Sĩ Ngôn Ngữ đã giải phóng toàn bộ thế giới!',
    },
    questionVi: 'Sự kiên trì chính là chìa khóa mở cánh cửa thành công.',
    answers: [
      'Perseverance is the key to opening the door to success',
      'Perseverance is the key to success',
      'Persistence is the key to success',
      'Patience is the key to success',
    ],
    hints: 'perseverance / persistence = sự kiên trì; key to success = chìa khóa thành công',
    category: 'Châm ngôn sống',
    wordTokens: [
      'Perseverance',
      'is',
      'the',
      'key',
      'to',
      'success',
      'Persistence',
      'opening',
      'door',
      'victory',
    ],
  },
];
