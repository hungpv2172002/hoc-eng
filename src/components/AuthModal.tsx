import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Profile } from '../types';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Profile) => void;
  initialMode?: 'login' | 'register';
}

const ADMIN_EMAIL = 'hungpv2172002@gmail.com';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    const isAdmin = cleanEmail === ADMIN_EMAIL;
    setLoading(true);

    try {
      if (mode === 'register') {
        // === ĐĂNG KÝ TÀI KHOẢN MỚI ===
        let registeredUser: Profile | null = null;

        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signUp({
              email: cleanEmail,
              password: cleanPass,
              options: {
                data: {
                  full_name: cleanName || cleanEmail.split('@')[0],
                },
              },
            });

            if (error) throw error;

            if (data.user) {
              const newProfile: Profile = {
                id: data.user.id,
                email: cleanEmail,
                full_name: cleanName || cleanEmail.split('@')[0],
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
                role: isAdmin ? 'admin' : 'user',
                is_vip: isAdmin,
                created_at: new Date().toISOString(),
              };

              // Lưu vào bảng profiles trên Supabase
              try {
                await supabase.from('profiles').upsert(newProfile);
              } catch (profileErr) {
                console.warn('Lỗi ghi profile Supabase:', profileErr);
              }

              registeredUser = newProfile;
            }
          } catch (supaErr: any) {
            console.warn('Lỗi Supabase sign-up, dùng lưu trữ tài khoản thiết bị:', supaErr);
            setErrorMsg(supaErr.message || 'Lỗi khi kết nối Supabase.');
          }
        }

        // Lưu vào bộ nhớ cục bộ thiết bị để đăng nhập liền mạch
        try {
          const localUsersJson = localStorage.getItem('app_registered_users');
          const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
          const existingIdx = localUsers.findIndex((u) => u.email === cleanEmail);

          const localUserData = {
            id: registeredUser?.id || 'usr-' + Date.now(),
            email: cleanEmail,
            password: cleanPass,
            full_name: cleanName || cleanEmail.split('@')[0],
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
            role: isAdmin ? 'admin' : 'user',
            is_vip: isAdmin,
            created_at: new Date().toISOString(),
          };

          if (existingIdx >= 0) {
            localUsers[existingIdx] = localUserData;
          } else {
            localUsers.push(localUserData);
          }
          localStorage.setItem('app_registered_users', JSON.stringify(localUsers));

          if (!registeredUser) {
            registeredUser = {
              id: localUserData.id,
              email: localUserData.email,
              full_name: localUserData.full_name,
              avatar_url: localUserData.avatar_url,
              role: localUserData.role as 'admin' | 'user',
              is_vip: localUserData.is_vip,
              created_at: localUserData.created_at,
            };
          }
        } catch (storageErr) {
          console.warn('Lỗi lưu local storage:', storageErr);
        }

        if (registeredUser) {
          setSuccessMsg(
            isAdmin
              ? 'Đăng ký thành công! Đã cấp quyền Quản trị viên (Admin) cho email của bạn.'
              : 'Đăng ký tài khoản thành công! Đang chuyển vào ứng dụng...'
          );
          setTimeout(() => {
            onLoginSuccess(registeredUser!);
            onClose();
          }, 800);
        }
      } else {
        // === ĐĂNG NHẬP TÀI KHOẢN ===
        let loggedProfile: Profile | null = null;

        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPass,
            });

            if (!error && data.user) {
              // Lấy profile từ Supabase
              const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              if (pData) {
                loggedProfile = {
                  ...(pData as Profile),
                  role: isAdmin ? 'admin' : (pData.role || 'user'),
                  is_vip: isAdmin ? true : (pData.is_vip ?? false),
                };
              } else {
                loggedProfile = {
                  id: data.user.id,
                  email: cleanEmail,
                  full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                  avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
                  role: isAdmin ? 'admin' : 'user',
                  is_vip: isAdmin,
                  created_at: new Date().toISOString(),
                };
              }
            }
          } catch (supaLoginErr) {
            console.warn('Supabase signInWithPassword:', supaLoginErr);
          }
        }

        // Kiểm tra trong danh sách tài khoản đã đăng ký trên máy
        if (!loggedProfile) {
          try {
            const localUsersJson = localStorage.getItem('app_registered_users');
            const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
            const foundUser = localUsers.find(
              (u) => u.email === cleanEmail && u.password === cleanPass
            );

            if (foundUser) {
              loggedProfile = {
                id: foundUser.id,
                email: foundUser.email,
                full_name: foundUser.full_name || cleanEmail.split('@')[0],
                avatar_url: foundUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
                role: isAdmin ? 'admin' : (foundUser.role || 'user'),
                is_vip: isAdmin ? true : (foundUser.is_vip ?? false),
                created_at: foundUser.created_at || new Date().toISOString(),
              };
            }
          } catch (e) {}
        }

        // Cho phép Admin (hungpv2172002@gmail.com) đăng nhập trực tiếp
        if (!loggedProfile && isAdmin) {
          loggedProfile = {
            id: 'admin-hung',
            email: ADMIN_EMAIL,
            full_name: 'Phùng Việt Hùng',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HungPV',
            role: 'admin',
            is_vip: true,
            created_at: new Date().toISOString(),
          };
        }

        if (loggedProfile) {
          setSuccessMsg(
            isAdmin
              ? 'Xin chào Quản trị viên Phùng Việt Hùng! Đang vào ứng dụng...'
              : 'Đăng nhập thành công!'
          );
          setTimeout(() => {
            onLoginSuccess(loggedProfile!);
            onClose();
          }, 600);
        } else {
          setErrorMsg(
            'Email hoặc mật khẩu chưa chính xác. Nếu chưa có tài khoản, bạn hãy bấm chuyển sang tab "Đăng ký tài khoản" bên cạnh.'
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình xử lý.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header icon & title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
              {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản học mới'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {mode === 'login'
                ? 'Đăng nhập để lưu tiến độ học, điểm số và chuỗi ngày dịch'
                : 'Đăng ký nhanh bằng Email để bắt đầu hành trình luyện dịch'}
            </p>
          </div>

          {/* 2 Tab: Đăng nhập & Đăng ký */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký</span>
            </button>
          </div>

          {/* Thông báo lỗi */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông báo thành công */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Họ tên (khi đăng ký) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Phùng Việt Hùng"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu của bạn'}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Ghi chú phân quyền Admin cho email của chủ web */}
            {email.trim().toLowerCase() === ADMIN_EMAIL && (
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-800">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Hệ thống nhận diện tài khoản <strong>Quản trị viên (Admin)</strong> tối cao.
                </span>
              </div>
            )}

            {/* Nút bấm Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập ngay</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo tài khoản mới</span>
                </>
              )}
            </button>
          </form>

          {/* Dòng chuyển đổi tab ở chân modal */}
          <div className="mt-5 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2"
                >
                  Đăng ký miễn phí ngay
                </button>
              </p>
            ) : (
              <p>
                Đã có tài khoản từ trước?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2"
                >
                  Đăng nhập tại đây
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
