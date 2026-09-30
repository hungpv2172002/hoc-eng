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
  X,
  Delete,
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
import { WordLookupModal } from './WordLookupModal';


interface StudyViewProps {
  questions: Question[];
  profile: Profile | null;
  todayCount: number;
  onQuestionCompleted: (questionId: number) => void;
  onOpenAuth: () => void;
  onShuffle?: () => void;
  todayDateString?: string;
  onOpenBattle?: () => void;
  onOpenDuel?: () => void;
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
  onOpenBattle,
  onOpenDuel,
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

  // 5. Quản lý Modal Trợ lý từ vựng AI & Google Dịch
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  const handleInsertWord = (wordToInsert: string) => {
    setUserAnswer((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return wordToInsert;
      return `${trimmed} ${wordToInsert}`;
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

  // Danh sách từ gợi ý nhanh từ câu trả lời (hỗ trợ thao tác chạm từ siêu mượt trên điện thoại)
  const wordChips = useMemo(() => {
    if (!currentQuestion?.answers?.[0]) return [];
    const rawWords = currentQuestion.answers[0]
      .replace(/[.,!?;:()"]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0);
    // Xáo trộn nhẹ để người học chọn từ
    return [...rawWords].sort((a, b) => {
      const hashA = (a.charCodeAt(0) * 17 + a.length) % 31;
      const hashB = (b.charCodeAt(0) * 17 + b.length) % 31;
      return hashA - hashB;
    });
  }, [currentQuestion?.id]);

  const handleChipClick = (word: string) => {
    setUserAnswer((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word}` : word;
    });
    if (resultState !== 'idle') setResultState('idle');
  };

  const handleRemoveLastWord = () => {
    setUserAnswer((prev) => {
      const words = prev.trim().split(/\s+/);
      if (words.length <= 1) return '';
      words.pop();
      return words.join(' ');
    });
    if (resultState !== 'idle') setResultState('idle');
  };

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
    <div className="w-full mx-auto space-y-4 sm:space-y-6 overflow-x-clip">
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

      {/* BANNER MINI-GAME ĐẤU TRƯỜNG 1V1 (THÁCH ĐẤU BẠN BÈ) */}
      {onOpenDuel && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 rounded-2xl sm:rounded-3xl text-white shadow-md flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in w-full min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0 animate-pulse">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-base truncate">Đấu Trường 1v1 Trực Tuyến</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px] uppercase shadow-2xs shrink-0 animate-bounce">
                  Song song
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 line-clamp-1 sm:line-clamp-none">
                Thách đấu bạn bè hoặc tìm đối thủ online cùng thi dịch câu song song tính điểm!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDuel}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-indigo-50 text-indigo-900 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <span>Thách đấu ngay</span>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
          </button>
        </div>
      )}

      {/* BANNER MINI-GAME ĐẤU BOSS */}
      {onOpenBattle && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-2xl sm:rounded-3xl text-white shadow-md flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in w-full min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0">
              ⚔️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-base truncate">Mini-Game: Tháp Ma Vương</span>
                <span className="px-1.5 py-0.2 rounded-full bg-yellow-300 text-amber-950 font-black text-[9px] uppercase shadow-2xs shrink-0">
                  Mới
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 line-clamp-1 sm:line-clamp-none">
                Luyện dịch câu chém quái, vượt 6 tầng tháp rinh vàng!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBattle}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-amber-50 text-slate-900 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <span>Vào đấu Boss</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-600" />
          </button>
        </div>
      )}

      {/* THÔNG BÁO KHI ĐANG LỌC THEO TRÌNH ĐỘ */}
      {selectedLevel !== 'all' && (
        <div className="p-3 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950 animate-in fade-in w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-extrabold font-mono text-xs shadow-2xs shrink-0">
              {selectedLevel}
            </span>
            <span className="truncate">
              Trình độ <strong>{CEFR_LEVELS.find((l) => l.id === selectedLevel)?.name} ({selectedLevel})</strong> ({filteredQuestions.length} câu).
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectLevel('all')}
            className="text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer text-xs shrink-0"
          >
            Làm tất cả
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
        <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950 animate-in fade-in w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="truncate">
              Chuyên sâu: <strong>{currentCategoryInfo.name}</strong> ({filteredQuestions.length} câu).
            </span>
          </div>
          {!hasVipAccess ? (
            <button
              onClick={() => setVipModalTrack(currentCategoryInfo)}
              className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50 transition-all text-[11px] shrink-0"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Xem quyền lợi VIP</span>
            </button>
          ) : (
            <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              Đặc quyền VIP
            </span>
          )}
        </div>
      )}

      {/* 1. MÀN HÌNH KHÓA NẾU ĐẠT MỐC 30 CÂU CỦA THÀNH VIÊN THƯỜNG */}
      {isFreeLimitReached ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-xl border border-amber-200 animate-in fade-in zoom-in-95 w-full min-w-0">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Chúc mừng bạn đã hoàn thành 30 câu hôm nay! 🎉
          </h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed max-w-md mx-auto">
            Bạn đã hoàn thành giới hạn 30 câu hôm nay. Nâng cấp VIP để học không giới hạn và mở khóa toàn bộ chuyên ngành IT, Kinh Doanh, Khách Sạn!
          </p>

          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => {
                const itTrack = CAREER_TRACKS.find((t) => t.id === 'it') || CAREER_TRACKS[1];
                setVipModalTrack(itTrack);
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-200 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer touch-press"
            >
              <Crown className="w-5 h-5 fill-white" />
              <span>Nâng cấp VIP để mở khóa toàn bộ</span>
            </button>
          </div>
        </div>
      ) : !currentQuestion ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full min-w-0">
          <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Đang tải danh sách câu hỏi...</p>
        </div>
      ) : (
        /* 2. GIAO DIỆN HỌC BÀI */
        <div className="space-y-4 sm:space-y-5 w-full min-w-0">
          {/* Thanh trạng thái ngày & Đảo ngẫu nhiên */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs w-full min-w-0 transition-colors">
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-300 min-w-0">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <CalendarDays className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {formatFriendlyDate(todayDateString)}
              </span>
            </div>

            {onShuffle && (
              <button
                type="button"
                onClick={handleManualShuffle}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 font-semibold transition-all cursor-pointer text-xs active:scale-95 shrink-0 touch-press"
                title="Bấm để đảo ngẫu nhiên toàn bộ thứ tự câu hỏi ngay lập tức"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Đảo ngẫu nhiên</span>
              </button>
            )}
          </div>

          {/* Thanh chỉ số & Tiến độ (RESPONSIVE CHUẨN, KHÔNG BỊ TRÀN NGANG) */}
          <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-0.5 gap-2 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                CÂU {currentIndex + 1}/{filteredQuestions.length}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 font-extrabold text-[11px] font-mono shrink-0">
                {getQuestionLevel(currentQuestion)}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px]">
                {currentCategoryInfo.name}
              </span>
              <span className="text-slate-400 dark:text-slate-600 hidden xs:inline">•</span>
              <span className="shrink-0 text-[11px] sm:text-xs">
                {hasVipAccess ? 'VIP Không giới hạn' : `${todayCount}/30 câu`}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                onClick={handlePrev}
                className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs cursor-pointer touch-press"
              >
                Câu trước
              </button>
              <button
                onClick={handleNext}
                className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer touch-press"
              >
                Câu kế
              </button>
            </div>
          </div>

          {/* Thanh progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(100, ((currentIndex + 1) / filteredQuestions.length) * 100)}%`,
              }}
            />
          </div>

          {/* THẺ HỌC TẬP CHÍNH */}
          <div
            className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl transition-all duration-300 border w-full max-w-full overflow-hidden ${
              resultState === 'correct'
                ? 'border-emerald-500 dark:border-emerald-500 ring-2 sm:ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                : resultState === 'wrong'
                ? 'border-rose-400 dark:border-rose-500 ring-2 sm:ring-4 ring-rose-100 dark:ring-rose-950/60'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Header thẻ: Ngành nghề & Bộ điều chỉnh tốc độ nghe */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-xl flex items-center gap-1 min-w-0 ${
                    currentQuestion.category && currentQuestion.category !== 'general'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'
                  }`}
                >
                  {currentQuestion.category === 'it' && <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                  {currentQuestion.category === 'business' && <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                  {currentQuestion.category === 'hospitality' && <Hotel className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {(!currentQuestion.category || currentQuestion.category === 'general') && (
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-none">{currentCategoryInfo.name}</span>
                </span>
                {currentQuestion.category && currentQuestion.category !== 'general' && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shrink-0">
                    VIP
                  </span>
                )}
                <span className="text-xs font-bold px-2 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800 flex items-center gap-1 font-mono shrink-0">
                  <span>Trình độ {getQuestionLevel(currentQuestion)}</span>
                </span>
              </div>

              {/* BỘ CHỌN TỐC ĐỘ PHÁT ÂM */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1 text-xs shrink-0">
                <div className="flex items-center gap-0.5 px-1 text-slate-400 dark:text-slate-400 font-semibold text-[10px] sm:text-[11px]">
                  <Gauge className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span className="hidden xs:inline">Tốc độ:</span>
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
                    className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      audioSpeed === opt.value
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Câu tiếng Việt in đậm */}
            <div className="mb-4 sm:mb-5 w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Dịch sang tiếng Anh:
                </span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Nút Trợ lý Tra từ vựng AI & Google Dịch */}
                  <button
                    type="button"
                    onClick={() => setIsLookupModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/80 dark:hover:to-purple-900/80 text-indigo-800 dark:text-indigo-200 border-indigo-200/90 dark:border-indigo-800 shadow-2xs active:scale-95 touch-press"
                    title="Bí từ? Bấm để tra từ vựng bằng AI"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Tra từ AI</span>
                  </button>

                  {/* Nút bật / tắt gợi ý nhanh */}
                  <button
                    type="button"
                    onClick={handleToggleHints}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-press ${
                      showHints
                        ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title={showHints ? 'Bấm để ẩn gợi ý' : 'Bấm để hiển thị gợi ý'}
                  >
                    {showHints ? (
                      <>
                        <EyeOff className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                        <span>Ẩn gợi ý</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-indigo-700 dark:text-indigo-300">Hiện gợi ý</span>
                      </>
                    )}
                  </button>

                  {/* Nút Nghe mẫu */}
                  <AudioButton
                    text={currentQuestion.answers[0]}
                    speed={audioSpeed}
                    onSpeedChange={handleSpeedChange}
                    size="sm"
                  />
                </div>
              </div>

              <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug break-words">
                {currentQuestion.vi}
              </h2>
            </div>

            {/* Hộp gợi ý từ vựng (Hiển thị hoặc Ẩn) */}
            {showHints ? (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 rounded-2xl flex items-start justify-between gap-2.5 shadow-2xs transition-all animate-in fade-in w-full min-w-0">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-0.5 uppercase tracking-wide">
                      Gợi ý từ vựng & cấu trúc:
                    </span>
                    <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium leading-relaxed break-words">
                      {currentQuestion.hints}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHints}
                  className="shrink-0 p-1 text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold touch-press"
                  title="Ẩn gợi ý"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ẩn</span>
                </button>
              </div>
            ) : (
              <div className="mb-4 sm:mb-6 p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-2 transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/80 animate-in fade-in w-full min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1 bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl shrink-0">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">
                      Gợi ý từ vựng đang được ẩn
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      Tự thử thách khả năng ghi nhớ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHints}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-slate-700 shadow-2xs hover:border-indigo-300 transition-all text-xs cursor-pointer active:scale-95 shrink-0 touch-press"
                >
                  <Eye className="w-3 h-3" />
                  <span>Hiện</span>
                </button>
              </div>
            )}

            {/* Form nhập câu trả lời tiếng Anh */}
            <form onSubmit={handleCheck} className="space-y-3.5">
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
                  placeholder="Gõ câu dịch tiếng Anh hoặc chạm các từ gợi ý bên dưới..."
                  className="w-full p-3.5 sm:p-4 pr-10 text-base sm:text-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 outline-hidden transition-all resize-none font-medium leading-relaxed"
                />

                {/* Nút xóa nhanh nội dung đã nhập */}
                {userAnswer.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswer('');
                      if (resultState !== 'idle') setResultState('idle');
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors touch-press cursor-pointer"
                    title="Xóa toàn bộ câu đã nhập"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* KHU VỰC TỪ GỢI Ý CHỌN NHANH (GIÚP THAO TÁC TRÊN ĐIỆN THOẠI CỰC MƯỢT) */}
              {wordChips.length > 0 && (
                <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Chạm từ để thêm nhanh vào câu:</span>
                    {userAnswer.trim() && (
                      <button
                        type="button"
                        onClick={handleRemoveLastWord}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer touch-press"
                      >
                        <Delete className="w-3 h-3" />
                        <span>Xóa từ cuối</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {wordChips.map((chip, chipIdx) => {
                      const isUsed = userAnswer.toLowerCase().includes(chip.toLowerCase());
                      return (
                        <button
                          key={`${chip}-${chipIdx}`}
                          type="button"
                          onClick={() => handleChipClick(chip)}
                          className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none touch-press ${
                            isUsed
                              ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-800'
                              : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95'
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Thanh tiện ích bổ trợ: Tra từ AI & Loa nghe */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIsLookupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer group touch-press"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
                  <span className="group-hover:underline">Bí từ? Tra nhanh bằng AI</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">Phát âm mẫu:</span>
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
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <strong className="font-bold text-emerald-900 dark:text-emerald-100 block text-base">
                        Chính xác! Xuất sắc lắm! 🎉
                      </strong>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
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
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-900 dark:text-rose-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <strong className="font-bold text-rose-900 dark:text-rose-100 block">
                      Chưa chính xác, hãy thử lại hoặc xem câu mẫu:
                    </strong>
                    <div className="flex items-center justify-between p-2.5 bg-white/90 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-800 rounded-xl font-mono text-xs text-rose-800 dark:text-rose-300">
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
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[48px] px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-semibold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer touch-press shrink-0"
                >
                  Bỏ qua câu này
                </button>

                <button
                  type="submit"
                  disabled={!userAnswer.trim() || submitting}
                  className="min-h-[48px] flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-base touch-press"
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
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
          <div>
            <strong className="font-bold block">Bạn đang trải nghiệm dưới dạng Khách</strong>
            <span className="text-indigo-700 dark:text-indigo-300">
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

      {/* MODAL TRỢ LÝ TỪ VỰNG AI & GOOGLE DỊCH */}
      <WordLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        currentQuestion={currentQuestion}
        onInsertWord={handleInsertWord}
      />
    </div>
  );
};
