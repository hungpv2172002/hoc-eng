import React, { useState, useEffect } from 'react';
import { Profile, AppSettings } from '../types';
import { AppIcon, PRESET_ICONS, PRESET_EMOJIS } from './AppIcon';
import { FooterContact } from './FooterContact';
import {
  ShieldCheck,
  Search,
  Crown,
  UserCheck,
  UserX,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ArrowLeft,
  Settings,
  Save,
  Palette,
  FileCode,
  Mail,
  Facebook,
  Music2,
  ExternalLink,
} from 'lucide-react';

interface AdminViewProps {
  currentUser: Profile | null;
  profiles: Profile[];
  onToggleVip: (user: Profile) => Promise<void>;
  onBackToStudy: () => void;
  onAiGenerateQuestions: (category?: string) => Promise<void>;
  isGeneratingAi: boolean;
  settings?: AppSettings;
  onSaveSettings?: (newSettings: AppSettings) => Promise<void>;
  onOpenGuide?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  profiles,
  onToggleVip,
  onBackToStudy,
  onAiGenerateQuestions,
  isGeneratingAi,
  settings,
  onSaveSettings,
  onOpenGuide,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedGenCategory, setSelectedGenCategory] = useState<string>('general');

  // Form cài đặt tên & icon app
  const [appNameInput, setAppNameInput] = useState(settings?.appName || 'Daily Translation');
  const [appSubtitleInput, setAppSubtitleInput] = useState(settings?.appSubtitle || 'Dịch câu mỗi ngày kèm từ vựng gợi ý');
  const [selectedIcon, setSelectedIcon] = useState(settings?.appIcon || 'BookOpen');
  const [iconType, setIconType] = useState<'lucide' | 'emoji'>(settings?.appIconType || 'lucide');
  const [customEmoji, setCustomEmoji] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form cài đặt Kênh liên hệ dưới chân trang (Email, Facebook, TikTok)
  const [contactEmailInput, setContactEmailInput] = useState(
    settings?.contactEmail || 'hungpv2172002@gmail.com'
  );
  const [contactFacebookInput, setContactFacebookInput] = useState(
    settings?.contactFacebook || 'https://facebook.com'
  );
  const [contactTiktokInput, setContactTiktokInput] = useState(
    settings?.contactTiktok || 'https://tiktok.com'
  );
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Cập nhật giá trị khi props settings thay đổi
  useEffect(() => {
    if (settings) {
      if (settings.appName) setAppNameInput(settings.appName);
      if (settings.appSubtitle !== undefined) setAppSubtitleInput(settings.appSubtitle);
      if (settings.appIcon) setSelectedIcon(settings.appIcon);
      if (settings.appIconType) setIconType(settings.appIconType);
      if (settings.contactEmail !== undefined) setContactEmailInput(settings.contactEmail);
      if (settings.contactFacebook !== undefined) setContactFacebookInput(settings.contactFacebook);
      if (settings.contactTiktok !== undefined) setContactTiktokInput(settings.contactTiktok);
    }
  }, [settings]);

  const isAdmin = currentUser?.role === 'admin';

  const handleToggle = async (user: Profile) => {
    setUpdatingId(user.id);
    try {
      await onToggleVip(user);
      setToast({
        type: 'success',
        text: `Đã ${user.is_vip ? 'hạ xuống thường' : 'nâng cấp VIP'} cho học viên ${
          user.full_name || user.email
        }!`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.message || 'Lỗi khi cập nhật trạng thái VIP.',
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNameInput.trim()) {
      setToast({ type: 'error', text: 'Tên ứng dụng không được để trống!' });
      return;
    }

    setIsSavingSettings(true);
    const newSettings: AppSettings = {
      appName: appNameInput.trim(),
      appSubtitle: appSubtitleInput.trim(),
      appIcon: selectedIcon,
      appIconType: iconType,
      contactEmail: contactEmailInput.trim(),
      contactFacebook: contactFacebookInput.trim(),
      contactTiktok: contactTiktokInput.trim(),
    };

    try {
      if (onSaveSettings) {
        await onSaveSettings(newSettings);
      } else {
        // Gọi trực tiếp API nếu không có prop callback
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
        if (!res.ok) throw new Error('Lỗi khi lưu cài đặt');
      }

      setToast({
        type: 'success',
        text: `Đã lưu thành công! Tên ứng dụng đổi thành "${newSettings.appName}".`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.message || 'Không thể lưu cài đặt thương hiệu.',
      });
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContacts(true);

    const newSettings: AppSettings = {
      appName: appNameInput.trim() || settings?.appName || 'Daily Translation',
      appSubtitle: appSubtitleInput.trim() || settings?.appSubtitle || '',
      appIcon: selectedIcon || settings?.appIcon || 'BookOpen',
      appIconType: iconType || settings?.appIconType || 'lucide',
      contactEmail: contactEmailInput.trim(),
      contactFacebook: contactFacebookInput.trim(),
      contactTiktok: contactTiktokInput.trim(),
    };

    try {
      if (onSaveSettings) {
        await onSaveSettings(newSettings);
      } else {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
        if (!res.ok) throw new Error('Lỗi khi lưu cài đặt liên hệ');
      }

      setToast({
        type: 'success',
        text: 'Đã lưu thành công thông tin liên hệ (Email, Facebook, TikTok)!',
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.message || 'Không thể lưu cài đặt liên hệ.',
      });
    } finally {
      setIsSavingContacts(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  if (!isAdmin) {

    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-rose-200 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Truy cập bị từ chối</h2>
        <p className="text-sm text-slate-600">
          Chỉ tài khoản có vai trò <strong className="text-purple-700">role = 'admin'</strong> mới được phép truy cập trang quản trị này.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={onBackToStudy}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
          >
            Quay lại phòng học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{toast.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStudy}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Quay lại phòng học"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Bảng Quản Trị Học Viên & VIP</h2>
            </div>
            <p className="text-xs text-slate-500">
              Quản trị viên: <strong className="text-purple-700">{currentUser.email}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Xem mã nguồn & file SQL Supabase"
            >
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Mã SQL Supabase</span>
            </button>
          )}
          <button
            onClick={onBackToStudy}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Vào phòng học
          </button>
        </div>
      </div>

      {/* BANNER CÀI ĐẶT THƯƠNG HIỆU: TÊN ỨNG DỤNG & BIỂU TƯỢNG (ICON) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Palette className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Tùy chỉnh Tên & Biểu tượng (Icon) Ứng dụng
              </h3>
              <p className="text-xs text-slate-500">
                Thay đổi thương hiệu hiển thị trên thanh tiêu đề, favicon và toàn bộ ứng dụng
              </p>
            </div>
          </div>

          {/* Live Header Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 max-w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xem trước:</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <AppIcon icon={selectedIcon} type={iconType} className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                {appNameInput || 'Tên ứng dụng'}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {appSubtitleInput || 'Khẩu hiệu'}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveBranding} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tên ứng dụng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Tên ứng dụng:
              </label>
              <input
                type="text"
                value={appNameInput}
                onChange={(e) => setAppNameInput(e.target.value)}
                placeholder="VD: Daily Translation, Luyện Dịch Mỗi Ngày..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-medium"
                required
              />
            </div>

            {/* Khẩu hiệu / Subtitle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Mô tả phụ / Khẩu hiệu:
              </label>
              <input
                type="text"
                value={appSubtitleInput}
                onChange={(e) => setAppSubtitleInput(e.target.value)}
                placeholder="VD: Dịch câu mỗi ngày kèm từ vựng gợi ý..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Chọn Biểu tượng (Icon) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Chọn Biểu tượng (Icon) hoặc Emoji:
              </label>
              <span className="text-[11px] text-slate-400">
                Đang chọn: <strong className="text-indigo-600">{selectedIcon}</strong> ({iconType})
              </span>
            </div>

            {/* Các icon Lucide phổ biến */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                1. Biểu tượng vector hiện đại (Lucide Icons):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                {PRESET_ICONS.map((item) => {
                  const isSelected = iconType === 'lucide' && selectedIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(item.id);
                        setIconType('lucide');
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-600 ring-2 ring-indigo-200 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                      title={item.label}
                    >
                      <AppIcon icon={item.id} type="lucide" className="w-5 h-5" />
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {item.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Các Emoji gợi ý */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                2. Hoặc chọn Emoji ngộ nghĩnh:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_EMOJIS.map((emoji) => {
                  const isSelected = iconType === 'emoji' && selectedIcon === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(emoji);
                        setIconType('emoji');
                      }}
                      className={`w-10 h-10 rounded-xl border text-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-200 shadow-xs scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tùy chỉnh emoji tự gõ */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Hoặc gõ emoji / icon bất kỳ vào đây..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-indigo-600 outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (customEmoji.trim()) {
                    setSelectedIcon(customEmoji.trim());
                    setIconType('emoji');
                  }
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Áp dụng Icon này
              </button>
            </div>
          </div>

          {/* Nút lưu */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi Tên & Biểu Tượng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BANNER CÀI ĐẶT KÊNH LIÊN HỆ: EMAIL, FACEBOOK, TIKTOK */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Tùy chỉnh Kênh Liên Hệ (Email, Facebook, TikTok)
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý các biểu tượng liên hệ xuất hiện ở chân trang (Footer) của người học
              </p>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 max-w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xem trước chân trang:</span>
            <FooterContact
              email={contactEmailInput}
              facebookUrl={contactFacebookInput}
              tiktokUrl={contactTiktokInput}
            />
          </div>
        </div>

        <form onSubmit={handleSaveContacts} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. EMAIL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-rose-500" />
                  <span>Địa chỉ Email liên hệ</span>
                </label>
                {contactEmailInput.trim() && (
                  <a
                    href={`mailto:${contactEmailInput.trim()}`}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-0.5 font-medium"
                    title="Thử mở trình gửi email"
                  >
                    <span>Thử gửi</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="email"
                value={contactEmailInput}
                onChange={(e) => setContactEmailInput(e.target.value)}
                placeholder="ví dụ: hungpv2172002@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-rose-500 outline-hidden transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Khi học viên bấm icon Email ở chân trang, hệ thống sẽ mở trình gửi thư tới địa chỉ này.
              </p>
            </div>

            {/* 2. FACEBOOK */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đường dẫn Facebook</span>
                </label>
                {contactFacebookInput.trim() && (
                  <a
                    href={
                      contactFacebookInput.startsWith('http')
                        ? contactFacebookInput
                        : `https://${contactFacebookInput}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 font-medium"
                    title="Thử mở liên kết Facebook"
                  >
                    <span>Mở thử</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={contactFacebookInput}
                onChange={(e) => setContactFacebookInput(e.target.value)}
                placeholder="ví dụ: https://facebook.com/your-fanpage"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-blue-500 outline-hidden transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Link fanpage, nhóm hoặc trang cá nhân hỗ trợ giải đáp thắc mắc dịch thuật.
              </p>
            </div>

            {/* 3. TIKTOK */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5 text-slate-900" />
                  <span>Đường dẫn TikTok</span>
                </label>
                {contactTiktokInput.trim() && (
                  <a
                    href={
                      contactTiktokInput.startsWith('http')
                        ? contactTiktokInput
                        : `https://${contactTiktokInput}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-800 hover:text-slate-950 hover:underline flex items-center gap-0.5 font-medium"
                    title="Thử mở liên kết TikTok"
                  >
                    <span>Mở thử</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={contactTiktokInput}
                onChange={(e) => setContactTiktokInput(e.target.value)}
                placeholder="ví dụ: https://tiktok.com/@dailytranslation"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-slate-800 outline-hidden transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Kênh TikTok chia sẻ mẹo ngữ pháp, video phát âm và dịch câu tiếng Anh.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSavingContacts}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-100 hover:shadow-rose-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSavingContacts ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Kênh Liên Hệ (Footer)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BANNER GEMINI AI CRON GENERATOR */}

      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-700/80 text-indigo-200 text-[11px] font-bold tracking-wider uppercase border border-indigo-500/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Gemini AI Engine (gemini-2.5-flash)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold">
              Tự động sinh 10 câu dịch mới bằng Gemini AI
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              API <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">/api/cron/generate</code> tự động yêu cầu Gemini AI sáng tạo câu tiếng Việt kèm từ vựng gợi ý và mảng đáp án tiếng Anh tương đương nạp vào database.
            </p>

            {/* Lựa chọn chuyên ngành muốn sinh câu */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-indigo-300 font-semibold mr-1">Chủ đề tạo:</span>
              {[
                { id: 'general', label: 'Giao tiếp chung' },
                { id: 'it', label: '💻 IT & Lập trình (VIP)' },
                { id: 'business', label: '💼 Kinh doanh & Sales (VIP)' },
                { id: 'hospitality', label: '🏨 Khách sạn & Du lịch (VIP)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedGenCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedGenCategory === cat.id
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'bg-indigo-800/80 hover:bg-indigo-700/80 text-indigo-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onAiGenerateQuestions(selectedGenCategory)}
            disabled={isGeneratingAi}
            className="px-5 py-3 bg-white hover:bg-indigo-50 disabled:opacity-60 text-indigo-950 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer text-sm"
          >
            {isGeneratingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Đang sinh 10 câu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Kích hoạt sinh 10 câu</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* THANH TÌM KIẾM HỌC VIÊN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo Gmail hoặc Tên học viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden text-sm shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium px-1">
          <span>
            Tổng học viên: <strong className="text-slate-900">{profiles.length}</strong>
          </span>
          <span>•</span>
          <span>
            Thành viên VIP: <strong className="text-amber-600">{profiles.filter((p) => p.is_vip).length}</strong>
          </span>
        </div>
      </div>

      {/* BẢNG DANH SÁCH HỌC VIÊN */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Học viên</th>
                <th className="py-3.5 px-4">Gmail</th>
                <th className="py-3.5 px-4">Ngày đăng ký</th>
                <th className="py-3.5 px-4">Vai trò (Role)</th>
                <th className="py-3.5 px-4">Trạng thái VIP</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Thao tác Toggle VIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    Không tìm thấy học viên nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Avatar & Tên */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {user.full_name || 'Chưa đặt tên'}
                          </p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {user.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Gmail */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-700">
                      {user.email}
                    </td>

                    {/* Ngày đăng ký */}
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Trạng thái VIP */}
                    <td className="py-4 px-4">
                      {user.is_vip ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                          <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>VIP MEMBER</span>
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          Thành viên Thường
                        </span>
                      )}
                    </td>

                    {/* Nút Toggle VIP 1 click */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={updatingId === user.id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
                          user.is_vip
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                        } disabled:opacity-50`}
                        title={user.is_vip ? 'Hạ xuống thành viên thường' : 'Nâng cấp lên VIP không giới hạn'}
                      >
                        {updatingId === user.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : user.is_vip ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Hạ VIP</span>
                          </>
                        ) : (
                          <>
                            <Crown className="w-3.5 h-3.5" />
                            <span>Cấp VIP</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
