import React, { useState, useEffect, useCallback } from 'react';
import { Profile, Question, AppSettings } from './types';
import { INITIAL_QUESTIONS } from './data/initialQuestions';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { getDailyQuestions, shuffleQuestions } from './lib/questionRotation';
import { Header } from './components/Header';
import { StudyView } from './components/StudyView';
import { AdminView } from './components/AdminView';
import { TowerBattleView } from './components/TowerBattleView';
import { DuelBattleView } from './components/DuelBattleView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { FriendsModal } from './components/FriendsModal';
import { GuideModal } from './components/GuideModal';
import { FooterContact } from './components/FooterContact';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Friend } from './types';
import { getFriendsList } from './lib/friendsStorage';
import { recordQuestionCompleted } from './lib/badgeSystem';
import { playVictorySound } from './lib/soundFx';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Dịch Mỗi Ngày',
  appSubtitle: 'Dịch câu mỗi ngày kèm từ vựng gợi ý',
  appIcon: '🎯',
  appIconType: 'emoji',
  themeColor: 'indigo',
  bgTheme: 'default',
  showAnnouncement: true,
  announcementText: '🔥 Khuyến mãi VIP Trọn Đời: Mở khóa toàn bộ chuyên ngành IT, Kinh Doanh & Du Lịch!',
  announcementType: 'vip',
  announcementLinkText: 'Nâng cấp VIP',
  heroGreeting: 'Luyện dịch mỗi ngày để phản xạ tiếng Anh tự nhiên',
  heroSubtext: 'Học dịch từng câu, tra từ vựng thông minh và thi đấu Boss tiếng Anh',
  contactPhone: '0987.654.321',
  contactZalo: 'https://zalo.me/0987654321',
  contactEmail: 'hungpv2172002@gmail.com',
  contactFacebook: 'https://facebook.com',
  contactTiktok: 'https://tiktok.com',
  contactTelegram: '',
};

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('translation_user_profile');
      if (saved) {
        const parsed: Profile = JSON.parse(saved);
        // Xác minh tài khoản có trong danh sách đã đăng ký chính thức
        const registeredUsers = localStorage.getItem('app_registered_users');
        if (registeredUsers) {
          const list = JSON.parse(registeredUsers);
          const exists = list.some(
            (u: any) => u.email?.toLowerCase() === parsed.email?.toLowerCase()
          );
          if (exists) {
            if (parsed.email?.toLowerCase() === 'hungpv2172002@gmail.com') {
              parsed.role = 'admin';
              parsed.is_vip = true;
            }
            return parsed;
          }
        }
      }
    } catch (e) {}
    return null;
  });
  const [questions, setQuestions] = useState<Question[]>(() =>
    getDailyQuestions(INITIAL_QUESTIONS)
  );
  const [todayCount, setTodayCount] = useState<number>(0);

  // Nhận mã phòng nếu mở qua liên kết thách đấu (?duel=DUEL-xxxx hoặc ?room=DUEL-xxxx)
  const [initialDuelRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const duel = params.get('duel') || params.get('room');
        if (duel) return duel.toUpperCase().trim();
      } catch (e) {}
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<'study' | 'admin' | 'battle' | 'duel'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('duel') || params.get('room')) {
          return 'duel';
        }
      } catch (e) {}
    }
    return 'study';
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(() => getFriendsList(profile?.email));
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Cập nhật danh sách bạn bè khi đổi tài khoản
  useEffect(() => {
    setFriends(getFriendsList(profile?.email));
  }, [profile?.email]);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ngày hiện tại
  const [todayDateString] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Chế độ hiển thị Giao diện Sáng / Tối hoàn toàn (Tailwind CSS Dark Mode)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  });

  // Đồng bộ themeMode vào class html, body và localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_theme_mode', themeMode);
    } catch (e) {}
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [themeMode]);

  const handleToggleTheme = (mode?: 'light' | 'dark') => {
    setThemeMode((prev) => {
      const next = mode !== undefined ? mode : prev === 'dark' ? 'light' : 'dark';
      return next;
    });
  };

  // Cài đặt tên và biểu tượng ứng dụng (Ưu tiên đọc thêm app_contact_settings để không bao giờ bị mất link liên hệ)
  const [settings, setSettings] = useState<AppSettings>(() => {
    let base = { ...DEFAULT_SETTINGS };
    try {
      const saved = localStorage.getItem('app_custom_settings');
      if (saved) {
        base = { ...base, ...JSON.parse(saved) };
      }
      const savedContacts = localStorage.getItem('app_contact_settings');
      if (savedContacts) {
        const parsedContacts = JSON.parse(savedContacts);
        if (parsedContacts.contactEmail) base.contactEmail = parsedContacts.contactEmail;
        if (parsedContacts.contactFacebook !== undefined && parsedContacts.contactFacebook !== '') {
          base.contactFacebook = parsedContacts.contactFacebook;
        }
        if (parsedContacts.contactTiktok !== undefined && parsedContacts.contactTiktok !== '') {
          base.contactTiktok = parsedContacts.contactTiktok;
        }
      }
      return base;
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });


  // Danh sách tài khoản người dùng và quản trị viên cho AdminView
  const [allProfiles, setAllProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('app_managed_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
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
    ];
  });

  // 1. Tải tiến độ học hôm nay từ localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`daily_study_count_${today}`);
    if (saved) {
      setTodayCount(parseInt(saved, 10) || 0);
    }
  }, []);

  // 1.1 Tải cài đặt thương hiệu ứng dụng (Tên, Biểu tượng & Kênh liên hệ)
  useEffect(() => {
    async function loadSettings() {
      // 1. Thử tải từ bảng app_settings trên Supabase nếu đã cấu hình
      let supabaseSettings: any = null;
      if (isSupabaseConfigured) {
        try {
          const { data: dbData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('id', 'default')
            .maybeSingle();
          if (dbData?.value && typeof dbData.value === 'object') {
            supabaseSettings = dbData.value;
          }
        } catch (e) {}
      }

      // 2. Thử tải từ API server
      let apiSettings: any = null;
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            apiSettings = data.settings;
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc settings từ server:', e);
      }

      // 3. Đọc từ localStorage đã lưu cố định của máy này
      let localContacts: any = null;
      try {
        const savedContactRaw = localStorage.getItem('app_contact_settings');
        if (savedContactRaw) {
          localContacts = JSON.parse(savedContactRaw);
        }
      } catch (e) {}

      const remoteSettings = supabaseSettings || apiSettings;
      if (remoteSettings) {
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...remoteSettings,
        };

        // BẢO VỆ CỐ ĐỊNH LINK LIÊN HỆ:
        // Nếu remote trả về link mặc định trong khi máy admin đã lưu link riêng, luôn ưu tiên link riêng
        if (localContacts) {
          if (localContacts.contactEmail) {
            merged.contactEmail = localContacts.contactEmail;
          }
          if (localContacts.contactFacebook && localContacts.contactFacebook !== 'https://facebook.com') {
            merged.contactFacebook = localContacts.contactFacebook;
          }
          if (localContacts.contactTiktok && localContacts.contactTiktok !== 'https://tiktok.com') {
            merged.contactTiktok = localContacts.contactTiktok;
          }
        }

        setSettings((prev) => ({ ...prev, ...merged }));
        try {
          localStorage.setItem('app_custom_settings', JSON.stringify(merged));
        } catch (e) {}
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

    // Cập nhật tiến độ huy hiệu học tập & chuỗi ngày học (streak)
    const { newlyUnlocked } = recordQuestionCompleted(profile?.email);
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
      playVictorySound();
      setToastMessage({
        type: 'success',
        text: `🎉 MỞ KHÓA HUY HIỆU MỚI: "${newlyUnlocked[0].name}" (${newlyUnlocked[0].icon})!`,
      });
      setTimeout(() => setToastMessage(null), 5000);
    }

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

  // 7. Cập nhật và lưu cài đặt Tên, Biểu tượng & Kênh liên hệ từ trang Quản trị
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('app_custom_settings', JSON.stringify(newSettings));
      localStorage.setItem(
        'app_contact_settings',
        JSON.stringify({
          contactEmail: newSettings.contactEmail,
          contactFacebook: newSettings.contactFacebook,
          contactTiktok: newSettings.contactTiktok,
        })
      );
    } catch (e) {}

    // 1. Lưu trực tiếp vào Supabase cloud database nếu có kết nối
    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_settings').upsert({
          id: 'default',
          value: newSettings,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Lỗi đồng bộ app_settings lên Supabase:', dbErr);
      }
    }

    // 2. Lưu lên API máy chủ backend
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
      console.warn('Lưu lên máy chủ gặp trục trặc, dữ liệu vẫn được lưu tại trình duyệt & Supabase:', err);
    }

    setToastMessage({
      type: 'success',
      text: `Đã lưu cài đặt và cố định kênh liên hệ thành công!`,
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
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 w-full max-w-full overflow-x-hidden transition-colors ${
        themeMode === 'dark'
          ? 'bg-slate-950 text-slate-100 dark'
          : settings.bgTheme === 'pure-white'
          ? 'bg-white text-slate-800'
          : settings.bgTheme === 'warm'
          ? 'bg-amber-50/40 text-slate-800'
          : settings.bgTheme === 'dark-slate'
          ? 'bg-slate-900 text-slate-100 dark'
          : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* BANNER THÔNG BÁO ĐẦU TRANG NẾU ĐƯỢC BẬT TỪ TRANG QUẢN LÝ */}
      {settings.showAnnouncement && settings.announcementText && (
        <div
          className={`w-full py-2 px-3 text-xs font-semibold text-center flex items-center justify-center gap-2 relative z-40 transition-colors ${
            settings.announcementType === 'vip'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-2xs'
              : settings.announcementType === 'success'
              ? 'bg-emerald-600 text-white'
              : settings.announcementType === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <span>{settings.announcementText}</span>
          {settings.announcementLinkText && (
            <button
              onClick={() => {
                if (!profile) {
                  setAuthModalMode('register');
                  setIsAuthOpen(true);
                } else {
                  setIsProfileOpen(true);
                }
              }}
              className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] underline font-bold cursor-pointer transition-all"
            >
              {settings.announcementLinkText} →
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 max-w-[calc(100vw-2rem)]">
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
        onOpenFriends={() => setIsFriendsOpen(true)}
        friendsCount={friends.length}
        onSignOut={handleSignOut}
        onQuickAiGenerate={handleQuickAiGenerate}
        isAiGenerating={isAiGenerating}
        settings={settings}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-8 overflow-x-hidden min-w-0">
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
            onOpenBattle={() => setCurrentView('battle')}
            onOpenDuel={() => setCurrentView('duel')}
          />
        ) : currentView === 'duel' ? (
          <DuelBattleView
            profile={profile}
            onBackToStudy={() => setCurrentView('study')}
            initialRoomId={initialDuelRoomId}
            allProfiles={allProfiles}
            friends={friends}
            onFriendsUpdated={(newFriends) => setFriends(newFriends)}
          />
        ) : currentView === 'battle' ? (
          <TowerBattleView
            profile={profile}
            onBackToStudy={() => setCurrentView('study')}
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
            onUpdateProfiles={(newProfiles) => {
              setAllProfiles(newProfiles);
              try {
                localStorage.setItem('app_managed_accounts', JSON.stringify(newProfiles));
              } catch (e) {}
            }}
            onOpenAuth={() => {
              setAuthModalMode('login');
              setIsAuthOpen(true);
            }}
          />
        )}
      </main>


      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 py-6 text-xs text-slate-500 dark:text-slate-400 w-full max-w-full overflow-hidden transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 w-full min-w-0">
          {/* Bản quyền & Thông tin ứng dụng */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <p className="font-medium text-slate-600 dark:text-slate-300">
              © 2026 {settings.appName} • Luyện dịch Việt ➔ Anh mỗi ngày
            </p>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-400 dark:text-slate-500">Rèn luyện bền bỉ mỗi ngày</span>
            {profile?.role === 'admin' && (
              <>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Mã SQL Supabase
                </button>
              </>
            )}
          </div>

          {/* CÁC ICON LIÊN HỆ DƯỚI CÙNG TRANG (EMAIL, FACEBOOK, TIKTOK, PHONE, ZALO) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 hidden lg:inline mr-1">
              Liên hệ & hỗ trợ:
            </span>
            <FooterContact
              email={settings.contactEmail}
              facebookUrl={settings.contactFacebook}
              tiktokUrl={settings.contactTiktok}
              phone={settings.contactPhone}
              zaloUrl={settings.contactZalo}
            />
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
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        currentUser={profile}
        friends={friends}
        onFriendsUpdated={(newFriends) => setFriends(newFriends)}
        onChallengeFriend={(friend) => {
          setCurrentView('duel');
          setToastMessage({
            type: 'success',
            text: `Đang mở Đấu Trường 1v1 để thách đấu cùng ${friend.name} (${friend.email})!`,
          });
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
