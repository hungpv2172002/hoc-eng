'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import {
  ShieldCheck,
  Search,
  Crown,
  ArrowLeft,
  UserCheck,
  UserX,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Mail,
  User,
  Database,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trạng thái nút sinh câu hỏi Gemini AI từ Admin
  const [generatingAi, setGeneratingAi] = useState(false);
  const [cronSecret, setCronSecret] = useState('');

  // Trạng thái kiểm tra và hướng dẫn khởi tạo bảng Supabase
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [loadingSql, setLoadingSql] = useState(false);

  // 1. Kiểm tra quyền Admin
  const checkAdminAuth = useCallback(async () => {
    setLoadingAuth(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/');
        return;
      }

      // Lấy profile từ database để kiểm tra role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        // Nếu bảng profiles chưa tồn tại trong Supabase và email là admin hungpv2172002@gmail.com
        if (session.user.email?.toLowerCase() === 'hungpv2172002@gmail.com') {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            full_name: 'Admin',
            avatar_url: null,
            role: 'admin',
            is_vip: true,
            created_at: new Date().toISOString(),
          });
          setIsSchemaMissing(true);
          fetchProfiles();
          return;
        }

        alert('Truy cập bị từ chối: Bạn không có quyền Admin để vào trang này.');
        router.push('/');
        return;
      }

      setCurrentUser(profile as Profile);
      fetchProfiles();
    } catch (err) {
      console.error('Lỗi xác thực quyền admin:', err);
      router.push('/');
    } finally {
      setLoadingAuth(false);
    }
  }, [router]);

  // 2. Lấy danh sách toàn bộ học viên
  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST204') {
          setIsSchemaMissing(true);
        }
        console.warn('Lỗi khi tải danh sách học viên:', error.message);
      } else if (data) {
        setProfiles(data as Profile[]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách học viên:', err);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // Tải nội dung SQL từ server
  const fetchSql = async () => {
    if (sqlContent) return sqlContent;
    setLoadingSql(true);
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.success && data.sql) {
        setSqlContent(data.sql);
        return data.sql;
      }
    } catch (err) {
      console.error('Lỗi tải mã SQL:', err);
    } finally {
      setLoadingSql(false);
    }
    return '';
  };

  // Nút sao chép 1-Click
  const handleCopySql = async () => {
    try {
      const text = await fetchSql();
      if (text) {
        await navigator.clipboard.writeText(text);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
        setToastMsg({ type: 'success', text: 'Đã sao chép toàn bộ mã SQL khởi tạo vào bộ nhớ tạm!' });
      } else {
        setToastMsg({ type: 'error', text: 'Vui lòng mở file supabase-schema.sql trong dự án để sao chép.' });
      }
    } catch {
      setToastMsg({ type: 'error', text: 'Trình duyệt không hỗ trợ sao chép tự động. Vui lòng mở file supabase-schema.sql.' });
    }
  };

  // 3. Nút Toggle trực tiếp trạng thái VIP cho học viên (1 cú click)
  const handleToggleVip = async (targetUser: Profile) => {
    setUpdatingId(targetUser.id);
    const newVipStatus = !targetUser.is_vip;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_vip: newVipStatus })
        .eq('id', targetUser.id);

      if (error) throw error;

      // Cập nhật state cục bộ ngay lập tức
      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, is_vip: newVipStatus } : p))
      );

      setToastMsg({
        type: 'success',
        text: `Đã ${newVipStatus ? 'nâng cấp VIP' : 'hạ xuống thường'} cho học viên ${
          targetUser.full_name || targetUser.email
        }!`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật quyền VIP.';
      setToastMsg({ type: 'error', text: message });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // 4. Kích hoạt API sinh 10 câu mới bằng Gemini AI
  const handleTriggerGeminiCron = async () => {
    setGeneratingAi(true);
    try {
      const secretToUse = cronSecret || 'my_super_secret_cron_token_12345';
      const res = await fetch(`/api/cron/generate?key=${encodeURIComponent(secretToUse)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretToUse}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi gọi API cron sinh câu');
      }

      if (json.schema_missing) {
        setIsSchemaMissing(true);
        setToastMsg({
          type: 'error',
          text: 'Bảng "questions" chưa được tạo trên Supabase. Nhấn vào "Xem & Chạy SQL" bên dưới để khởi tạo bảng nhé!',
        });
        setShowSqlModal(true);
        fetchSql();
        return;
      }

      setToastMsg({
        type: 'success',
        text: `Gemini AI đã sinh và nạp thành công ${json.count || 10} câu hỏi mới vào cơ sở dữ liệu!`,
      });
      fetchProfiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi kích hoạt AI.';
      setToastMsg({ type: 'error', text: message });
    } finally {
      setGeneratingAi(false);
      setTimeout(() => setToastMsg(null), 6000);
    }
  };

  // Lọc học viên theo ô tìm kiếm Gmail
  const filteredProfiles = profiles.filter((p) =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Đang kiểm tra bảo mật quyền Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER TRANG QUẢN TRỊ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Quay lại phòng học"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-xl font-bold text-slate-900">Quản Trị Học Viên & Phân Quyền VIP</h1>
              </div>
              <p className="text-xs text-slate-500">
                Đăng nhập bởi: <strong className="text-purple-700">{currentUser?.email}</strong> (Admin)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Vào học ngay
            </Link>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* TOAST THÔNG BÁO */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{toastMsg.text}</span>
          </div>
        )}

        {/* CẢNH BÁO NẾU CHƯA TẠO BẢNG TRÊN SUPABASE */}
        {isSchemaMissing && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 text-amber-900 shadow-sm animate-in fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-base text-amber-950">
                  <Database className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Cần chạy câu lệnh tạo bảng trên Supabase (Chỉ 10 giây)</span>
                </div>
                <p className="text-xs text-amber-800 max-w-2xl leading-relaxed">
                  Supabase của bạn chưa có các bảng <code className="bg-amber-200/60 px-1.5 py-0.5 rounded font-mono font-bold">questions</code>, <code className="bg-amber-200/60 px-1.5 py-0.5 rounded font-mono font-bold">profiles</code>, <code className="bg-amber-200/60 px-1.5 py-0.5 rounded font-mono font-bold">study_logs</code>. Hãy sao chép mã SQL và dán vào Supabase SQL Editor để hệ thống lưu trữ hoạt động hoàn hảo.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Đã chép SQL!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép mã SQL</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowSqlModal(true);
                    fetchSql();
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Xem hướng dẫn</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CÔNG CỤ SINH CÂU BẰNG GEMINI AI DÀNH CHO ADMIN */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Tự động sinh câu mới bằng Gemini AI</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Kích hoạt trực tiếp route <code className="text-indigo-600 font-mono">/api/cron/generate</code> để Gemini AI sáng tạo 10 câu dịch kèm từ vựng gợi ý và nạp thẳng vào cơ sở dữ liệu Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowSqlModal(true);
                  fetchSql();
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                title="Xem mã SQL tạo bảng Supabase"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Mã SQL Supabase</span>
              </button>

              <button
                onClick={handleTriggerGeminiCron}
                disabled={generatingAi}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-indigo-200 flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                {generatingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini đang tạo 10 câu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sinh 10 câu mới ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* THANH TÌM KIẾM VÀ THỐNG KÊ HỌC VIÊN */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo Gmail hoặc Tên học viên..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden text-sm"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Tổng số học viên: <strong className="text-slate-800">{profiles.length}</strong>
            </span>
            <span>•</span>
            <span>
              Học viên VIP: <strong className="text-amber-600">{profiles.filter((p) => p.is_vip).length}</strong>
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
                      Không tìm thấy học viên nào phù hợp với từ khóa tìm kiếm.
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

                      {/* Nút Toggle 1 Click */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => handleToggleVip(user)}
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

        {/* MODAL HƯỚNG DẪN & SAO CHÉP MÃ SQL SUPABASE */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header modal */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Khởi Tạo Bảng Supabase</h3>
                    <p className="text-xs text-slate-500">Tạo bảng questions, profiles, study_logs và cấu hình RLS</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Nội dung các bước */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">3 Bước đơn giản (chỉ 10 giây):</h4>
                  <ol className="space-y-2.5 text-xs text-slate-600 list-decimal list-inside">
                    <li>
                      Mở{' '}
                      <a
                        href="https://supabase.com/dashboard/project/_/sql/new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Supabase SQL Editor</span>
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      (Chọn New query trong dự án Supabase của bạn).
                    </li>
                    <li>
                      Bấm nút <strong className="text-amber-700 font-bold">"Sao chép toàn bộ mã SQL"</strong> ở bên dưới.
                    </li>
                    <li>
                      Dán vào ô SQL Editor trên Supabase và nhấn nút <strong className="text-emerald-700 font-bold">"RUN"</strong> (hoặc nhấn phím tắt <kbd className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">Ctrl + Enter</kbd>).
                    </li>
                  </ol>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">Mã SQL tạo bảng (`supabase-schema.sql`):</span>
                  <button
                    onClick={handleCopySql}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Đã chép vào bộ nhớ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao chép toàn bộ mã SQL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Khung xem trước code */}
                <div className="relative bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs max-h-60 overflow-y-auto border border-slate-800">
                  {loadingSql ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      <span>Đang tải mã SQL...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap">{sqlContent || '-- Đang chuẩn bị mã SQL. Bấm nút sao chép để tự động copy toàn bộ nội dung.'}</pre>
                  )}
                </div>
              </div>

              {/* Footer modal */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép mã SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
