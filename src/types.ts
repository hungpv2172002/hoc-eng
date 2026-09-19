export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_vip: boolean;
  created_at: string;
}

export interface Question {
  id: number;
  vi: string;
  hints: string;
  answers: string[];
  created_date: string;
}

export interface StudyLog {
  id: number;
  user_id: string;
  question_id: number;
  completed_at: string;
}
