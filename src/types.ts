export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_vip: boolean;
  created_at: string;
}

export type CareerCategory = string;

export interface CareerTrackInfo {
  id: CareerCategory;
  name: string;
  icon: string;
  description: string;
  isVipOnly: boolean;
  samplePhrase: string;
  badge: string;
}

export const CAREER_TRACKS: CareerTrackInfo[] = [
  {
    id: 'general',
    name: 'Giao Tiếp Hàng Ngày',
    icon: 'MessageSquare',
    description: 'Tình huống đời sống, du lịch, hỏi đường và trò chuyện xã hội',
    isVipOnly: false,
    samplePhrase: 'Daily life & General conversation',
    badge: 'Miễn phí & VIP',
  },
  {
    id: 'it',
    name: 'Công Nghệ Thông Tin (IT & Tech)',
    icon: 'Code2',
    description: 'Họp Scrum, báo cáo bug, deploy code, API, review mã nguồn với dev quốc tế',
    isVipOnly: true,
    samplePhrase: 'Sprint review, debugging, deployment, APIs',
    badge: 'Dành riêng cho VIP',
  },
  {
    id: 'business',
    name: 'Kinh Doanh & Bán Hàng (Business & Sales)',
    icon: 'Briefcase',
    description: 'Đàm phán hợp đồng, thuyết trình gọi vốn, chốt sale, quan hệ khách hàng',
    isVipOnly: true,
    samplePhrase: 'Deal negotiation, pitch deck, client relations',
    badge: 'Dành riêng cho VIP',
  },
  {
    id: 'hospitality',
    name: 'Khách Sạn & Dịch Vụ (Hospitality & Tourism)',
    icon: 'Hotel',
    description: 'Tiếp đón khách quốc tế, lễ tân, xử lý phàn nàn và phục vụ chuyên nghiệp',
    isVipOnly: true,
    samplePhrase: 'Guest relations, reservations, problem handling',
    badge: 'Dành riêng cho VIP',
  },
];

export type CEFRLevel = 'all' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface CEFRLevelInfo {
  id: CEFRLevel;
  code: string;
  name: string;
  desc: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

export const CEFR_LEVELS: CEFRLevelInfo[] = [
  {
    id: 'all',
    code: 'Tất cả',
    name: 'Mọi trình độ',
    desc: 'Luyện tập hỗn hợp tất cả các cấp độ',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderClass: 'border-slate-300',
  },
  {
    id: 'A1',
    code: 'A1',
    name: 'Mới bắt đầu',
    desc: 'Từ vựng cơ bản, mẫu câu ngắn quen thuộc',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderClass: 'border-emerald-300',
  },
  {
    id: 'A2',
    code: 'A2',
    name: 'Sơ cấp',
    desc: 'Tình huống sinh hoạt, du lịch, giao tiếp hàng ngày',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderClass: 'border-teal-300',
  },
  {
    id: 'B1',
    code: 'B1',
    name: 'Trung cấp',
    desc: 'Diễn đạt ý kiến, giải thích, thảo luận công việc',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderClass: 'border-blue-300',
  },
  {
    id: 'B2',
    code: 'B2',
    name: 'Trung cao cấp',
    desc: 'Thuyết trình, trao đổi chuyên môn, lập luận logic',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderClass: 'border-indigo-300',
  },
  {
    id: 'C1',
    code: 'C1',
    name: 'Cao cấp',
    desc: 'Đàm phán chuyên sâu, văn phong tinh tế và lưu loát',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderClass: 'border-purple-300',
  },
];

export interface Question {
  id: number;
  vi: string;
  hints: string;
  answers: string[];
  created_date?: string;
  category?: CareerCategory;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
}


export interface StudyLog {
  id: number;
  user_id: string;
  question_id: number;
  completed_at: string;
}

export type ThemeColor = 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber' | 'sky';
export type BgTheme = 'default' | 'pure-white' | 'warm' | 'dark-slate';

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  appIcon: string;
  appIconType: 'lucide' | 'emoji';
  themeColor?: ThemeColor;
  bgTheme?: BgTheme;
  // Thanh thông báo đầu trang (Announcement Bar)
  showAnnouncement?: boolean;
  announcementText?: string;
  announcementType?: 'info' | 'success' | 'warning' | 'vip';
  announcementLinkText?: string;
  // Lời chào & khẩu hiệu Hero
  heroGreeting?: string;
  heroSubtext?: string;
  // Kênh liên hệ & Hotline
  contactPhone?: string;
  contactZalo?: string;
  contactEmail?: string;
  contactFacebook?: string;
  contactTiktok?: string;
  contactTelegram?: string;
  customCareerTracks?: CareerTrackInfo[];
}

// Khách hàng & CRM quản lý bán gói
export type CustomerStatus =
  | 'new'           // Lead mới
  | 'consulting'    // Đang tư vấn
  | 'converted'     // Đã mua gói VIP
  | 'vip_lifetime'  // VIP trọn đời
  | 'callback'      // Hẹn liên hệ lại
  | 'cancelled';    // Hủy / Không mua

export type CustomerPackage =
  | 'vip_month'       // Gói VIP 1 Tháng (199.000đ)
  | 'vip_year'        // Gói VIP 1 Năm (599.000đ)
  | 'vip_lifetime'    // Gói VIP Trọn Đời (999.000đ)
  | 'course_it'       // Tiếng Anh IT & Tech (499.000đ)
  | 'course_business' // Tiếng Anh Kinh Doanh & Sales (499.000đ)
  | 'custom';         // Tùy chỉnh

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  package_interest: CustomerPackage;
  status: CustomerStatus;
  deal_value: number; // VND
  source: string; // Facebook, TikTok, Zalo, Website, Giới thiệu
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ManagedAccount extends Profile {
  phone?: string;
  password?: string;
  notes?: string;
  last_login?: string;
  vip_expires_at?: string;
}

export interface WordLookupResult {
  query: string;
  bestMatch: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaningVi: string;
  explanation: string;
  synonyms?: string[];
  collocations?: string[];
  exampleSentence?: {
    en: string;
    vi: string;
  };
  usageTip?: string;
  googleTranslateUrl?: string;
}

// ================= THI ĐẤU DỊCH 1v1 SONG SONG (DUEL) =================
export interface DuelParticipant {
  id: string;
  name: string;
  avatar_url?: string;
  isHost: boolean;
  score: number;
  currentQuestionIndex: number;
  answeredCount: number;
  isReady: boolean;
  isFinished: boolean;
  lastAnswerCorrect?: boolean;
  lastAnswerText?: string;
  typingLength?: number;
}

export interface DuelQuestionItem {
  id: number;
  vi: string;
  hints: string;
  level?: string;
  category?: string;
  answers: string[]; // Chứa đáp án chuẩn
}

export interface DuelRoomState {
  roomId: string;
  status: 'waiting' | 'countdown' | 'in_progress' | 'finished';
  category: string;
  questionCount: number;
  players: Record<string, DuelParticipant>;
  questions: DuelQuestionItem[];
  currentRound: number;
  roundTimerSeconds: number;
  roundStartedAt?: number;
  winnerId?: string | null;
  rematchVotes?: Record<string, boolean>;
}

export type DuelEmote = '🔥' | '⚡' | '😎' | '😱' | '👏' | '🏆' | '💪' | '⚔️';

export interface Friend {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  added_at: string;
  status?: 'online' | 'offline' | 'in_game';
  is_vip?: boolean;
}

// ================= HỆ THỐNG HUY HIỆU & THÀNH TỰU (BADGES) =================
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: 'streak' | 'battle' | 'study' | 'social';
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  badgeTag: string;
}

export interface UserStats {
  consecutiveDays: number;
  lastStudyDate: string;
  studyDates: string[];
  totalQuestionsCompleted: number;
  duelWins: number;
  towerFloorsCleared: number;
  wordsLookedUpCount: number;
  friendsCount: number;
  unlockedBadgeIds: string[];
}

