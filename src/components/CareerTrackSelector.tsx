import React from 'react';
import { CareerCategory, CareerTrackInfo, CAREER_TRACKS, Profile } from '../types';
import {
  MessageSquare,
  Code2,
  Briefcase,
  Hotel,
  Crown,
  Lock,
  Sparkles,
} from 'lucide-react';

interface CareerTrackSelectorProps {
  selectedCategory: CareerCategory;
  onSelectCategory: (category: CareerCategory) => void;
  profile: Profile | null;
  onOpenVipPrompt: (track: CareerTrackInfo) => void;
  questionCounts?: Record<CareerCategory, number>;
  tracks?: CareerTrackInfo[];
}

export const TRACK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Code2,
  Briefcase,
  Hotel,
};

export const CareerTrackSelector: React.FC<CareerTrackSelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  profile,
  onOpenVipPrompt,
  questionCounts,
  tracks = CAREER_TRACKS,
}) => {
  const isVip = profile?.is_vip ?? false;
  const isAdmin = profile?.email?.toLowerCase().trim() === 'hungpv2172002@gmail.com';
  const hasVipAccess = isVip || isAdmin;

  const handleTrackClick = (track: CareerTrackInfo) => {
    onSelectCategory(track.id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full overflow-hidden transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-0.5 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 shrink-0">
            <Crown className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="truncate">Chủ Đề Ngành Nghề Chuyên Sâu</span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs shrink-0">
                VIP
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block truncate">
              Lựa chọn nội dung dịch phù hợp với công việc thực tế của bạn
            </p>
          </div>
        </div>

        {hasVipAccess ? (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Đã mở khóa toàn bộ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
            <Lock className="w-3 h-3 text-amber-500" />
            3 ngành VIP
          </span>
        )}
      </div>

      {/* Grid danh sách 4 phân loại ngành nghề (2 cột gọn gàng trên di động) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-1 w-full min-w-0">
        {tracks.map((track) => {
          const isSelected = selectedCategory === track.id;
          const isLocked = track.isVipOnly && !hasVipAccess;
          const IconComponent = TRACK_ICONS[track.icon] || MessageSquare;
          const count = questionCounts ? questionCounts[track.id] : undefined;

          return (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
              onClick={() => handleTrackClick(track)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTrackClick(track);
                }
              }}
              className={`p-2.5 sm:p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-1.5 sm:gap-2.5 cursor-pointer select-none touch-press ${
                isSelected
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-600 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-xs'
                  : isLocked
                  ? 'bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isLocked
                      ? 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <IconComponent className="w-4.5 h-4.5" />
                </div>

                <div className="flex items-center gap-1">
                  {track.isVipOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVipPrompt(track);
                      }}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 cursor-pointer transition-all hover:scale-105 ${
                        hasVipAccess
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}
                      title={hasVipAccess ? 'Chuyên ngành VIP' : 'Bấm để xem thông tin gói VIP'}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>VIP</span>
                        </>
                      ) : (
                        <>
                          <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>VIP</span>
                        </>
                      )}
                    </button>
                  )}

                  {count !== undefined && count > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                      {count} câu
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4
                  className={`text-xs font-bold leading-tight ${
                    isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {track.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {track.description}
                </p>
              </div>

              {/* Dấu chấm active */}
              {isSelected && (
                <div className="w-full pt-1 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  <span>Đang luyện tập</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
