import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Profile } from '../types';
import {
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  User,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Profile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setOtp('');
      setStep('email');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Gửi OTP bằng Supabase hoặc Mock
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      }

      setStep('otp');
      setCountdown(60);
      setSuccessMsg(
        isSupabaseConfigured
          ? `Mã OTP 6 số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra hộp thư.`
          : `Đã mô phỏng gửi mã OTP đến ${cleanEmail} (Bạn có thể nhập bất kỳ 6 số nào, ví dụ 123456)`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi mã xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  // Xác thực mã OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác nhận.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let userProfile: Profile;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: 'email',
        });
        if (error) throw error;

        // Lấy profile từ Supabase
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user?.id)
          .single();

        if (pData) {
          userProfile = pData as Profile;
        } else {
          const isAdmin =
            cleanEmail === 'hungpv2172002@gmail.com' ||
            cleanEmail === 'your_email@gmail.com';
          userProfile = {
            id: data.user?.id || 'usr-' + Date.now(),
            email: cleanEmail,
            full_name: cleanEmail.split('@')[0],
            avatar_url: null,
            role: isAdmin ? 'admin' : 'user',
            is_vip: isAdmin,
            created_at: new Date().toISOString(),
          };
        }
      } else {
        // Fallback local demo profile
        const isAdmin =
          cleanEmail === 'hungpv2172002@gmail.com' ||
          cleanEmail.includes('admin');
        userProfile = {
          id: 'demo-' + Date.now(),
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + cleanEmail,
          role: isAdmin ? 'admin' : 'user',
          is_vip: isAdmin,
          created_at: new Date().toISOString(),
        };
      }

      setSuccessMsg('Đăng nhập thành công!');
      setTimeout(() => {
        onLoginSuccess(userProfile);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập nhanh chế độ dùng thử (Demo Quick Logins)
  const handleQuickLogin = (role: 'admin' | 'user') => {
    const isAdmin = role === 'admin';
    const profile: Profile = {
      id: isAdmin ? 'admin-user-001' : 'regular-user-002',
      email: isAdmin ? 'hungpv2172002@gmail.com' : 'student@gmail.com',
      full_name: isAdmin ? 'Phùng Việt Hùng (Admin)' : 'Nguyễn Văn Nam (Học viên)',
      avatar_url: isAdmin
        ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminHung'
        : 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudentNam',
      role: isAdmin ? 'admin' : 'user',
      is_vip: isAdmin,
      created_at: new Date().toISOString(),
    };
    onLoginSuccess(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
              {step === 'email' ? <Mail className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {step === 'email' ? 'Đăng nhập Gmail OTP' : 'Xác thực mã 6 số'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {step === 'email'
                ? 'Nhận mã xác nhận bảo mật về hộp thư Gmail (Không dùng mật khẩu)'
                : `Mã OTP đã gửi đến: ${email}`}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Địa chỉ Gmail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hungpv2172002@gmail.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang gửi mã...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi mã xác nhận 6 số</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Mã OTP (6 chữ số)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 text-center tracking-widest font-mono text-xl font-bold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md hover:shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Xác nhận & Đăng nhập</span>
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="hover:text-indigo-600 underline underline-offset-2"
                >
                  Đổi email khác
                </button>
                {countdown > 0 ? (
                  <span>Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Gửi lại mã
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Khu vực đăng nhập nhanh phục vụ thử nghiệm */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400 text-center tracking-wider mb-3">
              Thử nghiệm nhanh trong môi trường xem trước
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Vào vai Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('user')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Vào vai Học viên</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
