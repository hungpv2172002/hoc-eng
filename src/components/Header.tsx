import React from 'react';
import { Profile, AppSettings } from '../types';
import { AppIcon } from './AppIcon';
import {
  Crown,
  ShieldCheck,
  LogIn,
  LogOut,
  UserPlus,
  Users,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  profile: Profile | null;
  todayCount: number;
  currentView: 'study' | 'admin' | 'battle' | 'duel';
  onViewChange: (view: 'study' | 'admin' | 'battle' | 'duel') => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenGuide: () => void;
  onOpenFriends?: () => void;
  friendsCount?: number;
  onSignOut: () => void;
  onQuickAiGenerate?: () => void;
  isAiGenerating?: boolean;
  settings?: AppSettings;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: (mode?: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  todayCount,
  currentView,
  onViewChange,
  onOpenAuth,
  onOpenProfile,
  onOpenGuide: _onOpenGuide,
  onOpenFriends,
  friendsCount,
  onSignOut,
  onQuickAiGenerate,
  isAiGenerating,
  settings,
  themeMode = 'light',
  onToggleTheme,
}) => {
  const isVip = profile?.is_vip ?? false;
  const isAdmin = profile?.email?.toLowerCase().trim() === 'hungpv2172002@gmail.com';

  const appName = settings?.appName || 'Daily Translation';
  const appSubtitle = settings?.appSubtitle || 'Dịch câu mỗi ngày kèm từ vựng gợi ý';
  const appIcon = settings?.appIcon || 'BookOpen';
  const appIconType = settings?.appIconType || 'lucide';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-2.5 sm:py-3 shadow-xs w-full max-w-full transition-colors">
      <div className="app-container px-3 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <button
            onClick={() => onViewChange('study')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 dark:shadow-none transition-transform active:scale-95 cursor-pointer overflow-hidden shrink-0"
            title={appName}
          >
            <AppIcon icon={appIcon} type={appIconType} className="w-5 h-5 text-white" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1
                onClick={() => onViewChange('study')}
                className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[280px]"
                title={appName}
              >
                {appName}
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                VN ➔ EN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[260px] sm:max-w-[360px]">
              {appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Nút Chế độ Đấu 1v1 Song Song Trực Tuyến */}
          <button
            onClick={() => onViewChange(currentView === 'duel' ? 'study' : 'duel')}
            className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95 shrink-0 ${
              currentView === 'duel'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white border-indigo-400 shadow-xs'
            }`}
            title={currentView === 'duel' ? 'Trở về phòng học' : 'Đấu Trường Dịch 1v1 Song Song Trực Tuyến'}
          >
            <span className="text-xs sm:text-sm leading-none animate-pulse">⚡</span>
            <span className="text-[11px] sm:text-xs font-black whitespace-nowrap">
              {currentView === 'duel' ? 'Phòng học' : 'Đấu 1v1'}
            </span>
            <span className="hidden xs:inline-block text-[8px] font-black uppercase px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-2xs animate-pulse">
              LIVE
            </span>
          </button>

          {/* Nút Chế độ Đấu Boss (Tháp Ma Vương) */}
          <button
            onClick={() => onViewChange(currentView === 'battle' ? 'study' : 'battle')}
            className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95 shrink-0 ${
              currentView === 'battle'
                ? 'bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white border-amber-400 shadow-xs shadow-rose-200 dark:shadow-none'
            }`}
            title={currentView === 'battle' ? 'Trở về phòng học' : 'Thử thách Tháp Ma Vương'}
          >
            <span className="text-xs sm:text-sm leading-none">⚔️</span>
            <span className="text-[11px] sm:text-xs font-black whitespace-nowrap">
              {currentView === 'battle' ? 'Phòng học' : 'Đấu Boss'}
            </span>
          </button>

          {/* Nút vào trang Quản trị riêng (Chỉ hiển thị khi đăng nhập đúng email Admin hungpv2172002@gmail.com) */}
          {isAdmin && (
            <button
              onClick={() => onViewChange(currentView === 'admin' ? 'study' : 'admin')}
              className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                currentView === 'admin'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}
              title="Trang quản lý riêng: Sửa giao diện trang, Quản lý tài khoản & Quản lý khách hàng"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">
                {currentView === 'admin' ? 'Phòng học' : 'Quản lý'}
              </span>
            </button>
          )}

          {/* Quick AI Question Generator Button (chỉ hiển thị khi là admin) */}
          {onQuickAiGenerate && isAdmin && (
            <button
              onClick={() => onQuickAiGenerate()}
              disabled={isAiGenerating}
              className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              title="Kích hoạt Gemini AI sinh 10 câu mới"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {isAiGenerating ? 'AI đang tạo...' : 'Sinh câu AI'}
              </span>
            </button>
          )}

          {/* NÚT DANH SÁCH BẠN BÈ & KẾT BẠN QUA GMAIL */}
          {onOpenFriends && (
            <button
              type="button"
              onClick={onOpenFriends}
              className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95"
              title="Danh sách bạn bè & Thách đấu bằng Gmail"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Bạn bè</span>
              {friendsCount !== undefined && friendsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-black text-[10px]">
                  {friendsCount}
                </span>
              )}
            </button>
          )}

          {/* NÚT CHUYỂN ĐỔI GIAO DIỆN SÁNG / TỐI NHANH TRÊN HEADER */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={() => onToggleTheme()}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shrink-0"
              title={themeMode === 'dark' ? 'Chuyển sang giao diện Sáng ☀️' : 'Chuyển sang giao diện Tối hoàn toàn 🌙'}
              aria-label="Chuyển đổi giao diện sáng tối"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 fill-slate-700" />
              )}
            </button>
          )}

          {profile ? (
            <>
              {/* Huy hiệu VIP hoặc bộ đếm câu hôm nay */}
              <div className="flex items-center shrink-0">
                {isVip ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 font-bold text-[11px] sm:text-xs border border-amber-300 dark:border-amber-700 shadow-xs">
                    <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>VIP</span>
                  </span>
                ) : (
                  <div className="px-2 py-0.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] sm:text-xs border border-slate-200 dark:border-slate-700">
                    <span className="hidden sm:inline">Hôm nay: </span>
                    <strong className={todayCount >= 30 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}>
                      {todayCount}/30
                    </strong>
                  </div>
                )}
              </div>

              {/* Nút Avatar & Tên (Mở Profile modal) */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1 p-0.5 sm:p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer shrink-0"
                title="Bấm để xem và sửa thông tin hồ sơ & thiết lập giao diện"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center overflow-hidden ring-2 ring-indigo-200 dark:ring-indigo-800 shrink-0">
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
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[70px] sm:max-w-[120px] truncate hidden md:inline">
                  {profile.full_name || 'Học viên'}
                </span>
              </button>

              {/* Nút Đăng xuất */}
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Khi chưa đăng nhập */
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden xs:inline">Đăng nhập</span>
                <span className="xs:hidden">Vào</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
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
