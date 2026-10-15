import React, { useState, useRef, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Profile, Badge } from '../types';
import {
  X,
  User,
  Check,
  AlertCircle,
  RefreshCw,
  Camera,
  Sun,
  Moon,
  Award,
  Trophy,
  Flame,
  Swords,
  BookOpen,
  Lock,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { getUserStats, calculateBadges } from '../lib/badgeSystem';
import { playCriticalSound } from '../lib/soundFx';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdated: (updated: Profile) => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: (mode: 'light' | 'dark') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  themeMode = 'light',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'profile'>('badges');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lấy dữ liệu thống kê & huy hiệu của học viên
  const stats = useMemo(() => getUserStats(profile?.email), [profile?.email, isOpen]);
  const badges = useMemo(() => calculateBadges(stats), [stats]);

  const unlockedCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return badges.filter((b) => b.isUnlocked);
    if (badgeFilter === 'locked') return badges.filter((b) => !b.isUnlocked);
    return badges;
  }, [badges, badgeFilter]);

  if (!isOpen || !profile) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh tối đa là 3MB.');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    try {
      if (isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setAvatarUrl(data.publicUrl);
        setSuccessMsg('Tải ảnh đại diện lên Supabase Storage thành công!');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAvatarUrl(event.target.result as string);
            setSuccessMsg('Đã chọn ảnh đại diện thành công!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải ảnh lên Storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const updated: Profile = {
        ...profile,
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      };

      if (!isSupabaseConfigured) throw new Error('Chưa kết nối database. Hồ sơ chưa được lưu.');
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updated.full_name,
            avatar_url: updated.avatar_url,
          })
          .eq('id', profile.id).select('id').single();

        if (error) throw error;
      }

      onProfileUpdated(updated);
      setSuccessMsg('Lưu hồ sơ thành công!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return (
          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-black uppercase tracking-wider">
            Huyền Thoại 👑
          </span>
        );
      case 'epic':
        return (
          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 text-[10px] font-black uppercase tracking-wider">
            Sử Thi 🔥
          </span>
        );
      case 'rare':
        return (
          <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-[10px] font-black uppercase tracking-wider">
            Hiếm ⚔️
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
            Thường 🌱
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-800 dark:text-slate-100 transition-colors">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Profile */}
        <div className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3.5 shrink-0">
          <div className="relative shrink-0">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl ring-3 ring-indigo-500 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            {profile.is_vip && (
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] uppercase shadow-xs">
                VIP
              </span>
            )}
          </div>

          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {profile.full_name || 'Học viên'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                {profile.role === 'admin' ? '🛡️ Quản trị viên' : 'Học viên'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {profile.email}
            </p>
          </div>
        </div>

        {/* Tabs chuyển đổi giữa "Huy hiệu & Thành tích" và "Hồ sơ & Thiết lập" */}
        <div className="px-5 sm:px-6 pt-3 shrink-0">
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'badges'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Huy hiệu & Thành tích</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px]">
                {unlockedCount}/{badges.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Hồ sơ & Thiết lập</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỪNG TAB */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* TAB 1: BỘ SƯU TẬP HUY HIỆU (BADGES) */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              {/* Thẻ Thống kê thành tích nổi bật */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/60 text-center">
                  <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1 animate-pulse" />
                  <div className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-300">
                    {stats.consecutiveDays} ngày
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Chuỗi học liên tục
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-200/80 dark:border-rose-900/60 text-center">
                  <Swords className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-black text-rose-900 dark:text-rose-300">
                    {stats.duelWins} trận
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Thắng Đấu 1v1
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-950/30 dark:to-cyan-950/20 border border-indigo-200/80 dark:border-indigo-900/60 text-center">
                  <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-black text-indigo-900 dark:text-indigo-300">
                    {stats.totalQuestionsCompleted} câu
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    Đã hoàn thành
                  </span>
                </div>
              </div>

              {/* Bộ lọc huy hiệu */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bộ sưu tập Huy hiệu ({unlockedCount}/{badges.length}):
                </span>
                <div className="flex gap-1 text-[11px] font-bold">
                  {(['all', 'unlocked', 'locked'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setBadgeFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        badgeFilter === filter
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {filter === 'all'
                        ? 'Tất cả'
                        : filter === 'unlocked'
                        ? 'Đã mở khóa'
                        : 'Chưa mở'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh sách thẻ Huy hiệu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBadges.map((badge) => {
                  const percentage = Math.min(
                    100,
                    Math.round((badge.currentValue / badge.targetValue) * 100)
                  );

                  return (
                    <div
                      key={badge.id}
                      onClick={() => {
                        playCriticalSound();
                        setSelectedBadge(badge);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2.5 ${
                        badge.isUnlocked
                          ? 'bg-gradient-to-br from-white via-indigo-50/30 to-amber-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/40 border-amber-300/80 dark:border-amber-600/60 shadow-xs hover:border-amber-400'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Huy hiệu rực rỡ nếu đã mở */}
                      {badge.isUnlocked && (
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full pointer-events-none" />
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 ${
                            badge.isUnlocked
                              ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-400/70'
                              : 'bg-slate-200 dark:bg-slate-700/80 grayscale'
                          }`}
                        >
                          {badge.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                              {badge.name}
                            </span>
                            {getRarityBadge(badge.rarity)}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      {/* Thanh tiến độ đạt huy hiệu */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span
                            className={
                              badge.isUnlocked
                                ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1'
                                : 'text-slate-500 dark:text-slate-400 flex items-center gap-1'
                            }
                          >
                            {badge.isUnlocked ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã hoàn thành!</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>
                                  Tiến độ: {badge.currentValue}/{badge.targetValue}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-mono">
                            {percentage}%
                          </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              badge.isUnlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: HỒ SƠ & THIẾT LẬP */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                {/* Thay đổi Avatar */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full ring-4 ring-indigo-50 dark:ring-indigo-950 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-400" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer disabled:opacity-60"
                      title="Thay đổi ảnh đại diện"
                    >
                      {uploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Tải lên ảnh PNG, JPG (tối đa 3MB)
                  </p>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Email tài khoản
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.email}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed font-mono"
                  />
                </div>

                {/* Tên hiển thị */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Tên hiển thị
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ và tên..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-hidden transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Giao diện Sáng / Tối */}
                {onToggleTheme && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Giao diện hiển thị (Theme)
                      </label>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400">
                        {themeMode === 'dark' ? 'Đang bật Tối hoàn toàn 🌙' : 'Đang bật Sáng ☀️'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleTheme('light')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          themeMode === 'light'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Sun
                          className={`w-4 h-4 ${
                            themeMode === 'light'
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>Giao diện Sáng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleTheme('dark')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          themeMode === 'dark'
                            ? 'bg-slate-950 border-indigo-500 text-white ring-2 ring-indigo-400/50 shadow-md shadow-indigo-950/80'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Moon
                          className={`w-4 h-4 ${
                            themeMode === 'dark' ? 'text-cyan-400 fill-cyan-400' : 'text-slate-400'
                          }`}
                        />
                        <span>Tối hoàn toàn</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Nút lưu */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md hover:shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
