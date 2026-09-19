import React, { useState, useEffect, useCallback } from 'react';
import { Profile, Question } from './types';
import { INITIAL_QUESTIONS } from './data/initialQuestions';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { Header } from './components/Header';
import { StudyView } from './components/StudyView';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { GuideModal } from './components/GuideModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [currentView, setCurrentView] = useState<'study' | 'admin'>('study');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Danh sách học viên mẫu cho AdminView
  const [allProfiles, setAllProfiles] = useState<Profile[]>([
    {
      id: 'admin-hung',
      email: 'hungpv2172002@gmail.com',
      full_name: 'Phùng Việt Hùng',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HungPV',
      role: 'admin',
      is_vip: true,
      created_at: '2026-03-01T08:00:00Z',
    },
    {
      id: 'user-nam',
      email: 'nam.nguyen@gmail.com',
      full_name: 'Nguyễn Văn Nam',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NamNguyen',
      role: 'user',
      is_vip: false,
      created_at: '2026-03-10T10:30:00Z',
    },
    {
      id: 'user-hoa',
      email: 'hoa.tran@gmail.com',
      full_name: 'Trần Thị Hoa',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoaTran',
      role: 'user',
      is_vip: true,
      created_at: '2026-03-12T14:15:00Z',
    },
    {
      id: 'user-linh',
      email: 'linh.le@gmail.com',
      full_name: 'Lê Thùy Linh',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LinhLe',
      role: 'user',
      is_vip: false,
      created_at: '2026-03-14T09:00:00Z',
    },
  ]);

  // 1. Tải tiến độ học hôm nay từ localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`daily_study_count_${today}`);
    if (saved) {
      setTodayCount(parseInt(saved, 10) || 0);
    }
  }, []);

  // 2. Tải profile nếu có phiên đăng nhập
  const initUserSession = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (pData) {
            setProfile(pData as Profile);
          }
        }
      } catch (err) {
        console.warn('Supabase session load error:', err);
      }
    }
  }, []);

  useEffect(() => {
    initUserSession();
  }, [initUserSession]);

  // 3. Tải câu hỏi từ Supabase nếu có
  useEffect(() => {
    async function loadQuestions() {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: true });

          if (!error && data && data.length > 0) {
            setQuestions(data as Question[]);
          }
        } catch (e) {
          console.warn('Lỗi tải câu hỏi từ Supabase:', e);
        }
      }
    }
    loadQuestions();
  }, []);

  // 4. Xử lý khi hoàn thành 1 câu
  const handleQuestionCompleted = async (questionId: number) => {
    const nextCount = todayCount + 1;
    setTodayCount(nextCount);

    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`daily_study_count_${today}`, nextCount.toString());

    // Nếu đã đăng nhập và Supabase sẵn sàng, ghi vào bảng study_logs
    if (profile && isSupabaseConfigured) {
      try {
        await supabase.from('study_logs').insert({
          user_id: profile.id,
          question_id: questionId,
          completed_at: today,
        });
      } catch (err) {
        console.warn('Ghi nhận study_logs:', err);
      }
    }
  };

  // 5. Nút Toggle VIP trong Admin
  const handleToggleVip = async (targetUser: Profile) => {
    const newVip = !targetUser.is_vip;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_vip: newVip })
        .eq('id', targetUser.id);
      if (error) throw error;
    }

    // Cập nhật danh sách
    setAllProfiles((prev) =>
      prev.map((p) => (p.id === targetUser.id ? { ...p, is_vip: newVip } : p))
    );

    // Nếu đang chỉnh chính mình, update state profile
    if (profile && profile.id === targetUser.id) {
      setProfile((prev) => (prev ? { ...prev, is_vip: newVip } : null));
    }
  };

  // 6. Kích hoạt Gemini AI sinh câu mới
  const handleQuickAiGenerate = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/cron/generate?key=my_super_secret_cron_token_12345', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my_super_secret_cron_token_12345',
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi gọi API cron sinh câu');
      }

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        // Nạp thêm vào danh sách câu hỏi hiện tại
        setQuestions((prev) => [...prev, ...json.data]);
      }

      setToastMessage({
        type: 'success',
        text: `Gemini AI đã sinh thành công 10 câu mới và nạp vào danh sách học!`,
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Lỗi khi sinh câu hỏi.',
      });
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setCurrentView('study');
    setToastMessage({ type: 'success', text: 'Đã đăng xuất thành công.' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-rose-500 text-white border-rose-600'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <Header
        profile={profile}
        todayCount={todayCount}
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSignOut={handleSignOut}
        onQuickAiGenerate={handleQuickAiGenerate}
        isAiGenerating={isAiGenerating}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {currentView === 'study' ? (
          <StudyView
            questions={questions}
            profile={profile}
            todayCount={todayCount}
            onQuestionCompleted={handleQuestionCompleted}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        ) : (
          <AdminView
            currentUser={profile}
            profiles={allProfiles}
            onToggleVip={handleToggleVip}
            onBackToStudy={() => setCurrentView('study')}
            onAiGenerateQuestions={handleQuickAiGenerate}
            isGeneratingAi={isAiGenerating}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © 2026 Daily Vietnamese to English Translation Practice • Next.js & Supabase
          </p>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 cursor-pointer"
          >
            Xem mã nguồn SQL & Hướng dẫn thiết lập
          </button>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(newProfile) => {
          setProfile(newProfile);
          // Tự động thêm vào allProfiles nếu chưa có
          setAllProfiles((prev) => {
            if (prev.some((p) => p.id === newProfile.id)) return prev;
            return [newProfile, ...prev];
          });
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          setAllProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
      />

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
