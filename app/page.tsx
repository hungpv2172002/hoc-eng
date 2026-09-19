'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase, Profile, Question } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import ProfileModal from '@/components/ProfileModal';
import {
  Volume2,
  CheckCircle,
  XCircle,
  Crown,
  ShieldCheck,
  Sparkles,
  LogOut,
  LogIn,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Lightbulb,
  Award,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Hàm chuẩn hóa chuỗi để so khớp: loại bỏ dấu câu, chuyển chữ thường, xóa khoảng trắng thừa
export function normalizeSentence(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[.,!?;:()]/g, '')
    .replace(/\s+/g, ' ');
}

// Phát âm mẫu câu tiếng Anh bằng Web Speech API có sẵn trong trình duyệt
export function speakText(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export default function StudyPage() {
  // Trạng thái người dùng và hồ sơ
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Danh sách câu hỏi và trạng thái học
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultState, setResultState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [todayCount, setTodayCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái modal
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isVip = profile?.is_vip ?? false;
  const isFreeLimitReached = !isVip && todayCount >= 30;

  // 1. Tải thông tin người dùng từ Supabase Auth & profiles table
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && !error) {
          setProfile(data as Profile);
        } else {
          // Fallback nếu trigger chưa kịp tạo
          setProfile({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Học viên',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            role: 'user',
            is_vip: false,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin người dùng:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // 2. Đếm số câu người dùng đã hoàn thành hôm nay trong study_logs
  const fetchTodayLogs = useCallback(async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('study_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed_at', todayStr);

      if (!error && count !== null) {
        setTodayCount(count);
      }
    } catch (err) {
      console.error('Lỗi khi lấy lịch sử học hôm nay:', err);
    }
  }, [todayStr]);

  // 3. Tải danh sách câu hỏi từ bảng questions
  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (data && !error && data.length > 0) {
        setQuestions(data as Question[]);
      }
    } catch (err) {
      console.error('Lỗi khi nạp câu hỏi:', err);
    }
  }, []);

  // Khởi chạy khi component mount
  useEffect(() => {
    fetchProfile();
    fetchQuestions();

    // Lắng nghe sự kiện thay đổi đăng nhập của Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
        setTodayCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchQuestions]);

  // Khi có profile, nạp study_logs hôm nay
  useEffect(() => {
    if (profile?.id) {
      fetchTodayLogs(profile.id);
    }
  }, [profile?.id, fetchTodayLogs]);

  const currentQuestion = questions[currentIndex];

  // Xử lý kiểm tra đáp án của người dùng
  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userAnswer.trim() || submitting) return;

    // Kiểm tra giới hạn 30 câu đối với thành viên thường
    if (isFreeLimitReached) {
      return;
    }

    setSubmitting(true);
    const normalizedInput = normalizeSentence(userAnswer);
    const isCorrect = currentQuestion.answers.some(
      (ans) => normalizeSentence(ans) === normalizedInput
    );

    if (isCorrect) {
      setResultState('correct');
      speakText(currentQuestion.answers[0]);

      // Bắn pháo hoa hiệu ứng chúc mừng
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });

      // Ghi nhận vào study_logs trên Supabase nếu đã đăng nhập
      if (profile) {
        try {
          await supabase.from('study_logs').upsert(
            {
              user_id: profile.id,
              question_id: currentQuestion.id,
              completed_at: todayStr,
            },
            { onConflict: 'user_id,question_id,completed_at' }
          );
        } catch (err) {
          console.error('Lỗi khi ghi nhận study_logs:', err);
        }
      }

      const newCount = todayCount + 1;
      setTodayCount(newCount);

      // Chuyển sang câu tiếp theo sau 1.5 giây
      setTimeout(() => {
        setResultState('idle');
        setUserAnswer('');
        setCurrentIndex((prev) => (prev + 1 < questions.length ? prev + 1 : 0));
        setSubmitting(false);
      }, 1500);
    } else {
      setResultState('wrong');
      setSubmitting(false);
    }
  };

  // Đăng xuất
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTodayCount(0);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100 text-slate-800 flex flex-col">
      {/* 1. HEADER (Tối ưu Mobile-first, hiển thị Avatar, VIP, Counter, Admin Link) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Tên ứng dụng */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Daily Translation
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Dịch câu mỗi ngày kèm từ vựng gợi ý
              </p>
            </div>
          </div>

          {/* Khu vực thông tin User / Login */}
          <div className="flex items-center gap-2 sm:gap-3">
            {profile ? (
              <>
                {/* Nút vào trang Admin (nếu role === 'admin') */}
                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors border border-purple-200"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Quản trị</span>
                  </Link>
                )}

                {/* Huy hiệu VIP hoặc Tiến độ hôm nay */}
                <div className="flex items-center gap-1.5">
                  {profile.is_vip ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shadow-xs">
                      <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>VIP MEMBER</span>
                    </span>
                  ) : (
                    <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                      <span>Hôm nay: </span>
                      <strong className={todayCount >= 30 ? 'text-rose-600' : 'text-indigo-600'}>
                        {todayCount}/30 câu
                      </strong>
                    </div>
                  )}
                </div>

                {/* Nút Avatar & Tên (Bấm để mở Modal sửa thông tin) */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                  title="Chỉnh sửa hồ sơ"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center overflow-hidden ring-2 ring-indigo-200">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{profile.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 max-w-[80px] sm:max-w-[120px] truncate hidden xs:inline">
                    {profile.full_name || 'Học viên'}
                  </span>
                </button>

                {/* Nút Đăng xuất */}
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm hover:shadow-indigo-200 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Gmail OTP</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. NỘI DUNG CHÍNH (STUDY CONTAINER) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* BANNER THÔNG BÁO NẾU ĐẠT GIỚI HẠN 30 CÂU CỦA THÀNH VIÊN THƯỜNG */}
        {isFreeLimitReached ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-amber-200 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Chúc mừng bạn đã hoàn thành 30 câu hôm nay! 🎉
            </h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed max-w-md mx-auto">
              Bạn đã hoàn thành giới hạn 30 câu hôm nay. Nâng cấp VIP để học không giới hạn và mở khóa toàn bộ tính năng cao cấp!
            </p>

            <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => alert('Vui lòng liên hệ Admin để nâng cấp tài khoản VIP của bạn!')}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-5 h-5 fill-white" />
                <span>Nâng cấp tài khoản VIP</span>
              </button>
            </div>
          </div>
        ) : questions.length === 0 ? (
          /* TRẠNG THÁI ĐANG TẢI */
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Đang chuẩn bị câu hỏi hôm nay...</p>
          </div>
        ) : (
          /* KHỐI BÀI HỌC CHÍNH */
          <div className="space-y-6">
            {/* Thanh tiến độ học */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
              <span>
                CÂU {currentIndex + 1} / {questions.length}
              </span>
              <span>{isVip ? 'Học không giới hạn (VIP)' : `Đã hoàn thành: ${todayCount}/30 câu`}</span>
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, (currentIndex / Math.max(1, questions.length)) * 100)}%`,
                }}
              />
            </div>

            {/* THẺ BÀI TẬP DỊCH CÂU */}
            <div
              className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 border ${
                resultState === 'correct'
                  ? 'border-emerald-500 ring-4 ring-emerald-100'
                  : resultState === 'wrong'
                  ? 'border-rose-400 ring-4 ring-rose-100'
                  : 'border-slate-200'
              }`}
            >
              {/* Câu tiếng Việt in đậm */}
              <div className="mb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                  Dịch sang tiếng Anh:
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  {currentQuestion.vi}
                </h3>
              </div>

              {/* Hộp badge gợi ý từ vựng */}
              <div className="mb-6 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-900 block mb-0.5">
                    Gợi ý từ vựng:
                  </span>
                  <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
                    {currentQuestion.hints}
                  </p>
                </div>
              </div>

              {/* Form nhập câu trả lời tiếng Anh */}
              <form onSubmit={handleCheck} className="space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      if (resultState !== 'idle') setResultState('idle');
                    }}
                    placeholder="Gõ câu dịch tiếng Anh của bạn vào đây..."
                    className="w-full p-4 text-base sm:text-lg bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all resize-none font-medium"
                    autoFocus
                  />

                  {/* Nút loa phát âm mẫu */}
                  <button
                    type="button"
                    onClick={() => speakText(currentQuestion.answers[0])}
                    title="Nghe phát âm tiếng Anh mẫu"
                    className="absolute bottom-3 right-3 p-2 bg-white hover:bg-indigo-50 text-indigo-600 rounded-xl shadow-xs border border-slate-200 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {/* THÔNG BÁO KẾT QUẢ */}
                {resultState === 'correct' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-emerald-900 block">
                        Chính xác! Xuất sắc lắm! 🎉
                      </strong>
                      <span className="text-xs text-emerald-700">
                        Đang chuyển sang câu tiếp theo trong giây lát...
                      </span>
                    </div>
                  </div>
                )}

                {resultState === 'wrong' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="font-bold text-rose-900 block">
                        Chưa chính xác, hãy thử lại hoặc tham khảo đáp án chuẩn:
                      </strong>
                      <p className="text-xs text-rose-700 font-mono bg-white/70 px-2.5 py-1.5 rounded-lg border border-rose-200">
                        "{currentQuestion.answers[0]}"
                      </p>
                    </div>
                  </div>
                )}

                {/* HÀNG NÚT THAO TÁC */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResultState('idle');
                      setUserAnswer('');
                      setCurrentIndex((prev) => (prev + 1 < questions.length ? prev + 1 : 0));
                    }}
                    className="px-4 py-3.5 border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-colors text-sm"
                  >
                    Bỏ qua
                  </button>

                  <button
                    type="submit"
                    disabled={!userAnswer.trim() || submitting}
                    className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                  >
                    {submitting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Kiểm tra đáp án</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <span>Daily Translation Practice • Luyện dịch tiếng Anh mỗi ngày</span>
      </footer>

      {/* MODAL ĐĂNG NHẬP GMAIL OTP */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          fetchProfile();
        }}
      />

      {/* MODAL HỒ SƠ & ĐỔI AVATAR */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </div>
  );
}
