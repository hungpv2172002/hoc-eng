import React from 'react';
import { Profile, AppSettings } from '../types';
import { AppIcon } from './AppIcon';
import {
  Crown,
  ShieldCheck,
  LogIn,
  LogOut,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  profile: Profile | null;
  todayCount: number;
  currentView: 'study' | 'admin';
  onViewChange: (view: 'study' | 'admin') => void;
  onOpenAuth: () => void;
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
  onOpenGuide,
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onViewChange('study')}
            className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 transition-transform active:scale-95 cursor-pointer overflow-hidden shrink-0"
            title={appName}
          >
            <AppIcon icon={appIcon} type={appIconType} className="w-5 h-5 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1
                onClick={() => onViewChange('study')}
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:text-indigo-600 transition-colors truncate max-w-[160px] sm:max-w-[280px]"
                title={appName}
              >
                {appName}
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                VN ➔ EN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden xs:block truncate max-w-[240px] sm:max-w-[360px]">
              {appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Nút xem SQL & Mã Nguồn Next.js */}
          <button
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Xem file SQL và hướng dẫn mã nguồn Next.js"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Mã nguồn & SQL</span>
          </button>

          {/* Quick AI Question Generator Button */}
          {onQuickAiGenerate && (
            <button
              onClick={() => onQuickAiGenerate()}
              disabled={isAiGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
              {/* Nút vào trang Admin (nếu là Admin) */}
              {isAdmin && (
                <button
                  onClick={() => onViewChange(currentView === 'admin' ? 'study' : 'admin')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    currentView === 'admin'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                  }`}
                  title="Chuyển đổi giao diện Quản trị"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {currentView === 'admin' ? 'Về phòng học' : 'Quản trị'}
                  </span>
                </button>
              )}

              {/* Huy hiệu VIP hoặc bộ đếm câu hôm nay */}
              <div className="flex items-center">
                {isVip ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shadow-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>VIP</span>
                  </span>
                ) : (
                  <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
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
                className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                title="Bấm để xem và sửa thông tin hồ sơ"
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
                <span className="text-xs font-semibold text-slate-800 max-w-[80px] sm:max-w-[120px] truncate hidden xs:inline">
                  {profile.full_name || 'Học viên'}
                </span>
              </button>

              {/* Nút Đăng xuất */}
              <button
                onClick={onSignOut}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Nút Đăng nhập */
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập OTP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
