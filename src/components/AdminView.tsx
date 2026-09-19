import React, { useState } from 'react';
import { Profile } from '../types';
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
} from 'lucide-react';

interface AdminViewProps {
  currentUser: Profile | null;
  profiles: Profile[];
  onToggleVip: (user: Profile) => Promise<void>;
  onBackToStudy: () => void;
  onAiGenerateQuestions: () => Promise<void>;
  isGeneratingAi: boolean;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  profiles,
  onToggleVip,
  onBackToStudy,
  onAiGenerateQuestions,
  isGeneratingAi,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

        <button
          onClick={onBackToStudy}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Vào phòng học
        </button>
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
              Tự động sinh 10 câu dịch giao tiếp mới mỗi ngày
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              API <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">/api/cron/generate</code> tự động yêu cầu Gemini AI sáng tạo câu tiếng Việt kèm từ vựng gợi ý và mảng đáp án tiếng Anh tương đương nạp vào database Supabase.
            </p>
          </div>

          <button
            onClick={onAiGenerateQuestions}
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
                <span>Kích hoạt sinh câu mới</span>
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
