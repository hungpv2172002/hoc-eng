import React from 'react';
import { CEFRLevel, CEFR_LEVELS } from '../types';
import { Layers, CheckCircle2 } from 'lucide-react';

interface LevelSelectorProps {
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
  levelCounts?: Record<CEFRLevel, number>;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  selectedLevel,
  onSelectLevel,
  levelCounts,
}) => {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5 w-full min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider min-w-0">
          <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </span>
          <span className="truncate">Chọn Trình Độ Luyện Dịch</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block shrink-0">
          Tự động lọc câu hỏi theo năng lực của bạn
        </span>
      </div>

      {/* Grid các nút chọn trình độ CEFR */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 w-full min-w-0">
        {CEFR_LEVELS.map((lvl) => {
          const isSelected = selectedLevel === lvl.id;
          const count = levelCounts ? levelCounts[lvl.id] : undefined;

          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => onSelectLevel(lvl.id)}
              className={`relative flex flex-col items-center justify-center p-2 sm:py-2.5 sm:px-2 rounded-xl border text-center transition-all cursor-pointer select-none touch-press ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200 -translate-y-0.5'
                  : 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-700 border-slate-200/80 hover:border-slate-300'
              }`}
              title={`${lvl.code} - ${lvl.name}: ${lvl.desc}`}
            >
              {isSelected && (
                <CheckCircle2 className="w-3 h-3 text-white absolute top-1 right-1 sm:top-1.5 sm:right-1.5" />
              )}
              <span
                className={`text-xs sm:text-sm font-extrabold font-mono leading-none ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {lvl.code}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-medium line-clamp-1 ${
                  isSelected ? 'text-indigo-100' : 'text-slate-500'
                }`}
              >
                {lvl.name}
              </span>

              {count !== undefined && (
                <span
                  className={`text-[9px] font-semibold mt-1 px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {count} câu
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
