import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Volume2,
  ExternalLink,
  Plus,
  X,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Check,
  Languages,
  History,
} from 'lucide-react';
import { WordLookupResult, Question } from '../types';
import { playSpeech } from './AudioButton';

interface WordLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestion?: Question | null;
  onInsertWord?: (wordToInsert: string) => void;
}

export const WordLookupModal: React.FC<WordLookupModalProps> = ({
  isOpen,
  onClose,
  currentQuestion,
  onInsertWord,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WordLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_word_lookups');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [copied, setCopied] = useState(false);

  // Tách các từ/cụm từ gợi ý từ câu hỏi hiện tại để người học click tra nhanh
  const quickSuggestions = useMemo(() => {
    if (!currentQuestion) return [];
    const suggestions: string[] = [];

    // 1. Tách từ gợi ý hints (thường dạng "word = nghĩa; word2 = nghĩa2")
    if (currentQuestion.hints) {
      const parts = currentQuestion.hints.split(/[;,]/);
      for (const part of parts) {
        const sub = part.split('=');
        if (sub[0] && sub[0].trim()) {
          suggestions.push(sub[0].trim());
        }
        if (sub[1] && sub[1].trim()) {
          suggestions.push(sub[1].trim());
        }
      }
    }

    // Lọc trùng và giới hạn
    const unique = Array.from(new Set(suggestions.map((s) => s.trim()))).filter(
      (s) => s.length > 1 && s.length < 35
    );
    return unique.slice(0, 6);
  }, [currentQuestion]);

  // Reset khi mở modal hoặc đổi câu hỏi
  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Nếu chưa có từ tìm kiếm và có gợi ý đầu tiên, điền sẵn nhưng không tự động submit
      if (!searchInput && quickSuggestions.length > 0) {
        setSearchInput(quickSuggestions[0]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (wordToSearch?: string) => {
    const term = (wordToSearch !== undefined ? wordToSearch : searchInput).trim();
    if (!term) return;

    setIsLoading(true);
    setError(null);
    setSearchInput(term);

    try {
      const res = await fetch('/api/lookup-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: term,
          contextSentence: currentQuestion?.vi || '',
          category: currentQuestion?.category || 'general',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tra cứu từ vựng lúc này.');
      }

      setResult(data.data);

      // Lưu vào lịch sử tra cứu
      setRecentQueries((prev) => {
        const next = [term, ...prev.filter((q) => q.toLowerCase() !== term.toLowerCase())].slice(0, 8);
        try {
          localStorage.setItem('recent_word_lookups', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi kết nối với Trợ lý AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = (text: string) => {
    if (onInsertWord) {
      onInsertWord(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Đóng modal sau khi chèn để người dùng tiếp tục làm bài
      setTimeout(() => onClose(), 600);
    }
  };

  const handleOpenGoogleTranslate = (textToTranslate?: string) => {
    const term = textToTranslate || result?.query || searchInput || currentQuestion?.vi || '';
    const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(term)}&op=translate`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                Trợ Lý Từ Vựng AI
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 tracking-wider">
                  Gemini & Google Dịch
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tra cứu từ/cụm từ bám sát ngữ cảnh câu bạn đang làm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Câu ngữ cảnh đang làm bài */}
          {currentQuestion && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-start gap-2.5 text-slate-700">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-slate-900 block mb-0.5">
                  Ngữ cảnh câu đang dịch:
                </span>
                <p className="text-slate-600 italic line-clamp-2">"{currentQuestion.vi}"</p>
              </div>
            </div>
          )}

          {/* Ô tìm kiếm từ vựng */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="space-y-2"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập từ hoặc cụm từ bạn chưa biết (Việt hoặc Anh)..."
                className="w-full pl-10 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={isLoading || !searchInput.trim()}
                className="absolute right-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang dịch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tra từ</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Gợi ý tra nhanh từ các từ có sẵn trong câu */}
          {quickSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Bấm để tra nhanh từ trong câu:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLookup(item)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Search className="w-3 h-3 text-slate-400" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lỗi nếu có */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* KẾT QUẢ TRA CỨU TỪ TRỢ LÝ AI */}
          {result && (
            <div className="p-4 sm:p-5 bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl border border-indigo-200/90 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Từ tiếng Anh & Phát âm */}
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-indigo-100/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                      {result.bestMatch}
                    </span>
                    <button
                      type="button"
                      onClick={() => playSpeech(result.bestMatch)}
                      className="p-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors cursor-pointer"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {result.phonetic && (
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                        {result.phonetic}
                      </span>
                    )}
                    {result.partOfSpeech && (
                      <span className="text-[11px] font-semibold text-slate-500 italic">
                        ({result.partOfSpeech})
                      </span>
                    )}
                  </div>
                </div>

                {/* Nút hành động nhanh chèn từ vào câu */}
                {onInsertWord && (
                  <button
                    type="button"
                    onClick={() => handleInsert(result.bestMatch)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    title="Chèn từ này vào ô câu trả lời của bạn"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chèn!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chèn vào câu</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Nghĩa tiếng Việt & Giải thích ngữ cảnh */}
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-slate-900">
                  {result.meaningVi}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-100">
                  {result.explanation}
                </p>
              </div>

              {/* Câu ví dụ minh họa */}
              {result.exampleSentence?.en && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      Ví dụ ứng dụng:
                    </span>
                    <button
                      type="button"
                      onClick={() => playSpeech(result.exampleSentence!.en)}
                      className="text-amber-800 hover:text-amber-950 cursor-pointer p-0.5"
                      title="Nghe câu ví dụ"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-semibold text-slate-800">
                    "{result.exampleSentence.en}"
                  </p>
                  <p className="text-slate-600 italic">
                    → {result.exampleSentence.vi}
                  </p>
                </div>
              )}

              {/* Từ đồng nghĩa & Collocations nếu có */}
              {((result.synonyms && result.synonyms.length > 0) ||
                (result.collocations && result.collocations.length > 0)) && (
                <div className="space-y-2 pt-1">
                  {result.synonyms && result.synonyms.length > 0 && (
                    <div className="text-xs flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Đồng nghĩa:</span>
                      {result.synonyms.map((syn, sIdx) => (
                        <span
                          key={sIdx}
                          onClick={() => handleLookup(syn)}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer font-medium text-[11px]"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.collocations && result.collocations.length > 0 && (
                    <div className="text-xs flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Cụm hay gặp:</span>
                      {result.collocations.map((col, cIdx) => (
                        <span
                          key={cIdx}
                          onClick={() => handleLookup(col)}
                          className="px-2 py-0.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-indigo-800 hover:bg-indigo-100 cursor-pointer font-medium text-[11px]"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mẹo lưu ý (Tips) */}
              {result.usageTip && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-1.5">
                  <span className="font-bold text-indigo-700 shrink-0">💡 Lưu ý:</span>
                  <span>{result.usageTip}</span>
                </div>
              )}
            </div>
          )}

          {/* Lịch sử tra cứu gần đây */}
          {recentQueries.length > 0 && !result && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <History className="w-3 h-3" />
                <span>Từ đã tra gần đây:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentQueries.map((term, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLookup(term)}
                    className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Liên kết đối chiếu trực tiếp trên Google Dịch */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Muốn xem đối chiếu với Google Dịch?</span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenGoogleTranslate()}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-2xs hover:text-indigo-600 hover:border-indigo-200"
          >
            <span>Mở trên Google Dịch</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
