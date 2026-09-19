import React, { useState } from 'react';
import { Question, Profile } from '../types';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudyViewProps {
  questions: Question[];
  profile: Profile | null;
  todayCount: number;
  onQuestionCompleted: (questionId: number) => void;
  onOpenAuth: () => void;
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

export function speakText(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export const StudyView: React.FC<StudyViewProps> = ({
  questions,
  profile,
  todayCount,
  onQuestionCompleted,
  onOpenAuth,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultState, setResultState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const isVip = profile?.is_vip ?? false;
  const isFreeLimitReached = !isVip && todayCount >= 30;

  const currentQuestion = questions[currentIndex];

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
      speakText(currentQuestion.answers[0]);

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
        setCurrentIndex((prev) => (prev + 1 < questions.length ? prev + 1 : 0));
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
    setCurrentIndex((prev) => (prev + 1 < questions.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setResultState('idle');
    setUserAnswer('');
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : questions.length - 1));
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
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
            Bạn đã hoàn thành giới hạn 30 câu hôm nay. Nâng cấp VIP để học không giới hạn và mở khóa toàn bộ tính năng cao cấp!
          </p>

          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() =>
                alert(
                  'Vui lòng vào tài khoản Admin hoặc liên hệ Admin qua Gmail hungpv2172002@gmail.com để được kích hoạt VIP!'
                )
              }
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-200 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-5 h-5 fill-white" />
              <span>Nâng cấp VIP để học không giới hạn</span>
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
        <div className="space-y-6">
          {/* Thanh chỉ số & Tiến độ */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                CÂU {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-slate-400">•</span>
              <span>{isVip ? 'Học không giới hạn (VIP)' : `Hôm nay: ${todayCount}/30 câu`}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs"
              >
                Câu trước
              </button>
              <button
                onClick={handleNext}
                className="px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg text-xs font-semibold"
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
                width: `${Math.min(100, ((currentIndex + 1) / questions.length) * 100)}%`,
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
            {/* Câu tiếng Việt in đậm */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Dịch sang tiếng Anh:
                </span>
                <button
                  type="button"
                  onClick={() => speakText(currentQuestion.answers[0])}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  title="Nghe phát âm tiếng Anh mẫu"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe mẫu</span>
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {currentQuestion.vi}
              </h2>
            </div>

            {/* Hộp badge gợi ý từ vựng */}
            <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 shadow-2xs">
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
                  className="w-full p-4 text-base sm:text-lg bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all resize-none font-medium leading-relaxed"
                  autoFocus
                />

                {/* Nút loa phát âm trực tiếp trong khung nhập */}
                <button
                  type="button"
                  onClick={() => speakText(currentQuestion.answers[0])}
                  title="Phát âm mẫu câu này"
                  className="absolute bottom-3 right-3 p-2 bg-white hover:bg-indigo-50 text-indigo-600 rounded-xl shadow-xs border border-slate-200 transition-transform active:scale-95 cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Thông báo kết quả so khớp */}
              {resultState === 'correct' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-emerald-900 block text-base">
                      Chính xác! Xuất sắc lắm! 🎉
                    </strong>
                    <span className="text-xs text-emerald-700">
                      Đang tự động chuyển sang câu tiếp theo...
                    </span>
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
                    <div className="flex items-center justify-between p-2 bg-white/80 border border-rose-200 rounded-xl font-mono text-xs text-rose-800">
                      <span>"{currentQuestion.answers[0]}"</span>
                      <button
                        type="button"
                        onClick={() => speakText(currentQuestion.answers[0])}
                        className="text-indigo-600 hover:text-indigo-800 ml-2"
                        title="Nghe phát âm đáp án chuẩn"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
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
              Đăng nhập qua Gmail OTP để lưu tiến độ hoàn thành mỗi ngày vào hồ sơ!
            </span>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}
    </div>
  );
};
