import React from 'react';
import { Profile, AppSettings } from '../types';
import { AppIcon } from './AppIcon';
import {
  Crown,
  ShieldCheck,
  LogIn,
  LogOut,
  UserPlus,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  profile: Profile | null;
  todayCount: number;
  currentView: 'study' | 'admin' | 'battle';
  onViewChange: (view: 'study' | 'admin' | 'battle') => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenGuide: () => void;
  onSignOut: () => void;
  onQuickAiGenerate?: () => void;
  isAiGenerating?: boolean;
  settings?: AppSettings;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  todayCount,
  currentView,
  onViewChange,
  onOpenAuth,
  onOpenProfile,
  onOpenGuide: _onOpenGuide,
  onSignOut,
  onQuickAiGenerate,
  isAiGenerating,
  settings,
}) => {
  const isVip = profile?.is_vip ?? false;
  const isAdmin = profile?.role === 'admin';

  const appName = settings?.appName || 'Daily Translation';
  const appSubtitle = settings?.appSubtitle || 'Dịch câu mỗi ngày kèm từ vựng gợi ý';
  const appIcon = settings?.appIcon || 'BookOpen';
  const appIconType = settings?.appIconType || 'lucide';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-3 shadow-xs w-full max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <button
            onClick={() => onViewChange('study')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 transition-transform active:scale-95 cursor-pointer overflow-hidden shrink-0"
            title={appName}
          >
            <AppIcon icon={appIcon} type={appIconType} className="w-5 h-5 text-white" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1
                onClick={() => onViewChange('study')}
                className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:text-indigo-600 transition-colors truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[280px]"
                title={appName}
              >
                {appName}
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                VN ➔ EN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-[260px] sm:max-w-[360px]">
              {appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Nút Chế độ Đấu Boss (Tháp Ma Vương) */}
          <button
            onClick={() => onViewChange(currentView === 'battle' ? 'study' : 'battle')}
            className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95 shrink-0 ${
              currentView === 'battle'
                ? 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white border-amber-400 shadow-xs shadow-rose-200'
            }`}
            title={currentView === 'battle' ? 'Trở về phòng học' : 'Thử thách Tháp Ma Vương'}
          >
            <span className="text-xs sm:text-sm leading-none">⚔️</span>
            <span className="text-[11px] sm:text-xs font-black whitespace-nowrap">
              {currentView === 'battle' ? 'Phòng học' : 'Đấu Boss'}
            </span>
          </button>

          {/* Quick AI Question Generator Button (chỉ hiển thị khi đã đăng nhập hoặc là admin) */}
          {onQuickAiGenerate && isAdmin && (
            <button
              onClick={() => onQuickAiGenerate()}
              disabled={isAiGenerating}
              className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              title="Kích hoạt Gemini AI sinh 10 câu mới"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {isAiGenerating ? 'AI đang tạo...' : 'Sinh câu AI'}
              </span>
            </button>
          )}

          {profile ? (
            <>
              {/* Nút vào trang Quản trị (Chỉ dành riêng cho Admin hungpv2172002@gmail.com) */}
              {isAdmin && (
                <button
                  onClick={() => onViewChange(currentView === 'admin' ? 'study' : 'admin')}
                  className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                    currentView === 'admin'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                  }`}
                  title="Chuyển đổi giao diện Quản trị"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {currentView === 'admin' ? 'Học' : 'Quản trị'}
                  </span>
                </button>
              )}

              {/* Huy hiệu VIP hoặc bộ đếm câu hôm nay */}
              <div className="flex items-center shrink-0">
                {isVip ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] sm:text-xs border border-amber-300 shadow-xs">
                    <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>VIP</span>
                  </span>
                ) : (
                  <div className="px-2 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] sm:text-xs border border-slate-200">
                    <span className="hidden sm:inline">Hôm nay: </span>
                    <strong className={todayCount >= 30 ? 'text-rose-600' : 'text-indigo-600'}>
                      {todayCount}/30
                    </strong>
                  </div>
                )}
              </div>

              {/* Nút Avatar & Tên (Mở Profile modal) */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1 p-0.5 sm:p-1 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer shrink-0"
                title="Bấm để xem và sửa thông tin hồ sơ"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center overflow-hidden ring-2 ring-indigo-200 shrink-0">
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
                <span className="text-xs font-semibold text-slate-800 max-w-[70px] sm:max-w-[120px] truncate hidden md:inline">
                  {profile.full_name || 'Học viên'}
                </span>
              </button>

              {/* Nút Đăng xuất */}
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Khi chưa đăng nhập: 2 nút nhỏ gọn không làm tràn ngang */
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xs:inline">Đăng nhập</span>
                <span className="xs:hidden">Vào</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-indigo-200 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng ký</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
