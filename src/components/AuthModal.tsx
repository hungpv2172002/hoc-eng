import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Profile } from '../types';
import { hashPassword, verifyPassword } from '../lib/crypto';
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
  ArrowLeft,
  MailCheck,
  Send,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Profile) => void;
  initialMode?: 'login' | 'register';
}

const ADMIN_EMAIL = 'hungpv2172002@gmail.com';

interface PendingRegistration {
  email: string;
  passwordHash: string;
  fullName: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Bước trong quy trình đăng ký: 'form' (điền thông tin) hoặc 'otp' (nhập mã xác thực từ email)
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Trạng thái cho mã xác thực OTP từ Email
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
  const [pendingReg, setPendingReg] = useState<PendingRegistration | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đặt lại state khi modal mở
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRegisterStep('form');
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      setShowPassword(false);
      setOtpInputs(['', '', '', '', '', '']);
      setPendingReg(null);
    }
  }, [isOpen, initialMode]);

  // Bộ đếm ngược thời gian gửi lại mã OTP
  useEffect(() => {
    let timer: any;
    if (registerStep === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [registerStep, resendCountdown]);

  if (!isOpen) return null;

  // Xử lý chuyển đổi giữa các ô input OTP khi gõ
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpInputs];
    // Nếu người dùng dán cả chuỗi 6 số từ email
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedDigits[i] || '';
      }
      setOtpInputs(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtpInputs(newOtp);

    // Tự động focus sang ô tiếp theo
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Gửi lại mã OTP về Email
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !pendingReg) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingReg.email,
          fullName: pendingReg.fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể gửi lại mã xác thực.');
      }

      setResendCountdown(60);
      setOtpInputs(['', '', '', '', '', '']);
      setSuccessMsg('Mã xác thực mới đã được gửi vào hòm thư email của bạn.');
      setTimeout(() => setSuccessMsg(''), 5000);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi lại mã xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 1: Gửi yêu cầu đăng ký ➔ Server gửi mã 6 số về hòm thư Email
  const handleInitiateRegister = async (e: React.FormEvent) => {
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
      setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    setLoading(true);

    try {
      // Kiểm tra xem email này đã tồn tại trong hệ thống chưa
      const localUsersJson = localStorage.getItem('app_registered_users');
      const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
      const isExisted = localUsers.some((u) => u.email === cleanEmail);

      if (isExisted) {
        setErrorMsg('Địa chỉ email này đã được đăng ký tài khoản. Bạn vui lòng chuyển sang tab Đăng nhập.');
        setLoading(false);
        return;
      }

      // Mã hóa mật khẩu bảo mật bằng PBKDF2 + SHA-256 + Salt 16-byte ngẫu nhiên
      const hashed = await hashPassword(cleanPass);

      // Gọi server API gửi mã 6 số về hòm thư email của người dùng
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: cleanName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể gửi mã xác thực tới email.');
      }

      const newPending: PendingRegistration = {
        email: cleanEmail,
        passwordHash: hashed,
        fullName: cleanName || cleanEmail.split('@')[0],
      };

      setPendingReg(newPending);
      setRegisterStep('otp');
      setResendCountdown(60);
      setOtpInputs(['', '', '', '', '', '']);
      setSuccessMsg('Hệ thống đã gửi mã xác thực 6 chữ số vào hòm thư email của bạn.');

      // Tự động focus vào ô OTP đầu tiên sau 150ms
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gửi mã xác thực tới email.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Kiểm tra mã 6 số từ email ➔ Kích hoạt tạo tài khoản
  const handleVerifyOtpAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!pendingReg) {
      setErrorMsg('Phiên xác thực đã hết hạn, vui lòng quay lại điền thông tin đăng ký.');
      setRegisterStep('form');
      return;
    }

    const enteredOtp = otpInputs.join('').trim();
    if (enteredOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác thực từ email.');
      return;
    }

    setLoading(true);

    try {
      // Xác thực mã với server
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingReg.email,
          otp: enteredOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(
          verifyData.error || 'Mã xác thực không chính xác. Vui lòng kiểm tra lại hòm thư email của bạn.'
        );
      }

      const cleanEmail = pendingReg.email;
      const isAdmin = cleanEmail === ADMIN_EMAIL;
      let registeredUser: Profile | null = null;

      // 1. Nếu có kết nối Supabase, đồng bộ lên Supabase Auth và DB
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password.trim(),
            options: {
              data: {
                full_name: pendingReg.fullName,
              },
            },
          });

          if (!error && data.user) {
            registeredUser = {
              id: data.user.id,
              email: cleanEmail,
              full_name: pendingReg.fullName,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
              role: isAdmin ? 'admin' : 'user',
              is_vip: isAdmin,
              created_at: new Date().toISOString(),
            };

            try {
              await supabase.from('profiles').upsert(registeredUser);
            } catch (pErr) {
              console.warn('Lỗi ghi profile Supabase:', pErr);
            }
          }
        } catch (supaErr) {
          console.warn('Supabase sign up warning:', supaErr);
        }
      }

      // 2. Lưu tài khoản an toàn vào bộ nhớ hệ thống (ĐÃ MÃ HÓA MẬT KHẨU HOÀN TOÀN BẰNG PBKDF2)
      const localUsersJson = localStorage.getItem('app_registered_users');
      const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];

      const newUserData = {
        id: registeredUser?.id || 'usr-' + Date.now(),
        email: cleanEmail,
        passwordHash: pendingReg.passwordHash, // Mật khẩu đã băm PBKDF2 an toàn
        full_name: pendingReg.fullName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
        role: isAdmin ? 'admin' : 'user',
        is_vip: isAdmin,
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      };

      const existingIdx = localUsers.findIndex((u) => u.email === cleanEmail);
      if (existingIdx >= 0) {
        localUsers[existingIdx] = newUserData;
      } else {
        localUsers.push(newUserData);
      }
      localStorage.setItem('app_registered_users', JSON.stringify(localUsers));

      if (!registeredUser) {
        registeredUser = {
          id: newUserData.id,
          email: newUserData.email,
          full_name: newUserData.full_name,
          avatar_url: newUserData.avatar_url,
          role: newUserData.role as 'admin' | 'user',
          is_vip: newUserData.is_vip,
          created_at: newUserData.created_at,
        };
      }

      setSuccessMsg('Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.');
      setTimeout(() => {
        onLoginSuccess(registeredUser!);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi trong quá trình kích hoạt tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // ĐĂNG NHẬP TÀI KHOẢN (Đã mã hóa và xác minh an toàn, không bypass cho bất kỳ ai)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Vui lòng nhập mật khẩu của bạn.');
      return;
    }

    const isAdmin = cleanEmail === ADMIN_EMAIL;
    setLoading(true);

    try {
      let loggedProfile: Profile | null = null;

      // 1. Kiểm tra xác thực qua Supabase nếu có cấu hình
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass,
          });

          if (!error && data.user) {
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
            }
          }
        } catch (supaLoginErr) {
          console.warn('Supabase signInWithPassword:', supaLoginErr);
        }
      }

      // 2. Xác thực với tài khoản lưu trữ mã hóa
      if (!loggedProfile) {
        const localUsersJson = localStorage.getItem('app_registered_users');
        const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
        const foundUser = localUsers.find((u) => u.email === cleanEmail);

        if (!foundUser) {
          // Bắt buộc tất cả tài khoản (kể cả hungpv2172002@gmail.com) phải đăng ký trước
          setErrorMsg(
            'Tài khoản này chưa được đăng ký trong hệ thống. Vui lòng bấm sang tab "Đăng ký" để tạo tài khoản và nhận mã xác thực qua email.'
          );
          setLoading(false);
          return;
        }

        // Xác minh mật mã bảo mật bằng PBKDF2/SHA-256
        const isPasswordCorrect = await verifyPassword(
          cleanPass,
          foundUser.passwordHash || foundUser.password
        );

        if (!isPasswordCorrect) {
          setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
          setLoading(false);
          return;
        }

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

      if (loggedProfile) {
        setSuccessMsg('Đăng nhập thành công! Đang chuyển vào ứng dụng...');
        setTimeout(() => {
          onLoginSuccess(loggedProfile!);
          onClose();
        }, 500);
      } else {
        setErrorMsg('Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi đăng nhập.');
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
          {/* MÀN HÌNH NHẬP MÃ XÁC THỰC OTP TỪ HÒM THƯ EMAIL */}
          {mode === 'register' && registerStep === 'otp' ? (
            <div>
              {/* Nút quay lại bước trước */}
              <button
                type="button"
                onClick={() => {
                  setRegisterStep('form');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại chỉnh sửa</span>
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
                  <MailCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Kiểm tra email của bạn
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Mã xác thực gồm 6 chữ số đã được gửi tới:
                  <br />
                  <strong className="text-slate-800 font-semibold text-sm">{pendingReg?.email}</strong>
                </p>
              </div>

              {/* Hướng dẫn kiểm tra hòm thư (KHÔNG hiển thị mã code lên web) */}
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mở hòm thư email để lấy mã:</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  • Kiểm tra thư mục <strong>Hộp thư đến (Inbox)</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  • Nếu chưa thấy sau 1-2 phút, hãy kiểm tra thêm mục <strong>Thư rác (Spam)</strong> hoặc <strong>Quảng cáo (Promotions)</strong>.
                </p>
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

              {/* Form 6 ô nhập mã OTP từ Email */}
              <form onSubmit={handleVerifyOtpAndCreateAccount} className="space-y-5">
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {otpInputs.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl outline-hidden transition-all text-slate-900 shadow-2xs"
                    />
                  ))}
                </div>

                {/* Nút gửi lại mã về email */}
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <span className="text-xs text-slate-400">
                      Gửi lại mã qua email sau <strong className="text-slate-600">{resendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Gửi lại mã xác thực vào email</span>
                    </button>
                  )}
                </div>

                {/* Nút kích hoạt tài khoản */}
                <button
                  type="submit"
                  disabled={loading || otpInputs.join('').length < 6}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xác minh mã email...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận & Kích hoạt tài khoản</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* MÀN HÌNH FORM ĐĂNG NHẬP / ĐĂNG KÝ THÔNG THƯỜNG */
            <div>
              {/* Header icon & title */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
                  {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản học'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'Đăng nhập để lưu trữ tiến độ, bài dịch và điểm số của bạn'
                    : 'Đăng ký bằng email và nhận mã xác thực để kích hoạt tài khoản'}
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
                    setRegisterStep('form');
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

              {/* Form nhập */}
              <form
                onSubmit={mode === 'login' ? handleLogin : handleInitiateRegister}
                className="space-y-4"
              >
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
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên của bạn"
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
                      placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự bảo mật' : 'Nhập mật khẩu của bạn'}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'register' && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Mật khẩu sẽ được mã hóa an toàn bằng PBKDF2 (SHA-256).
                    </span>
                  )}
                </div>

                {/* Nút bấm Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang gửi mã xác thực về email...</span>
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi mã xác thực về Email</span>
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
                        setRegisterStep('form');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2"
                    >
                      Đăng ký ngay
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
          )}
        </div>
      </div>
    </div>
  );
};
