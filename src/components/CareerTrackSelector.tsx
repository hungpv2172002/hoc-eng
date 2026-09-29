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
}) => {
  const isVip = profile?.is_vip ?? false;
  const isAdmin = profile?.role === 'admin';
  const hasVipAccess = isVip || isAdmin;

  const handleTrackClick = (track: CareerTrackInfo) => {
    // Luôn luôn tự động chuyển các câu để làm liên quan đến ngành nghề ngay lập tức!
    onSelectCategory(track.id);
  };


  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
            <Crown className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Chủ Đề Ngành Nghề Chuyên Sâu</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                VIP Exclusive
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Lựa chọn nội dung dịch phù hợp với công việc thực tế của bạn
            </p>
          </div>
        </div>

        {hasVipAccess ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Đã mở khóa toàn bộ chuyên ngành
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3 text-amber-500" />
            3 ngành nghề độc quyền cho VIP
          </span>
        )}
      </div>

      {/* Grid danh sách 4 phân loại ngành nghề (2 cột gọn gàng trên di động) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
        {CAREER_TRACKS.map((track) => {
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
                  ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 ring-2 ring-indigo-200 shadow-xs'
                  : isLocked
                  ? 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200 text-slate-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isLocked
                      ? 'bg-amber-100/70 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
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
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                      title={hasVipAccess ? 'Chuyên ngành VIP' : 'Bấm để xem thông tin gói VIP'}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          <span>VIP</span>
                        </>
                      ) : (
                        <>
                          <Crown className="w-2.5 h-2.5 text-amber-600" />
                          <span>VIP</span>
                        </>
                      )}
                    </button>
                  )}

                  {count !== undefined && count > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {count} câu
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4
                  className={`text-xs font-bold leading-tight ${
                    isSelected ? 'text-indigo-900' : 'text-slate-800'
                  }`}
                >
                  {track.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                  {track.description}
                </p>
              </div>

              {/* Dấu chấm active */}
              {isSelected && (
                <div className="w-full pt-1 border-t border-indigo-200 flex items-center justify-between text-[10px] font-bold text-indigo-700">
                  <span>Đang luyện tập</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
