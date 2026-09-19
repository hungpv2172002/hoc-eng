export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_vip: boolean;
  created_at: string;
}

export type CareerCategory = 'general' | 'it' | 'business' | 'hospitality';

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

export interface Question {
  id: number;
  vi: string;
  hints: string;
  answers: string[];
  created_date?: string;
  category?: CareerCategory;
}


export interface StudyLog {
  id: number;
  user_id: string;
  question_id: number;
  completed_at: string;
}

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  appIcon: string;
  appIconType: 'lucide' | 'emoji';
}

