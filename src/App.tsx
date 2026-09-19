import React, { useState, useEffect, useCallback } from 'react';
import { Profile, Question, AppSettings } from './types';
import { INITIAL_QUESTIONS } from './data/initialQuestions';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { getDailyQuestions, shuffleQuestions } from './lib/questionRotation';
import { Header } from './components/Header';
import { StudyView } from './components/StudyView';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { GuideModal } from './components/GuideModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Daily Translation',
  appSubtitle: 'Dịch câu mỗi ngày kèm từ vựng gợi ý',
  appIcon: 'BookOpen',
  appIconType: 'lucide',
};

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('translation_user_profile');
      if (saved) {
        const parsed: Profile = JSON.parse(saved);
        if (parsed.email?.toLowerCase() === 'hungpv2172002@gmail.com') {
          parsed.role = 'admin';
          parsed.is_vip = true;
        }
        return parsed;
      }
    } catch (e) {}
    return null;
  });
  const [questions, setQuestions] = useState<Question[]>(() =>
    getDailyQuestions(INITIAL_QUESTIONS)
  );
  const [todayCount, setTodayCount] = useState<number>(0);
  const [currentView, setCurrentView] = useState<'study' | 'admin'>('study');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ngày hiện tại
  const [todayDateString] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Cài đặt tên và biểu tượng ứng dụng
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_custom_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });


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

  // 1.1 Tải cài đặt thương hiệu ứng dụng (Tên & Biểu tượng)
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
            localStorage.setItem('app_custom_settings', JSON.stringify(data.settings));
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc settings từ server:', e);
      }
    }
    loadSettings();
  }, []);

  // Cập nhật tiêu đề trang theo tên ứng dụng
  useEffect(() => {
    if (settings.appName) {
      document.title = `${settings.appName} - Học Dịch Tiếng Anh Mỗi Ngày`;
    }
  }, [settings.appName]);

  // 2. Tải profile nếu có phiên đăng nhập
  const initUserSession = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const cleanEmail = session.user.email?.toLowerCase() || '';
          const isAdmin = cleanEmail === 'hungpv2172002@gmail.com';
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (pData) {
            const merged: Profile = {
              ...(pData as Profile),
              role: isAdmin ? 'admin' : (pData.role || 'user'),
              is_vip: isAdmin ? true : (pData.is_vip ?? false),
            };
            setProfile(merged);
            localStorage.setItem('translation_user_profile', JSON.stringify(merged));
          } else {
            const merged: Profile = {
              id: session.user.id,
              email: cleanEmail,
              full_name: session.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
              role: isAdmin ? 'admin' : 'user',
              is_vip: isAdmin,
              created_at: new Date().toISOString(),
            };
            setProfile(merged);
            localStorage.setItem('translation_user_profile', JSON.stringify(merged));
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

  // 3. Tải câu hỏi từ API server hoặc Supabase (tự động đảo theo ngày)
  useEffect(() => {
    async function loadQuestions() {
      // Ưu tiên tải từ API server (hỗ trợ đảo câu theo ngày queryDate)
      try {
        const res = await fetch(`/api/questions?date=${todayDateString}&mode=daily`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.questions) && json.questions.length > 0) {
            setQuestions(json.questions as Question[]);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('Không thể tải từ /api/questions, thử trực tiếp Supabase:', apiErr);
      }

      // Dự phòng tải trực tiếp từ Supabase Client nếu có
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: true });

          if (!error && data && data.length > 0) {
            // Đảo câu theo ngày
            setQuestions(getDailyQuestions(data as Question[], todayDateString));
            return;
          }
        } catch (e) {
          console.warn('Lỗi tải câu hỏi từ Supabase:', e);
        }
      }

      // Fallback câu mặc định đảo theo ngày
      setQuestions(getDailyQuestions(INITIAL_QUESTIONS, todayDateString));
    }
    loadQuestions();
  }, [todayDateString]);


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

  // 6. Kích hoạt Gemini AI sinh câu mới (hỗ trợ cả chuyên ngành)
  const handleQuickAiGenerate = async (categoryInput?: unknown) => {
    setIsAiGenerating(true);
    try {
      // Đảm bảo chỉ nhận string hợp lệ, tránh nhận synthetic click event từ React button
      const validCategory =
        typeof categoryInput === 'string' && categoryInput.trim().length > 0
          ? categoryInput.trim().toLowerCase()
          : undefined;

      const catParam = validCategory ? `&category=${encodeURIComponent(validCategory)}` : '';
      const res = await fetch(`/api/cron/generate?key=my_super_secret_cron_token_12345${catParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my_super_secret_cron_token_12345',
        },
        body: JSON.stringify({ category: validCategory }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi gọi API cron sinh câu');
      }

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        // Nạp thêm vào danh sách câu hỏi hiện tại
        setQuestions((prev) => [...json.data, ...prev]);
      }

      const catLabel =
        validCategory === 'it'
          ? 'chuyên ngành IT & Tech'
          : validCategory === 'business'
          ? 'chuyên ngành Kinh Doanh & Sales'
          : validCategory === 'hospitality'
          ? 'chuyên ngành Khách Sạn & Du Lịch'
          : 'giao tiếp chung';

      setToastMessage({
        type: 'success',
        text: `Gemini AI đã sinh thành công 10 câu mới thuộc ${catLabel}!`,
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
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    localStorage.removeItem('translation_user_profile');
    setProfile(null);
    setCurrentView('study');
    setToastMessage({ type: 'success', text: 'Đã đăng xuất thành công.' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 7. Cập nhật và lưu cài đặt Tên + Biểu tượng từ trang Quản trị
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('app_custom_settings', JSON.stringify(newSettings));

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) {
        throw new Error('Lỗi từ máy chủ khi lưu cài đặt.');
      }
    } catch (err: any) {
      console.warn('Lưu lên máy chủ gặp trục trặc, dữ liệu vẫn được lưu tại trình duyệt:', err);
    }

    setToastMessage({
      type: 'success',
      text: `Đã đổi tên ứng dụng thành "${newSettings.appName}" và cập nhật biểu tượng thành công!`,
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 8. Đảo ngẫu nhiên câu hỏi ngay lập tức
  const handleShuffleQuestions = () => {
    setQuestions((prev) => shuffleQuestions(prev));
    setToastMessage({
      type: 'success',
      text: 'Đã đảo ngẫu nhiên toàn bộ danh sách câu hỏi!',
    });
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
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSignOut={handleSignOut}
        onQuickAiGenerate={handleQuickAiGenerate}
        isAiGenerating={isAiGenerating}
        settings={settings}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {currentView === 'study' ? (
          <StudyView
            questions={questions}
            profile={profile}
            todayCount={todayCount}
            onQuestionCompleted={handleQuestionCompleted}
            onOpenAuth={() => {
              setAuthModalMode('login');
              setIsAuthOpen(true);
            }}
            onShuffle={handleShuffleQuestions}
            todayDateString={todayDateString}
          />
        ) : (
          <AdminView
            currentUser={profile}
            profiles={allProfiles}
            onToggleVip={handleToggleVip}
            onBackToStudy={() => setCurrentView('study')}
            onAiGenerateQuestions={handleQuickAiGenerate}
            isGeneratingAi={isAiGenerating}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        )}
      </main>


      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © 2026 {settings.appName} • Luyện dịch Việt ➔ Anh mỗi ngày kèm phản hồi thông minh
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Rèn luyện bền bỉ mỗi ngày</span>
            {profile?.role === 'admin' && (
              <button
                onClick={() => setIsGuideOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 cursor-pointer"
              >
                Mã SQL Supabase
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(newProfile) => {
          if (newProfile.email?.toLowerCase() === 'hungpv2172002@gmail.com') {
            newProfile.role = 'admin';
            newProfile.is_vip = true;
          }
          setProfile(newProfile);
          localStorage.setItem('translation_user_profile', JSON.stringify(newProfile));
          // Tự động thêm hoặc cập nhật trong allProfiles
          setAllProfiles((prev) => {
            if (prev.some((p) => p.id === newProfile.id)) {
              return prev.map((p) => (p.id === newProfile.id ? newProfile : p));
            }
            return [newProfile, ...prev];
          });
          setToastMessage({
            type: 'success',
            text: `Chào mừng ${newProfile.full_name || newProfile.email} đã đăng nhập thành công!`,
          });
          setTimeout(() => setToastMessage(null), 3000);
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
