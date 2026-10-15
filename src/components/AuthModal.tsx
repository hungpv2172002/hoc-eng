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
  KeyRound,
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
  rawPassword?: string;
}

type OtpProvider = 'smtp' | 'supabase';

// Hàm gọi API an toàn, xử lý triệt để lỗi không phải JSON trên các trình duyệt WebKit / Safari
async function safeFetchApi(url: string, options: RequestInit): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  try {
    const res = await fetch(url, options);
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    let parsedJson: any = null;
    if (text && text.trim()) {
      try {
        parsedJson = JSON.parse(text);
      } catch {
        parsedJson = null;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsedJson,
      rawText: text,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: err?.message || 'Không thể kết nối tới máy chủ',
    };
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  // Bước trong quy trình đăng ký: 'form' (điền thông tin) hoặc 'otp' (nhập mã xác thực từ email)
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');

  // Trạng thái cho quy trình Quên mật khẩu
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

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
  const [otpProvider, setOtpProvider] = useState<OtpProvider>('smtp');
  const [resendCountdown, setResendCountdown] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đặt lại state khi modal mở
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRegisterStep('form');
      setForgotStep('email');
      setForgotEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      setShowPassword(false);
      setOtpInputs(['', '', '', '', '', '']);
      setPendingReg(null);
      setOtpProvider('smtp');
    }
  }, [isOpen, initialMode]);

  // Bộ đếm ngược thời gian gửi lại mã OTP (cho cả Đăng ký và Quên mật khẩu)
  useEffect(() => {
    let timer: any;
    const isCounting = (registerStep === 'otp' || (mode === 'forgot' && forgotStep === 'reset')) && resendCountdown > 0;
    if (isCounting) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [registerStep, mode, forgotStep, resendCountdown]);

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

  // Hàm hoàn tất tạo và kích hoạt tài khoản người dùng
  const finalizeCreateUserAccount = async (
    targetEmail: string,
    targetName: string,
    targetPasswordHash: string,
    rawPassword?: string,
    existingAuthUserId?: string
  ): Promise<Profile> => {
    if (!isSupabaseConfigured) throw new Error('Chưa kết nối database tài khoản. Vui lòng liên hệ quản trị viên trước khi đăng ký.');
    const cleanEmail = targetEmail.trim().toLowerCase();
    const displayName = targetName.trim() || cleanEmail.split('@')[0];
    const isAdmin = cleanEmail === ADMIN_EMAIL;
    let registeredUser: Profile | null = null;

    // Nếu Supabase đã tạo user trong bước OTP, giữ nguyên user đó và chỉ cập nhật mật khẩu.
    if (existingAuthUserId) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== existingAuthUserId) {
        throw new Error('Phiên xác thực Supabase đã hết hạn. Vui lòng yêu cầu gửi lại mã email.');
      }
      if (rawPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: rawPassword });
        if (passwordError) throw passwordError;
      }
      registeredUser = {
        id: authData.user.id,
        email: cleanEmail,
        full_name: displayName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role: isAdmin ? 'admin' : 'user',
        is_vip: isAdmin,
        created_at: new Date().toISOString(),
      };
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPassword || '12345678',
        options: { data: { full_name: displayName } },
      });

      if (error) throw error;
      if (!data?.user) throw new Error('Không thể tạo tài khoản trong database.');
      if (!data.session) throw new Error('Vui lòng xác nhận email Supabase rồi đăng nhập. Tài khoản chưa được lưu trên trình duyệt.');
      registeredUser = {
        id: data.user.id,
        email: cleanEmail,
        full_name: displayName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role: isAdmin ? 'admin' : 'user',
        is_vip: isAdmin,
        created_at: new Date().toISOString(),
      };
    }

    if (registeredUser) {
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', registeredUser.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return existing as Profile;
      const { error: createError } = await supabase
        .from('profiles')
        .upsert(registeredUser, { onConflict: 'id', ignoreDuplicates: true });
      if (createError) throw createError;
      const { data: stored, error: readError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', registeredUser.id)
        .single();
      if (readError) throw readError;
      registeredUser = stored as Profile;
    }

    if (!registeredUser) throw new Error('Tài khoản chưa được lưu trên database.');

    return registeredUser;
  };

  // Khi preview không có SMTP, dùng email OTP của Supabase nếu project đã cấu hình.
  // Không trả mã OTP về client và không hiển thị mã trong giao diện.
  const requestSupabaseOtp = async (targetEmail: string, targetName: string) => {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        data: targetName ? { full_name: targetName } : undefined,
      },
    });
    if (error) throw error;
    return true;
  };

  // Gửi lại mã OTP về Email (Đăng ký hoặc Quên mật khẩu)
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    const targetEmail = mode === 'forgot' ? forgotEmail : pendingReg?.email;
    const targetName = mode === 'forgot' ? '' : pendingReg?.fullName;
    const targetType = mode === 'forgot' ? 'forgot' : 'register';

    if (!targetEmail) return;

    setLoading(true);
    setErrorMsg('');
    try {
      if (otpProvider === 'supabase' && mode === 'register') {
        await requestSupabaseOtp(targetEmail, targetName || '');
        setResendCountdown(60);
        setOtpInputs(['', '', '', '', '', '']);
        setSuccessMsg('Mã mới đã được gửi. Hãy kiểm tra Hộp thư đến hoặc Thư rác của bạn.');
        setTimeout(() => setSuccessMsg(''), 5000);
        otpRefs.current[0]?.focus();
        return;
      }

      const res = await safeFetchApi('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          fullName: targetName,
          type: targetType,
        }),
      });

      if (res.ok && res.data?.success && res.data?.emailSent) {
        setOtpProvider('smtp');
        setResendCountdown(60);
        setOtpInputs(['', '', '', '', '', '']);
        setSuccessMsg('Mã xác thực mới đã được gửi vào hòm thư email của bạn.');
        setTimeout(() => setSuccessMsg(''), 5000);
        otpRefs.current[0]?.focus();
      } else {
        setErrorMsg(
          res.data?.error ||
            'Không thể gửi mã xác thực qua email. Vui lòng kiểm tra lại dịch vụ gửi thư hoặc thử lại sau.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể kết nối máy chủ gửi mã. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 1 (Đăng ký): Gửi yêu cầu đăng ký ➔ BẮT BUỘC Server gửi mã 6 số về Email
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

      // Mã hóa mật khẩu an toàn bằng PBKDF2 + SHA-256 + Salt 16-byte ngẫu nhiên
      const hashed = await hashPassword(cleanPass);

      // Gọi server API gửi mã 6 số về hòm thư email của người dùng
      const res = await safeFetchApi('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: cleanName,
          type: 'register',
        }),
      });

      // Nếu máy chủ đã gửi email thành công qua SMTP
      if (res.ok && res.data?.success && res.data?.emailSent) {
        const newPending: PendingRegistration = {
          email: cleanEmail,
          passwordHash: hashed,
          fullName: cleanName || cleanEmail.split('@')[0],
          rawPassword: cleanPass,
        };

        setPendingReg(newPending);
        setOtpProvider('smtp');
        setRegisterStep('otp');
        setResendCountdown(60);
        setOtpInputs(['', '', '', '', '', '']);
        setSuccessMsg(`Hệ thống đã gửi mã xác thực 6 chữ số vào hòm thư ${cleanEmail}. Vui lòng kiểm tra email để lấy mã.`);

        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 150);
        return;
      }

      // Preview/Vercel có thể chưa có SMTP. Nếu Supabase đã cấu hình, chuyển sang
      // OTP email của Supabase để người dùng vẫn đăng ký được mà không lộ mã trên UI.
      if (!res.data?.emailSent && isSupabaseConfigured) {
        try {
          await requestSupabaseOtp(cleanEmail, cleanName);
          const newPending: PendingRegistration = {
            email: cleanEmail,
            passwordHash: hashed,
            fullName: cleanName || cleanEmail.split('@')[0],
            rawPassword: cleanPass,
          };
          setPendingReg(newPending);
          setOtpProvider('supabase');
          setRegisterStep('otp');
          setResendCountdown(60);
          setOtpInputs(['', '', '', '', '', '']);
          setSuccessMsg(`Mã xác thực đã được gửi tới ${cleanEmail} qua dịch vụ email của Supabase. Hãy kiểm tra Hộp thư đến hoặc Thư rác.`);
          setTimeout(() => otpRefs.current[0]?.focus(), 150);
          return;
        } catch (supabaseError: any) {
          setErrorMsg(`Dịch vụ email của Supabase chưa gửi được mã. ${supabaseError?.message || 'Vui lòng thử lại sau.'}`);
          return;
        }
      }

      // Không có SMTP/Supabase thì dừng an toàn, không tạo tài khoản và không hiển thị OTP.
      const emailUnavailable = res.data?.hasSmtpConfigured === false || res.status === 404 || res.status === 0;
      const errorDetail = emailUnavailable
        ? 'Email xác thực chưa được bật trên bản xem trước. Quản trị viên cần cấu hình SMTP hoặc Supabase Email trước khi đăng ký; tài khoản của bạn chưa bị tạo.'
        : res.data?.error || 'Chưa gửi được email xác thực. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau ít phút.';
      setErrorMsg(errorDetail);
    } catch (err: any) {
      console.warn('Lỗi xử lý đăng ký:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi kết nối máy chủ gửi mã xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2 (Đăng ký): Kiểm tra mã 6 số từ email ➔ Kích hoạt tạo tài khoản
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
      let existingAuthUserId: string | undefined;
      if (otpProvider === 'supabase') {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingReg.email,
          token: enteredOtp,
          type: 'signup',
        });
        if (error || !data.user) {
          setErrorMsg(error?.message || 'Mã xác thực không chính xác hoặc đã hết hạn. Hãy yêu cầu gửi lại mã.');
          setLoading(false);
          return;
        }
        existingAuthUserId = data.user.id;
      } else {
        // Xác thực mã với server SMTP của ứng dụng.
        const verifyRes = await safeFetchApi('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingReg.email, otp: enteredOtp }),
        });

        if (!verifyRes.ok || !verifyRes.data?.success) {
          setErrorMsg(
            verifyRes.data?.error || 'Mã xác thực không chính xác. Vui lòng kiểm tra lại hòm thư email của bạn.'
          );
          setLoading(false);
          return;
        }
      }

      const registeredUser = await finalizeCreateUserAccount(
        pendingReg.email,
        pendingReg.fullName,
        pendingReg.passwordHash,
        pendingReg.rawPassword,
        existingAuthUserId
      );

      setSuccessMsg('Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.');
      setTimeout(() => {
        onLoginSuccess(registeredUser);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi trong quá trình kích hoạt tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // XỬ LÝ QUÊN MẬT KHẨU (FORGOT PASSWORD)
  // ==========================================

  // Bước 1 (Quên mật khẩu): Gửi mã khôi phục 6 số về Email
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);

    try {
      // Kiểm tra tài khoản có tồn tại không
      const localUsersJson = localStorage.getItem('app_registered_users');
      const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
      const userExists = localUsers.some((u) => u.email === cleanEmail);

      if (!userExists && !isSupabaseConfigured && cleanEmail !== ADMIN_EMAIL) {
        setErrorMsg('Không tìm thấy tài khoản nào khớp với email này trong hệ thống.');
        setLoading(false);
        return;
      }

      const res = await safeFetchApi('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'forgot',
        }),
      });

      if (res.ok && res.data?.success && res.data?.emailSent) {
        setForgotStep('reset');
        setResendCountdown(60);
        setOtpInputs(['', '', '', '', '', '']);
        setSuccessMsg(`Mã khôi phục 6 chữ số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra email của bạn.`);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 150);
        return;
      }

      const errorDetail =
        res.data?.error ||
        'Không thể gửi mã khôi phục tới email. Vui lòng kiểm tra cấu hình SMTP trên máy chủ hoặc thử lại sau.';
      setErrorMsg(errorDetail);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2 (Quên mật khẩu): Nhập mã 6 số + Mật khẩu mới ➔ Đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const enteredOtp = otpInputs.join('').trim();
    const cleanNewPass = newPassword.trim();

    if (enteredOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác thực nhận được từ email.');
      return;
    }

    if (cleanNewPass.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanNewPass !== confirmPassword.trim()) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp. Vui lòng nhập lại.');
      return;
    }

    setLoading(true);

    try {
      const res = await safeFetchApi('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: enteredOtp,
          rawPassword: cleanNewPass,
        }),
      });

      if (!res.ok || !res.data?.success) {
        setErrorMsg(res.data?.error || 'Mã xác thực không chính xác hoặc đã hết hạn.');
        setLoading(false);
        return;
      }

      // Mã hóa mật khẩu mới và cập nhật trong localStorage
      if (isSupabaseConfigured) {
        setSuccessMsg('Đã gửi yêu cầu đặt lại mật khẩu. Vui lòng đăng nhập lại bằng tài khoản Supabase.');
        setMode('login');
        setPassword('');
        return;
      }
      const newHash = await hashPassword(cleanNewPass);
      const localUsersJson = localStorage.getItem('app_registered_users');
      const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
      const userIdx = localUsers.findIndex((u) => u.email === cleanEmail);

      let updatedProfile: Profile | null = null;
      if (userIdx >= 0) {
        localUsers[userIdx].passwordHash = newHash;
        localUsers[userIdx].password = newHash;
        localStorage.setItem('app_registered_users', JSON.stringify(localUsers));

        const u = localUsers[userIdx];
        updatedProfile = {
          id: u.id,
          email: u.email,
          full_name: u.full_name || cleanEmail.split('@')[0],
          avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          role: u.role || (cleanEmail === ADMIN_EMAIL ? 'admin' : 'user'),
          is_vip: u.is_vip ?? (cleanEmail === ADMIN_EMAIL),
          created_at: u.created_at || new Date().toISOString(),
        };
      } else {
        // Tạo profile mới nếu chưa có
        updatedProfile = {
          id: 'usr-' + Date.now(),
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          role: cleanEmail === ADMIN_EMAIL ? 'admin' : 'user',
          is_vip: cleanEmail === ADMIN_EMAIL,
          created_at: new Date().toISOString(),
        };
        localUsers.push({
          ...updatedProfile,
          passwordHash: newHash,
        });
        localStorage.setItem('app_registered_users', JSON.stringify(localUsers));
      }

      setSuccessMsg('Đặt lại mật khẩu thành công! Đang đăng nhập vào ứng dụng...');
      setTimeout(() => {
        if (updatedProfile) {
          onLoginSuccess(updatedProfile);
        }
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.');
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

          if (error) throw error;
          if (!error && data.user) {
            const { data: pData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;
            if (pData) {
              loggedProfile = {
                ...(pData as Profile),
                role: pData.role,
                is_vip: pData.is_vip,
              };
            }
          }
        } catch (supaLoginErr) {
          throw supaLoginErr;
        }
      }

      if (isSupabaseConfigured && !loggedProfile) throw new Error('Không đọc được hồ sơ tài khoản trong database.');

      // 2. Xác thực với tài khoản lưu trữ mã hóa
      if (!loggedProfile) {
        const localUsersJson = localStorage.getItem('app_registered_users');
        const localUsers: any[] = localUsersJson ? JSON.parse(localUsersJson) : [];
        const foundUser = localUsers.find((u) => u.email === cleanEmail);

        if (!foundUser) {
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
          setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc bấm "Quên mật khẩu?" bên dưới.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden my-auto max-h-[92vh] overflow-y-auto transition-colors">
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-3.5 right-3.5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8">
          {/* ==================================================== */}
          {/* MÀN HÌNH NHẬP MÃ OTP ĐĂNG KÝ (BẮT BUỘC TỪ EMAIL)   */}
          {/* ==================================================== */}
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
                  Xác thực mã từ Email
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Mã xác thực gồm 6 chữ số đã được gửi tới hộp thư:
                  <br />
                  <strong className="text-slate-800 font-semibold text-sm">{pendingReg?.email}</strong>
                </p>
              </div>

              {/* Hướng dẫn kiểm tra hòm thư */}
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Hướng dẫn lấy mã:</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  • Mở email và kiểm tra <strong>Hộp thư đến (Inbox)</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  • Nếu chưa thấy sau 1 phút, vui lòng kiểm tra thêm thư mục <strong>Thư rác (Spam)</strong> hoặc <strong>Quảng cáo</strong>.
                </p>
                {otpProvider === 'supabase' && (
                  <p className="text-[11px] text-indigo-700">
                    Mã đang được gửi bởi Supabase Email. Vì an toàn, mã không hiển thị trên trang này.
                  </p>
                )}
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
                <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5">
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
                      className="w-9 h-11 xs:w-11 xs:h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl sm:rounded-2xl outline-hidden transition-all text-slate-900 shadow-2xs"
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

                {/* Nút xác nhận & kích hoạt */}
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
                      <span>Xác nhận & Hoàn tất đăng ký</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : mode === 'forgot' ? (
            /* ==================================================== */
            /* MÀN HÌNH QUÊN MẬT KHẨU (KHÔI PHỤC BẰNG MÃ EMAIL)    */
            /* ==================================================== */
            <div>
              {/* Nút quay lại đăng nhập */}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại đăng nhập</span>
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {forgotStep === 'email' ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu mới'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {forgotStep === 'email'
                    ? 'Nhập email tài khoản của bạn để nhận mã xác thực 6 số khôi phục mật khẩu'
                    : `Nhập mã 6 số gửi tới ${forgotEmail} và thiết lập mật khẩu mới`}
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

              {/* BƯỚC 1: Nhập email cần khôi phục */}
              {forgotStep === 'email' ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ Email đăng ký
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang gửi mã khôi phục về email...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Gửi mã khôi phục về Email</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* BƯỚC 2: Nhập OTP 6 số + Mật khẩu mới */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Nhập mã OTP 6 số */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider text-center mb-2">
                      Nhập mã xác thực 6 số từ email
                    </label>
                    <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 mb-3">
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
                          className="w-9 h-11 xs:w-10 xs:h-12 sm:w-11 sm:h-13 text-center text-lg font-bold font-mono bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl sm:rounded-2xl outline-hidden transition-all text-slate-900 shadow-2xs"
                        />
                      ))}
                    </div>

                    <div className="text-center mb-3">
                      {resendCountdown > 0 ? (
                        <span className="text-xs text-slate-400">
                          Gửi lại mã sau <strong className="text-slate-600">{resendCountdown}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi lại mã khôi phục</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự bảo mật"
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpInputs.join('').length < 6}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang đặt lại mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đặt lại mật khẩu & Đăng nhập</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ==================================================== */
            /* MÀN HÌNH FORM ĐĂNG NHẬP / ĐĂNG KÝ TIÊU CHUẨN        */
            /* ==================================================== */
            <div>
              {/* Header icon & title */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                  {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản học'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {mode === 'login'
                    ? 'Đăng nhập để lưu trữ tiến độ, bài dịch và điểm số của bạn'
                    : 'Nhập thông tin để nhận mã xác thực 6 chữ số gửi qua Email'}
                </p>
              </div>

              {mode === 'register' && !isSupabaseConfigured && (
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    Đăng ký cần một email xác thực. Bản thử nghiệm hiện chưa kết nối dịch vụ gửi thư nên tài khoản
                    chỉ được tạo sau khi quản trị viên bật SMTP hoặc Supabase Email.
                  </p>
                </div>
              )}

              {/* 2 Tab: Đăng nhập & Đăng ký */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setForgotStep('email');
                          setForgotEmail(email);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
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
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer"
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
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer"
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
