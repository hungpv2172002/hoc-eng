import React, { useState, useMemo, useEffect } from 'react';
import {
  Question,
  Profile,
  CareerCategory,
  CareerTrackInfo,
  CAREER_TRACKS,
  CEFRLevel,
  CEFR_LEVELS,
} from '../types';
import {
  Volume2,
  CheckCircle,
  XCircle,
  Crown,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Award,
  Sparkles,
  ArrowRight,
  Shuffle,
  CalendarDays,
  Gauge,
  Briefcase,
  Code2,
  Hotel,
  MessageSquare,
  Lock,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  formatFriendlyDate,
  getDailyRotatedQuestions,
  getQuestionLevel,
  shuffleQuestions,
} from '../lib/questionRotation';
import { INITIAL_QUESTIONS } from '../data/initialQuestions';
import { AudioButton, playSpeech, SPEED_OPTIONS } from './AudioButton';
import { CareerTrackSelector } from './CareerTrackSelector';
import { VipPromptModal } from './VipPromptModal';
import { LevelSelector } from './LevelSelector';


interface StudyViewProps {
  questions: Question[];
  profile: Profile | null;
  todayCount: number;
  onQuestionCompleted: (questionId: number) => void;
  onOpenAuth: () => void;
  onShuffle?: () => void;
  todayDateString?: string;
}

export function normalizeSentence(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[.,!?;:()]/g, '')
    .replace(/\s+/g, ' ');
}

export function speakText(text: string, rate: number = 0.9) {
  playSpeech(text, rate);
}

export const StudyView: React.FC<StudyViewProps> = ({
  questions,
  profile,
  todayCount,
  onQuestionCompleted,
  onOpenAuth,
  onShuffle,
  todayDateString,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultState, setResultState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [submitting, setSubmitting] = useState(false);

  // 1. Quản lý Tốc độ nghe (0.75x, 0.9x, 1.0x, 1.25x)
  const [audioSpeed, setAudioSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('audio_playback_speed');
        if (saved) return parseFloat(saved) || 0.9;
      } catch (e) {}
    }
    return 0.9;
  });

  const handleSpeedChange = (newSpeed: number) => {
    setAudioSpeed(newSpeed);
    try {
      localStorage.setItem('audio_playback_speed', newSpeed.toString());
    } catch (e) {}
  };

  // 2. Phân loại ngành nghề cho VIP
  const [selectedCategory, setSelectedCategory] = useState<CareerCategory>('general');
  const [vipModalTrack, setVipModalTrack] = useState<CareerTrackInfo | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // 3. Quản lý Trình độ người học (all, A1, A2, B1, B2, C1)
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('translation_user_cefr_level');
        if (saved && ['all', 'A1', 'A2', 'B1', 'B2', 'C1'].includes(saved)) {
          return saved as CEFRLevel;
        }
      } catch (e) {}
    }
    return 'all';
  });

  const handleSelectLevel = (level: CEFRLevel) => {
    setSelectedLevel(level);
    try {
      localStorage.setItem('translation_user_cefr_level', level);
    } catch (e) {}
    setCurrentIndex(0);
    setUserAnswer('');
    setResultState('idle');
  };

  // 4. Quản lý Hiển thị / Ẩn gợi ý từ vựng cho người học
  const [showHints, setShowHints] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('translation_show_hints');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch (e) {}
    }
    return true; // Mặc định mở gợi ý
  });

  const handleToggleHints = () => {
    setShowHints((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('translation_show_hints', String(next));
      } catch (e) {}
      return next;
    });
  };

  const isVip = profile?.is_vip ?? false;
  const isAdmin = profile?.role === 'admin';
  const hasVipAccess = isVip || isAdmin;

  const isFreeLimitReached = !hasVipAccess && todayCount >= 30;

  // Hợp nhất toàn bộ câu hỏi (từ Supabase / API + Ngân hàng mẫu INITIAL_QUESTIONS)
  // Đảm bảo 100% người dùng bấm vào IT, Business, Hospitality hay General đều luôn có danh sách câu hỏi phong phú
  const allAvailableQuestions = useMemo(() => {
    const existingIds = new Set(questions.map((q) => q.id));
    const supplement = INITIAL_QUESTIONS.filter((q) => !existingIds.has(q.id));
    return [...questions, ...supplement];
  }, [questions]);

  // Đếm số lượng câu hỏi theo từng chuyên ngành
  const questionCounts = useMemo(() => {
    const counts: Record<CareerCategory, number> = {
      general: 0,
      it: 0,
      business: 0,
      hospitality: 0,
    };
    allAvailableQuestions.forEach((q) => {
      const cat = q.category || 'general';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [allAvailableQuestions]);

  // Đếm số lượng câu hỏi theo từng trình độ CEFR cho chuyên ngành hiện tại
  const levelCounts = useMemo(() => {
    const counts: Record<CEFRLevel, number> = {
      all: 0,
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
    };
    const catPool = allAvailableQuestions.filter(
      (q) => (q.category || 'general') === selectedCategory
    );
    const targetPool = catPool.length > 0 ? catPool : allAvailableQuestions;
    counts.all = targetPool.length;
    targetPool.forEach((q) => {
      const lvl = getQuestionLevel(q);
      if (counts[lvl] !== undefined) {
        counts[lvl]++;
      }
    });
    return counts;
  }, [allAvailableQuestions, selectedCategory]);

  // Lọc câu hỏi theo chuyên ngành và TRÌNH ĐỘ (TỰ ĐỘNG ĐẢO NGẪU NHIÊN MỖI KHI REFRESH)
  const filteredQuestions = useMemo(() => {
    let pool = allAvailableQuestions.filter(
      (q) => (q.category || 'general') === selectedCategory
    );
    if (pool.length === 0) {
      pool = INITIAL_QUESTIONS.filter(
        (q) => (q.category || 'general') === selectedCategory
      );
    }
    if (pool.length === 0) {
      pool = allAvailableQuestions;
    }

    // Lọc theo trình độ A1, A2, B1, B2, C1
    if (selectedLevel !== 'all') {
      const levelMatches = pool.filter((q) => getQuestionLevel(q) === selectedLevel);
      if (levelMatches.length > 0) {
        pool = levelMatches;
      } else {
        // Fallback sang tất cả các câu của trình độ đó nếu chuyên ngành hiện tại chưa có
        const globalLevelMatches = allAvailableQuestions.filter(
          (q) => getQuestionLevel(q) === selectedLevel
        );
        if (globalLevelMatches.length > 0) {
          pool = globalLevelMatches;
        }
      }
    }

    // Tự động xáo trộn ngẫu nhiên hoàn toàn (Fisher-Yates) mỗi lần refresh hoặc đổi bộ lọc
    return shuffleQuestions(pool);
  }, [allAvailableQuestions, selectedCategory, selectedLevel, shuffleSeed]);

  // Reset vị trí và nạp ngay câu đầu tiên khi khách hàng ấn vào Ngành chuyên sâu
  const handleSelectCategory = (cat: CareerCategory) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setUserAnswer('');
    setResultState('idle');
  };

  const currentQuestion = filteredQuestions[currentIndex] || filteredQuestions[0];

  const handleManualShuffle = () => {
    setShuffleSeed((prev) => prev + 1);
    setCurrentIndex(0);
    setUserAnswer('');
    setResultState('idle');
    if (onShuffle) {
      onShuffle();
    }
  };


  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userAnswer.trim() || submitting) return;

    if (isFreeLimitReached) return;

    setSubmitting(true);
    const normalizedInput = normalizeSentence(userAnswer);
    const isCorrect = currentQuestion.answers.some(
      (ans) => normalizeSentence(ans) === normalizedInput
    );

    if (isCorrect) {
      setResultState('correct');
      playSpeech(currentQuestion.answers[0], audioSpeed);

      // Pháo hoa ăn mừng
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.65 },
      });

      onQuestionCompleted(currentQuestion.id);

      // Chuyển sang câu tiếp theo sau 1.5 giây
      setTimeout(() => {
        setResultState('idle');
        setUserAnswer('');
        setCurrentIndex((prev) => (prev + 1 < filteredQuestions.length ? prev + 1 : 0));
        setSubmitting(false);
      }, 1500);
    } else {
      setResultState('wrong');
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setResultState('idle');
    setUserAnswer('');
    setCurrentIndex((prev) => (prev + 1 < filteredQuestions.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setResultState('idle');
    setUserAnswer('');
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredQuestions.length - 1));
  };

  // Icon & nhãn cho từng category
  const currentCategoryInfo = CAREER_TRACKS.find(
    (t) => t.id === (currentQuestion?.category || 'general')
  ) || CAREER_TRACKS[0];

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      {/* 0. THANH LỰA CHỌN CHỦ ĐỀ NGÀNH NGHỀ DÀNH CHO VIP */}
      <CareerTrackSelector
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        profile={profile}
        onOpenVipPrompt={(track) => setVipModalTrack(track)}
        questionCounts={questionCounts}
      />

      {/* 0.1. THANH LỰA CHỌN TRÌNH ĐỘ CEFR (A1, A2, B1, B2, C1, TẤT CẢ) */}
      <LevelSelector
        selectedLevel={selectedLevel}
        onSelectLevel={handleSelectLevel}
        levelCounts={levelCounts}
      />

      {/* THÔNG BÁO KHI ĐANG LỌC THEO TRÌNH ĐỘ */}
      {selectedLevel !== 'all' && (
        <div className="p-3.5 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-extrabold font-mono text-xs shadow-2xs">
              {selectedLevel}
            </span>
            <span>
              Đang hiển thị câu hỏi phù hợp với trình độ <strong>{CEFR_LEVELS.find((l) => l.id === selectedLevel)?.name} ({selectedLevel})</strong> ({filteredQuestions.length} câu).
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectLevel('all')}
            className="text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer text-xs"
          >
            Làm tất cả trình độ
          </button>
        </div>
      )}

      {/* POPUP KÍCH HOẠT VIP KHI XEM THÔNG TIN GÓI VIP */}
      <VipPromptModal
        isOpen={!!vipModalTrack}
        onClose={() => setVipModalTrack(null)}
        track={vipModalTrack}
        profile={profile}
        onOpenAuth={onOpenAuth}
        onTrySample={() => {
          if (vipModalTrack) {
            handleSelectCategory(vipModalTrack.id);
            setVipModalTrack(null);
          }
        }}
      />

      {/* THÔNG BÁO KHI ĐANG HỌC CHỦ ĐỀ CHUYÊN NGÀNH */}
      {selectedCategory !== 'general' && (
        <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span>
              Đang làm bài tập chuyên sâu: <strong>{currentCategoryInfo.name}</strong> ({filteredQuestions.length} câu thực tế).
            </span>
          </div>
          {!hasVipAccess ? (
            <button
              onClick={() => setVipModalTrack(currentCategoryInfo)}
              className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50 transition-all text-[11px]"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Xem quyền lợi VIP</span>
            </button>
          ) : (
            <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Đặc quyền VIP
            </span>
          )}
        </div>
      )}

      {/* 1. MÀN HÌNH KHÓA NẾU ĐẠT MỐC 30 CÂU CỦA THÀNH VIÊN THƯỜNG */}
      {isFreeLimitReached ? (

        <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-amber-200 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Chúc mừng bạn đã hoàn thành 30 câu hôm nay! 🎉
          </h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed max-w-md mx-auto">
            Bạn đã hoàn thành giới hạn 30 câu hôm nay. Nâng cấp VIP để học không giới hạn và mở khóa toàn bộ chuyên ngành IT, Kinh Doanh, Khách Sạn!
          </p>

          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                const itTrack = CAREER_TRACKS.find((t) => t.id === 'it') || CAREER_TRACKS[1];
                setVipModalTrack(itTrack);
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-200 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-5 h-5 fill-white" />
              <span>Nâng cấp VIP để mở khóa toàn bộ</span>
            </button>
          </div>
        </div>
      ) : !currentQuestion ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Đang tải danh sách câu hỏi...</p>
        </div>
      ) : (
        /* 2. GIAO DIỆN HỌC BÀI */
        <div className="space-y-5">
          {/* Thanh trạng thái ngày & Đảo ngẫu nhiên */}
          <div className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                <CalendarDays className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-800">
                {formatFriendlyDate(todayDateString)}
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Tự động đảo câu ngẫu nhiên khi tải trang
              </span>
            </div>

            {onShuffle && (
              <button
                type="button"
                onClick={handleManualShuffle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 font-semibold transition-all cursor-pointer text-xs active:scale-95"
                title="Bấm để đảo ngẫu nhiên toàn bộ thứ tự câu hỏi ngay lập tức"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Đảo ngẫu nhiên</span>
              </button>
            )}
          </div>

          {/* Thanh chỉ số & Tiến độ */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                CÂU {currentIndex + 1} / {filteredQuestions.length}
              </span>
              <span className="text-slate-400">•</span>
              <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 font-extrabold text-[11px] font-mono">
                {getQuestionLevel(currentQuestion)}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-700 font-medium">
                {currentCategoryInfo.name}
              </span>
              <span className="text-slate-400">•</span>
              <span>{hasVipAccess ? 'Học không giới hạn (VIP)' : `Hôm nay: ${todayCount}/30 câu`}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Câu trước
              </button>
              <button
                onClick={handleNext}
                className="px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Câu kế
              </button>
            </div>
          </div>

          {/* Thanh progress bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(100, ((currentIndex + 1) / filteredQuestions.length) * 100)}%`,
              }}
            />
          </div>

          {/* THẺ HỌC TẬP CHÍNH */}
          <div
            className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 border ${
              resultState === 'correct'
                ? 'border-emerald-500 ring-4 ring-emerald-100'
                : resultState === 'wrong'
                ? 'border-rose-400 ring-4 ring-rose-100'
                : 'border-slate-200'
            }`}
          >
            {/* Header thẻ: Ngành nghề & Bộ điều chỉnh tốc độ nghe */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                    currentQuestion.category && currentQuestion.category !== 'general'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200/80'
                      : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                  }`}
                >
                  {currentQuestion.category === 'it' && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
                  {currentQuestion.category === 'business' && <Briefcase className="w-3.5 h-3.5 text-amber-600" />}
                  {currentQuestion.category === 'hospitality' && <Hotel className="w-3.5 h-3.5 text-emerald-600" />}
                  {(!currentQuestion.category || currentQuestion.category === 'general') && (
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{currentCategoryInfo.name}</span>
                </span>
                {currentQuestion.category && currentQuestion.category !== 'general' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                    VIP
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-violet-50 text-violet-800 border border-violet-200/80 flex items-center gap-1 font-mono">
                  <span>Trình độ {getQuestionLevel(currentQuestion)}</span>
                </span>
              </div>

              {/* BỘ CHỌN TỐC ĐỘ PHÁT ÂM (0.75x, 0.9x, 1.0x, 1.25x) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-1 text-xs">
                <div className="flex items-center gap-1 px-1.5 text-slate-400 font-semibold text-[11px]">
                  <Gauge className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tốc độ:</span>
                </div>
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleSpeedChange(opt.value);
                      playSpeech(currentQuestion.answers[0], opt.value);
                    }}
                    title={`${opt.label} - ${opt.desc}`}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      audioSpeed === opt.value
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Câu tiếng Việt in đậm */}
            <div className="mb-5">
              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Dịch sang tiếng Anh:
                </span>

                <div className="flex items-center gap-2">
                  {/* Nút bật / tắt gợi ý nhanh */}
                  <button
                    type="button"
                    onClick={handleToggleHints}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      showHints
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                    title={showHints ? 'Bấm để ẩn gợi ý (Tự thử thách ghi nhớ)' : 'Bấm để hiển thị gợi ý từ vựng'}
                  >
                    {showHints ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                        <span>Ẩn gợi ý</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-indigo-700">Hiện gợi ý</span>
                      </>
                    )}
                  </button>

                  {/* Nút Nghe mẫu kèm tốc độ */}
                  <AudioButton
                    text={currentQuestion.answers[0]}
                    speed={audioSpeed}
                    onSpeedChange={handleSpeedChange}
                    size="sm"
                  />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {currentQuestion.vi}
              </h2>
            </div>

            {/* Hộp gợi ý từ vựng (Hiển thị hoặc Ẩn) */}
            {showHints ? (
              <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-3 shadow-2xs transition-all animate-in fade-in">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-900 block mb-0.5 uppercase tracking-wide">
                      Gợi ý từ vựng & cấu trúc:
                    </span>
                    <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                      {currentQuestion.hints}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHints}
                  className="shrink-0 p-1.5 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                  title="Ẩn gợi ý để tự thử thách"
                >
                  <EyeOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Ẩn</span>
                </button>
              </div>
            ) : (
              <div className="mb-6 p-3.5 bg-slate-50/80 border border-dashed border-slate-300 rounded-2xl flex items-center justify-between gap-3 transition-all hover:bg-slate-100/60 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-slate-200/80 text-slate-500 rounded-xl">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Gợi ý từ vựng đang được ẩn
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tự thử thách khả năng ghi nhớ từ vựng và cấu trúc
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHints}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-200 shadow-2xs hover:border-indigo-300 transition-all text-xs cursor-pointer active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hiện gợi ý</span>
                </button>
              </div>
            )}

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCheck(e);
                    }
                  }}
                  placeholder="Gõ câu dịch tiếng Anh của bạn tại đây (Nhấn Enter để kiểm tra)..."
                  className="w-full p-4 pr-32 text-base sm:text-lg bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all resize-none font-medium leading-relaxed"
                  autoFocus
                />

                {/* Cụm Loa + Tốc độ nghe trực tiếp trong khung nhập câu trả lời */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                  <AudioButton
                    text={currentQuestion.answers[0]}
                    speed={audioSpeed}
                    onSpeedChange={handleSpeedChange}
                    size="sm"
                    showSpeedSelector={false}
                  />
                </div>
              </div>

              {/* Thông báo kết quả so khớp */}
              {resultState === 'correct' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <strong className="font-bold text-emerald-900 block text-base">
                        Chính xác! Xuất sắc lắm! 🎉
                      </strong>
                      <span className="text-xs text-emerald-700">
                        Đang tự động chuyển sang câu tiếp theo...
                      </span>
                    </div>
                    <AudioButton
                      text={currentQuestion.answers[0]}
                      speed={audioSpeed}
                      onSpeedChange={handleSpeedChange}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {resultState === 'wrong' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <strong className="font-bold text-rose-900 block">
                      Chưa chính xác, hãy thử lại hoặc xem câu mẫu:
                    </strong>
                    <div className="flex items-center justify-between p-2.5 bg-white/90 border border-rose-200 rounded-xl font-mono text-xs text-rose-800">
                      <span>"{currentQuestion.answers[0]}"</span>
                      <AudioButton
                        text={currentQuestion.answers[0]}
                        speed={audioSpeed}
                        onSpeedChange={handleSpeedChange}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hàng nút bấm thao tác */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-3.5 border border-slate-200 text-slate-600 hover:text-slate-800 font-semibold rounded-2xl hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Bỏ qua câu này
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

      {/* Thông báo nếu người dùng chưa đăng nhập */}
      {!profile && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-900">
          <div>
            <strong className="font-bold block">Bạn đang trải nghiệm dưới dạng Khách</strong>
            <span className="text-indigo-700">
              Đăng nhập hoặc đăng ký tài khoản để lưu tiến độ học tập và mở khóa trọn bộ các ngành nghề IT, Kinh Doanh, Khách Sạn!
            </span>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Đăng nhập / Đăng ký
          </button>
        </div>
      )}
    </div>
  );
};
