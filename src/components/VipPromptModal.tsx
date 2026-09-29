import React from 'react';
import { CareerTrackInfo, Profile } from '../types';
import { Crown, Sparkles, X, Check, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface VipPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: CareerTrackInfo | null;
  profile: Profile | null;
  onOpenAuth: () => void;
  onTrySample: () => void;
}

export const VipPromptModal: React.FC<VipPromptModalProps> = ({
  isOpen,
  onClose,
  track,
  profile,
  onOpenAuth,
  onTrySample,
}) => {
  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-8 shadow-2xl border border-amber-200/90 space-y-5 relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        {/* Nền ánh kim nhẹ */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-amber-200/40 to-indigo-200/40 rounded-full blur-2xl pointer-events-none" />

        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Huy hiệu VIP */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Đặc quyền gói VIP
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
              Mở Khóa Chuyên Ngành: {track.name}
            </h3>
          </div>
        </div>

        {/* Giới thiệu nội dung ngành */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs text-amber-950">
          <p className="font-semibold text-slate-800 leading-relaxed">
            {track.description}
          </p>
          <div className="pt-1 text-[11px] text-slate-500">
            <strong>Mẫu câu thực tế:</strong> <em>"{track.samplePhrase}"</em>
          </div>
        </div>

        {/* Danh sách quyền lợi VIP */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lợi ích khi nâng cấp tài khoản VIP:
          </h4>
          <ul className="space-y-2 text-xs text-slate-700 font-medium">
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span>Học không giới hạn (vượt mức 30 câu/ngày của tài khoản thường).</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span>Trọn bộ 3 ngành nghề chuyên sâu: IT & Lập trình, Kinh doanh & Marketing, Khách sạn & Du lịch.</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span>Được Admin phê duyệt và hỗ trợ học tập ưu tiên.</span>
            </li>
          </ul>
        </div>

        {/* Nút hành động */}
        <div className="space-y-2 pt-2">
          {!profile ? (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <span>Đăng nhập để liên hệ Admin nâng VIP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <p className="text-xs text-slate-700 font-medium">
                Tài khoản hiện tại: <strong className="text-purple-700">{profile.email}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Vui lòng gửi email đến Admin <strong>hungpv2172002@gmail.com</strong> hoặc yêu cầu Admin kích hoạt trực tiếp trong Bảng Quản Trị.
              </p>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              onTrySample();
            }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors text-xs cursor-pointer"
          >
            Học thử 1 câu mẫu của chuyên ngành này
          </button>
        </div>
      </div>
    </div>
  );
};
