import React, { useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Profile } from '../types';
import { X, User, Check, AlertCircle, RefreshCw, Camera } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdated: (updated: Profile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Fallback đọc dạng data URL để xem trước ngay lập tức
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

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updated.full_name,
            avatar_url: updated.avatar_url,
          })
          .eq('id', profile.id);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-3.5 right-3.5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h2>
            <p className="text-sm text-slate-500 mt-1">
              Đổi ảnh đại diện và tên hiển thị của bạn
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            {/* Avatar & Upload Button */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full ring-4 ring-indigo-50 overflow-hidden bg-slate-100 flex items-center justify-center shadow-md">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer disabled:opacity-60"
                  title="Thay đổi ảnh"
                >
                  {uploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
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
              <p className="text-xs text-slate-400 mt-2">
                Tải lên Storage bucket 'avatars' (PNG, JPG, tối đa 3MB)
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="text"
                disabled
                value={profile.email}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 text-sm cursor-not-allowed"
              />
            </div>

            {/* Role & VIP status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Vai trò (Role)
                </label>
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase">
                  {profile.role}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Thành viên
                </label>
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold text-center ${
                    profile.is_vip
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {profile.is_vip ? 'VIP MEMBER' : 'FREE USER'}
                </div>
              </div>
            </div>

            {/* Tên hiển thị */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                />
              </div>
            </div>

            {/* Nút lưu */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition-colors text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
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
      </div>
    </div>
  );
};
