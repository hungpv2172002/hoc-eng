import React, { useState, useEffect, useMemo } from 'react';
import { Profile, AppSettings, Customer, CustomerStatus, CustomerPackage, ThemeColor, BgTheme } from '../types';
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
  Plus,
  Edit3,
  Trash2,
  Download,
  Phone,
  MessageCircle,
  DollarSign,
  Users,
  TrendingUp,
  Filter,
  Check,
  X,
  Lock,
  Unlock,
  Key,
  Megaphone,
  Sliders,
  Award,
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
  onUpdateProfiles?: (newProfiles: Profile[]) => void;
  onOpenAuth?: () => void;
}

// Khách hàng mẫu ban đầu nếu máy chưa có dữ liệu CRM
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    full_name: 'Nguyễn Thu Hà',
    phone: '0982112334',
    email: 'ha.nguyen@gmail.com',
    package_interest: 'vip_lifetime',
    status: 'converted',
    deal_value: 999000,
    source: 'Facebook Ads',
    notes: 'Đã chuyển khoản Vietcombank, cần mở khóa chuyên ngành IT để đi phỏng vấn dev quốc tế',
    created_at: '2026-03-20T08:30:00Z',
    updated_at: '2026-03-20T09:15:00Z',
  },
  {
    id: 'cust-2',
    full_name: 'Trần Minh Đức',
    phone: '0914556789',
    email: 'duc.tran@techcorp.vn',
    package_interest: 'course_it',
    status: 'consulting',
    deal_value: 499000,
    source: 'TikTok',
    notes: 'Làm Backend Java, quan tâm từ vựng họp daily scrum và viết code review bằng tiếng Anh',
    created_at: '2026-03-22T14:10:00Z',
    updated_at: '2026-03-22T14:45:00Z',
  },
  {
    id: 'cust-3',
    full_name: 'Lê Hoàng Yến',
    phone: '0978223119',
    email: 'yen.le@fpt.com',
    package_interest: 'vip_year',
    status: 'converted',
    deal_value: 599000,
    source: 'Bạn bè giới thiệu',
    notes: 'Đã kích hoạt VIP 1 năm. Học rất chăm chỉ, tiến độ đạt 30 câu mỗi ngày',
    created_at: '2026-03-24T10:00:00Z',
    updated_at: '2026-03-24T10:30:00Z',
  },
  {
    id: 'cust-4',
    full_name: 'Vũ Đình Trọng',
    phone: '0903889911',
    email: 'trong.vu@gmail.com',
    package_interest: 'course_business',
    status: 'callback',
    deal_value: 499000,
    source: 'Website',
    notes: 'Đang bận công tác ở Đà Nẵng, hẹn gọi lại sau 20h tối thứ Sáu để tư vấn chốt gói',
    created_at: '2026-03-26T16:20:00Z',
    updated_at: '2026-03-26T16:20:00Z',
  },
  {
    id: 'cust-5',
    full_name: 'Phạm Thúy Vi',
    phone: '0965432198',
    email: 'vi.pham@tourism.vn',
    package_interest: 'vip_month',
    status: 'new',
    deal_value: 199000,
    source: 'Facebook Ads',
    notes: 'Vừa để lại thông tin quan tâm gói giao tiếp khách sạn & du lịch',
    created_at: '2026-03-28T09:40:00Z',
    updated_at: '2026-03-28T09:40:00Z',
  },
];

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
  onUpdateProfiles,
  onOpenAuth,
}) => {
  // Tab quản lý: 'interface' (Sửa giao diện) | 'accounts' (Quản lý tài khoản) | 'customers' (Quản lý khách hàng) | 'ai_tools' (Công cụ AI)
  const [activeTab, setActiveTab] = useState<'interface' | 'accounts' | 'customers' | 'ai_tools'>('interface');

  // Toast thông báo
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ================= TAB 1: FORM CÀI ĐẶT GIAO DIỆN =================
  const [appNameInput, setAppNameInput] = useState(settings?.appName || 'Dịch Mỗi Ngày');
  const [appSubtitleInput, setAppSubtitleInput] = useState(settings?.appSubtitle || 'Dịch câu mỗi ngày kèm từ vựng gợi ý');
  const [selectedIcon, setSelectedIcon] = useState(settings?.appIcon || '🎯');
  const [iconType, setIconType] = useState<'lucide' | 'emoji'>(settings?.appIconType || 'emoji');
  const [customEmoji, setCustomEmoji] = useState('');
  const [themeColor, setThemeColor] = useState<ThemeColor>(settings?.themeColor || 'indigo');
  const [bgTheme, setBgTheme] = useState<BgTheme>(settings?.bgTheme || 'default');

  // Announcement Banner
  const [showAnnouncement, setShowAnnouncement] = useState(settings?.showAnnouncement ?? true);
  const [announcementText, setAnnouncementText] = useState(
    settings?.announcementText || '🔥 Khuyến mãi VIP Trọn Đời: Mở khóa toàn bộ chuyên ngành IT, Kinh Doanh & Du Lịch!'
  );
  const [announcementType, setAnnouncementType] = useState<'info' | 'success' | 'warning' | 'vip'>(
    settings?.announcementType || 'vip'
  );
  const [announcementLinkText, setAnnouncementLinkText] = useState(settings?.announcementLinkText || 'Nâng cấp VIP');

  // Hero greeting
  const [heroGreeting, setHeroGreeting] = useState(
    settings?.heroGreeting || 'Luyện dịch mỗi ngày để phản xạ tiếng Anh tự nhiên'
  );
  const [heroSubtext, setHeroSubtext] = useState(
    settings?.heroSubtext || 'Học dịch từng câu, tra từ vựng thông minh và thi đấu Boss tiếng Anh'
  );

  // Contact links
  const [contactPhoneInput, setContactPhoneInput] = useState(settings?.contactPhone || '0987.654.321');
  const [contactZaloInput, setContactZaloInput] = useState(settings?.contactZalo || 'https://zalo.me/0987654321');
  const [contactEmailInput, setContactEmailInput] = useState(settings?.contactEmail || 'hungpv2172002@gmail.com');
  const [contactFacebookInput, setContactFacebookInput] = useState(settings?.contactFacebook || 'https://facebook.com');
  const [contactTiktokInput, setContactTiktokInput] = useState(settings?.contactTiktok || 'https://tiktok.com');
  const [contactTelegramInput, setContactTelegramInput] = useState(settings?.contactTelegram || '');

  const [isSavingInterface, setIsSavingInterface] = useState(false);

  // Cập nhật khi settings prop thay đổi
  useEffect(() => {
    if (settings) {
      if (settings.appName) setAppNameInput(settings.appName);
      if (settings.appSubtitle !== undefined) setAppSubtitleInput(settings.appSubtitle);
      if (settings.appIcon) setSelectedIcon(settings.appIcon);
      if (settings.appIconType) setIconType(settings.appIconType);
      if (settings.themeColor) setThemeColor(settings.themeColor);
      if (settings.bgTheme) setBgTheme(settings.bgTheme);
      if (settings.showAnnouncement !== undefined) setShowAnnouncement(settings.showAnnouncement);
      if (settings.announcementText) setAnnouncementText(settings.announcementText);
      if (settings.announcementType) setAnnouncementType(settings.announcementType);
      if (settings.announcementLinkText !== undefined) setAnnouncementLinkText(settings.announcementLinkText);
      if (settings.heroGreeting) setHeroGreeting(settings.heroGreeting);
      if (settings.heroSubtext) setHeroSubtext(settings.heroSubtext);
      if (settings.contactPhone) setContactPhoneInput(settings.contactPhone);
      if (settings.contactZalo) setContactZaloInput(settings.contactZalo);
      if (settings.contactEmail) setContactEmailInput(settings.contactEmail);
      if (settings.contactFacebook) setContactFacebookInput(settings.contactFacebook);
      if (settings.contactTiktok) setContactTiktokInput(settings.contactTiktok);
      if (settings.contactTelegram) setContactTelegramInput(settings.contactTelegram);
    }
  }, [settings]);

  // ================= TAB 2: QUẢN LÝ TÀI KHOẢN =================
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [accountVipFilter, setAccountVipFilter] = useState<'all' | 'vip' | 'normal'>('all');
  const [accountList, setAccountList] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('app_managed_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return profiles;
  });

  // Modal Thêm / Sửa tài khoản
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Profile | null>(null);
  const [accountFormName, setAccountFormName] = useState('');
  const [accountFormEmail, setAccountFormEmail] = useState('');
  const [accountFormRole, setAccountFormRole] = useState<'user' | 'admin'>('user');
  const [accountFormVip, setAccountFormVip] = useState(false);
  const [accountFormPassword, setAccountFormPassword] = useState('');
  const [accountDeletingId, setAccountDeletingId] = useState<string | null>(null);
  const [updatingVipId, setUpdatingVipId] = useState<string | null>(null);

  // Đồng bộ accountList lên localStorage & prop
  const persistAccounts = (newAccounts: Profile[]) => {
    setAccountList(newAccounts);
    try {
      localStorage.setItem('app_managed_accounts', JSON.stringify(newAccounts));
    } catch (e) {}
    if (onUpdateProfiles) {
      onUpdateProfiles(newAccounts);
    }
  };

  // ================= TAB 3: QUẢN LÝ KHÁCH HÀNG (CRM) =================
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('app_managed_customers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_CUSTOMERS;
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');
  const [customerPackageFilter, setCustomerPackageFilter] = useState<string>('all');

  // Modal Thêm / Sửa Khách hàng
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormPackage, setCustFormPackage] = useState<CustomerPackage>('vip_month');
  const [custFormStatus, setCustFormStatus] = useState<CustomerStatus>('new');
  const [custFormDealValue, setCustFormDealValue] = useState<number>(199000);
  const [custFormSource, setCustFormSource] = useState('Website');
  const [custFormNotes, setCustFormNotes] = useState('');

  const persistCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    try {
      localStorage.setItem('app_managed_customers', JSON.stringify(newCustomers));
    } catch (e) {}
  };

  // ================= TAB 4: CÔNG CỤ AI =================
  const [selectedGenCategory, setSelectedGenCategory] = useState<string>('general');

  // Quyền truy cập Admin: BẮT BUỘC ĐÚNG EMAIL hungpv2172002@gmail.com
  const isAdmin = currentUser?.email?.toLowerCase().trim() === 'hungpv2172002@gmail.com';

  // ================= THAO TÁC LƯU GIAO DIỆN =================
  const handleSaveInterface = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNameInput.trim()) {
      setToast({ type: 'error', text: 'Tên ứng dụng không được để trống!' });
      return;
    }

    setIsSavingInterface(true);
    const newSettings: AppSettings = {
      appName: appNameInput.trim(),
      appSubtitle: appSubtitleInput.trim(),
      appIcon: selectedIcon,
      appIconType: iconType,
      themeColor,
      bgTheme,
      showAnnouncement,
      announcementText: announcementText.trim(),
      announcementType,
      announcementLinkText: announcementLinkText.trim(),
      heroGreeting: heroGreeting.trim(),
      heroSubtext: heroSubtext.trim(),
      contactPhone: contactPhoneInput.trim(),
      contactZalo: contactZaloInput.trim(),
      contactEmail: contactEmailInput.trim(),
      contactFacebook: contactFacebookInput.trim(),
      contactTiktok: contactTiktokInput.trim(),
      contactTelegram: contactTelegramInput.trim(),
    };

    try {
      localStorage.setItem('app_custom_settings', JSON.stringify(newSettings));
      localStorage.setItem(
        'app_contact_settings',
        JSON.stringify({
          contactPhone: newSettings.contactPhone,
          contactZalo: newSettings.contactZalo,
          contactEmail: newSettings.contactEmail,
          contactFacebook: newSettings.contactFacebook,
          contactTiktok: newSettings.contactTiktok,
          contactTelegram: newSettings.contactTelegram,
        })
      );
    } catch (e) {}

    try {
      if (onSaveSettings) {
        await onSaveSettings(newSettings);
      } else {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
      }

      setToast({
        type: 'success',
        text: `Đã lưu giao diện thành công! Tên ứng dụng: "${newSettings.appName}".`,
      });
    } catch (err: any) {
      setToast({
        type: 'success',
        text: 'Đã lưu cài đặt giao diện vào bộ nhớ trình duyệt!',
      });
    } finally {
      setIsSavingInterface(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ================= THAO TÁC TÀI KHOẢN =================
  const handleToggleVipClick = async (user: Profile) => {
    setUpdatingVipId(user.id);
    try {
      await onToggleVip(user);
      const updated = accountList.map((p) =>
        p.id === user.id ? { ...p, is_vip: !p.is_vip } : p
      );
      persistAccounts(updated);
      setToast({
        type: 'success',
        text: `Đã ${user.is_vip ? 'hạ xuống thường' : 'nâng cấp VIP'} cho tài khoản ${user.full_name || user.email}!`,
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || 'Lỗi khi cập nhật trạng thái VIP.' });
    } finally {
      setUpdatingVipId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleToggleRoleClick = (user: Profile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const updated = accountList.map((p) =>
      p.id === user.id ? { ...p, role: newRole as 'admin' | 'user' } : p
    );
    persistAccounts(updated);
    setToast({
      type: 'success',
      text: `Đã chuyển đổi vai trò của ${user.full_name || user.email} sang ${newRole === 'admin' ? 'Quản trị viên' : 'Học viên'}!`,
    });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenAccountModal = (account?: Profile) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormName(account.full_name || '');
      setAccountFormEmail(account.email);
      setAccountFormRole(account.role);
      setAccountFormVip(account.is_vip);
      setAccountFormPassword('');
    } else {
      setEditingAccount(null);
      setAccountFormName('');
      setAccountFormEmail('');
      setAccountFormRole('user');
      setAccountFormVip(false);
      setAccountFormPassword('123456');
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccountForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormEmail.trim()) {
      setToast({ type: 'error', text: 'Email không được để trống!' });
      return;
    }

    if (editingAccount) {
      // Sửa tài khoản
      const updated = accountList.map((p) => {
        if (p.id === editingAccount.id) {
          return {
            ...p,
            full_name: accountFormName.trim() || p.full_name,
            email: accountFormEmail.trim().toLowerCase(),
            role: accountFormRole,
            is_vip: accountFormVip,
          };
        }
        return p;
      });
      persistAccounts(updated);
      setToast({ type: 'success', text: `Đã cập nhật thông tin tài khoản ${accountFormEmail}!` });
    } else {
      // Tạo tài khoản mới
      const newAcc: Profile = {
        id: `user-${Date.now().toString(36)}`,
        email: accountFormEmail.trim().toLowerCase(),
        full_name: accountFormName.trim() || accountFormEmail.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${accountFormEmail.trim()}`,
        role: accountFormRole,
        is_vip: accountFormVip,
        created_at: new Date().toISOString(),
      };
      persistAccounts([newAcc, ...accountList]);
      setToast({ type: 'success', text: `Đã tạo tài khoản mới: ${newAcc.email}!` });
    }

    setIsAccountModalOpen(false);
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeleteAccount = (id: string) => {
    const target = accountList.find((p) => p.id === id);
    if (!target) return;
    if (target.email === 'hungpv2172002@gmail.com') {
      setToast({ type: 'error', text: 'Không thể xóa tài khoản Quản trị viên tối cao!' });
      setAccountDeletingId(null);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const remaining = accountList.filter((p) => p.id !== id);
    persistAccounts(remaining);
    setAccountDeletingId(null);
    setToast({ type: 'success', text: `Đã xóa tài khoản ${target.full_name || target.email} khỏi hệ thống.` });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportAccountsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(accountList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `danh_sach_tai_khoan_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToast({ type: 'success', text: 'Đã xuất file JSON danh sách tài khoản!' });
    setTimeout(() => setToast(null), 3000);
  };

  // Lọc tài khoản
  const filteredAccounts = useMemo(() => {
    return accountList.filter((p) => {
      const matchSearch =
        p.email.toLowerCase().includes(accountSearch.toLowerCase().trim()) ||
        (p.full_name && p.full_name.toLowerCase().includes(accountSearch.toLowerCase().trim())) ||
        p.id.toLowerCase().includes(accountSearch.toLowerCase().trim());

      const matchRole =
        accountRoleFilter === 'all'
          ? true
          : accountRoleFilter === 'admin'
          ? p.role === 'admin'
          : p.role === 'user';

      const matchVip =
        accountVipFilter === 'all'
          ? true
          : accountVipFilter === 'vip'
          ? p.is_vip
          : !p.is_vip;

      return matchSearch && matchRole && matchVip;
    });
  }, [accountList, accountSearch, accountRoleFilter, accountVipFilter]);

  // ================= THAO TÁC KHÁCH HÀNG CRM =================
  const handleOpenCustomerModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustFormName(cust.full_name);
      setCustFormPhone(cust.phone);
      setCustFormEmail(cust.email);
      setCustFormPackage(cust.package_interest);
      setCustFormStatus(cust.status);
      setCustFormDealValue(cust.deal_value);
      setCustFormSource(cust.source);
      setCustFormNotes(cust.notes);
    } else {
      setEditingCustomer(null);
      setCustFormName('');
      setCustFormPhone('');
      setCustFormEmail('');
      setCustFormPackage('vip_month');
      setCustFormStatus('new');
      setCustFormDealValue(199000);
      setCustFormSource('Website');
      setCustFormNotes('');
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFormName.trim() || !custFormPhone.trim()) {
      setToast({ type: 'error', text: 'Vui lòng điền Họ tên và Số điện thoại khách hàng!' });
      return;
    }

    if (editingCustomer) {
      const updated = customers.map((c) => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            full_name: custFormName.trim(),
            phone: custFormPhone.trim(),
            email: custFormEmail.trim(),
            package_interest: custFormPackage,
            status: custFormStatus,
            deal_value: Number(custFormDealValue) || 0,
            source: custFormSource.trim() || 'Website',
            notes: custFormNotes.trim(),
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      });
      persistCustomers(updated);
      setToast({ type: 'success', text: `Đã cập nhật khách hàng ${custFormName}!` });
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now().toString(36)}`,
        full_name: custFormName.trim(),
        phone: custFormPhone.trim(),
        email: custFormEmail.trim(),
        package_interest: custFormPackage,
        status: custFormStatus,
        deal_value: Number(custFormDealValue) || 0,
        source: custFormSource.trim() || 'Website',
        notes: custFormNotes.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      persistCustomers([newCust, ...customers]);
      setToast({ type: 'success', text: `Đã thêm khách hàng mới: ${newCust.full_name}!` });
    }

    setIsCustomerModalOpen(false);
    setTimeout(() => setToast(null), 4000);
  };

  const handleQuickChangeCustomerStatus = (id: string, newStatus: CustomerStatus) => {
    const updated = customers.map((c) => (c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c));
    persistCustomers(updated);
    setToast({ type: 'success', text: 'Đã cập nhật trạng thái chăm sóc khách hàng!' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteCustomer = (id: string) => {
    const target = customers.find((c) => c.id === id);
    if (!target) return;
    const remaining = customers.filter((c) => c.id !== id);
    persistCustomers(remaining);
    setToast({ type: 'success', text: `Đã xóa khách hàng ${target.full_name} khỏi CRM.` });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportCustomersCsv = () => {
    const headers = ['ID', 'Họ tên', 'Số điện thoại', 'Email', 'Gói quan tâm', 'Trạng thái', 'Doanh thu (VND)', 'Nguồn', 'Ghi chú', 'Ngày tạo'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.full_name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${c.package_interest}"`,
      `"${c.status}"`,
      c.deal_value,
      `"${c.source}"`,
      `"${c.notes.replace(/"/g, '""')}"`,
      c.created_at,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_khach_hang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setToast({ type: 'success', text: 'Đã xuất danh sách khách hàng ra file CSV Excel!' });
    setTimeout(() => setToast(null), 3000);
  };

  // Lọc danh sách khách hàng
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.full_name.toLowerCase().includes(customerSearch.toLowerCase().trim()) ||
        c.phone.includes(customerSearch.trim()) ||
        c.email.toLowerCase().includes(customerSearch.toLowerCase().trim());

      const matchStatus = customerStatusFilter === 'all' || c.status === customerStatusFilter;
      const matchPackage = customerPackageFilter === 'all' || c.package_interest === customerPackageFilter;

      return matchSearch && matchStatus && matchPackage;
    });
  }, [customers, customerSearch, customerStatusFilter, customerPackageFilter]);

  // Thống kê CRM
  const totalRevenue = useMemo(() => {
    return customers
      .filter((c) => c.status === 'converted' || c.status === 'vip_lifetime')
      .reduce((sum, c) => sum + (c.deal_value || 0), 0);
  }, [customers]);

  const convertedCount = useMemo(() => {
    return customers.filter((c) => c.status === 'converted' || c.status === 'vip_lifetime').length;
  }, [customers]);

  const conversionRate = useMemo(() => {
    if (customers.length === 0) return 0;
    return Math.round((convertedCount / customers.length) * 100);
  }, [customers.length, convertedCount]);

  // MÀN HÌNH MỞ KHÓA NẾU CHƯA CÓ QUYỀN ADMIN
  // MÀN HÌNH BẢO MẬT NẾU CHƯA ĐĂNG NHẬP ĐÚNG GMAIL hungpv2172002@gmail.com
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-8 sm:my-14 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/60 text-center space-y-6 animate-in fade-in transition-colors">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Khu vực bảo mật Admin</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Yêu Cầu Quyền Quản Trị Viên</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Trang quản trị này chỉ dành riêng cho Admin với địa chỉ Gmail chính chủ:{' '}
            <strong className="text-purple-700 dark:text-purple-400 font-mono">hungpv2172002@gmail.com</strong>.
            Chỉ khi đăng nhập bằng đúng tài khoản này bạn mới có quyền truy cập hệ thống.
          </p>
        </div>

        {/* Trạng thái tài khoản hiện tại */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Trạng thái tài khoản hiện tại:</span>
            {currentUser ? (
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{currentUser.email}</span>
            ) : (
              <span className="font-bold text-amber-600 dark:text-amber-400">Chưa đăng nhập</span>
            )}
          </div>
          {currentUser && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              ⚠️ Tài khoản <strong className="font-mono">{currentUser.email}</strong> không phải là tài khoản Quản trị viên (hungpv2172002@gmail.com).
            </p>
          )}
        </div>

        {/* Nút hành động */}
        <div className="space-y-3 pt-1">
          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-md shadow-purple-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Đăng nhập với hungpv2172002@gmail.com</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToStudy}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại phòng học</span>
          </button>
        </div>
      </div>
    );
  }

  // GIAO DIỆN QUẢN TRỊ VIÊN ĐẦY ĐỦ
  return (
    <div className="max-w-5xl w-full mx-auto space-y-6 overflow-x-hidden min-w-0">
      {/* Toast thông báo */}
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStudy}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Quay lại phòng học"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Bảng Quản Trị Hệ Thống</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản trị viên: <strong className="text-purple-700 dark:text-purple-400">{currentUser?.email || 'hungpv2172002@gmail.com'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Xem mã nguồn & file SQL Supabase"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Mã SQL Supabase</span>
            </button>
          )}
          <button
            onClick={onBackToStudy}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
          >
            Vào phòng học
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION: 4 PHÂN HỆ CHÍNH */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-2xl overflow-x-auto w-full max-w-full">
        <button
          onClick={() => setActiveTab('interface')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'interface'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>1. Sửa Giao Diện Trang</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'accounts'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>2. Quản Lý Tài Khoản</span>
          <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-black">
            {accountList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'customers'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>3. Quản Lý Khách Hàng (CRM)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
            {customers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ai_tools')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'ai_tools'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>4. Công Cụ Sinh Câu AI</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ================= TAB 1: SỬA GIAO DIỆN TRANG ================= */}
      {/* ============================================================== */}
      {activeTab === 'interface' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* LIVE PREVIEW BOX */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Xem trước giao diện thực tế (Live Preview)</span>
              </span>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                Hiển thị thời gian thực
              </span>
            </div>

            {/* Preview Announcement Bar */}
            {showAnnouncement && (
              <div
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2 ${
                  announcementType === 'vip'
                    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white'
                    : announcementType === 'success'
                    ? 'bg-emerald-600 text-white'
                    : announcementType === 'warning'
                    ? 'bg-amber-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                <span>{announcementText || 'Nội dung thông báo đầu trang...'}</span>
                {announcementLinkText && (
                  <span className="underline font-bold text-[11px] cursor-pointer">
                    {announcementLinkText} →
                  </span>
                )}
              </div>
            )}

            {/* Preview Header */}
            <div className="bg-white text-slate-900 rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <AppIcon icon={selectedIcon} type={iconType} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black">{appNameInput || 'Tên ứng dụng'}</h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-md">
                    {appSubtitleInput || 'Khẩu hiệu'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  ⚔️ Đấu Boss
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-bold">
                  🛡️ Quản lý
                </span>
              </div>
            </div>

            {/* Preview Footer Contacts */}
            <div className="bg-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">© 2026 {appNameInput || 'Tên ứng dụng'} • Chân trang liên hệ:</span>
              <FooterContact
                email={contactEmailInput}
                facebookUrl={contactFacebookInput}
                tiktokUrl={contactTiktokInput}
                phone={contactPhoneInput}
                zaloUrl={contactZaloInput}
              />
            </div>
          </div>

          {/* FORM SỬA GIAO DIỆN */}
          <form onSubmit={handleSaveInterface} className="space-y-6">
            {/* 1. THƯƠNG HIỆU & TÊN GỌI */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Palette className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    1. Tên gọi, Biểu tượng (Icon / Logo) & Khẩu hiệu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xuất hiện trên tiêu đề trang web, thanh Header và mạng xã hội
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tên Ứng Dụng:</label>
                  <input
                    type="text"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="VD: Dịch Mỗi Ngày, Luyện Dịch Siêu Tốc..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Khẩu hiệu / Mô tả phụ:</label>
                  <input
                    type="text"
                    value={appSubtitleInput}
                    onChange={(e) => setAppSubtitleInput(e.target.value)}
                    placeholder="VD: Dịch câu mỗi ngày kèm từ vựng gợi ý..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>
              </div>

              {/* CHỌN BIỂU TƯỢNG (ICON) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Chọn Biểu tượng (Icon):</label>
                  <span className="text-[11px] text-slate-400">
                    Đang chọn: <strong className="text-indigo-600">{selectedIcon}</strong> ({iconType})
                  </span>
                </div>

                {/* Lucide Vector Icons */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                    A. Biểu tượng vector hiện đại:
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
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-600 ring-2 ring-indigo-200 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                          }`}
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

                {/* Preset Emojis */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                    B. Hoặc chọn Emoji ngộ nghĩnh:
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

                {/* Custom Emoji / Text Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    placeholder="Gõ emoji hoặc icon tùy thích vào đây (VD: 🚀, 💡, 🌐)..."
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
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>

            {/* 2. THANH THÔNG BÁO CHẠY ĐẦU TRANG (ANNOUNCEMENT BAR) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Megaphone className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      2. Thanh Thông Báo Đầu Trang (Top Announcement Banner)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tạo banner thông báo khuyến mãi, sự kiện, tính năng mới chạy ngay trên cùng
                    </p>
                  </div>
                </div>

                {/* Bật / Tắt Switch */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-600">
                    {showAnnouncement ? 'Đang bật' : 'Đang tắt'}
                  </span>
                  <input
                    type="checkbox"
                    checked={showAnnouncement}
                    onChange={(e) => setShowAnnouncement(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500"
                  />
                </label>
              </div>

              {showAnnouncement && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Nội dung thông báo:</label>
                      <input
                        type="text"
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="VD: 🎉 Khuyến mãi VIP Trọn Đời giảm 50% hôm nay!..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Nút kêu gọi (CTA):</label>
                      <input
                        type="text"
                        value={announcementLinkText}
                        onChange={(e) => setAnnouncementLinkText(e.target.value)}
                        placeholder="VD: Nâng cấp VIP, Xem ngay..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  {/* Kiểu hiển thị màu sắc */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Tông màu banner thông báo:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'vip', label: '👑 VIP Gradient (Cam - Hồng - Tím)', cls: 'bg-gradient-to-r from-amber-500 to-purple-600 text-white' },
                        { id: 'success', label: '🟢 Xanh Lá Khuyến Mãi', cls: 'bg-emerald-600 text-white' },
                        { id: 'warning', label: '🟡 Vàng Cam Nổi Bật', cls: 'bg-amber-600 text-white' },
                        { id: 'info', label: '🔵 Xanh Indigo Công Nghệ', cls: 'bg-indigo-600 text-white' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAnnouncementType(item.id as any)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            announcementType === item.id
                              ? 'ring-2 ring-indigo-500 border-indigo-600 shadow-sm'
                              : 'border-slate-200 opacity-80 hover:opacity-100'
                          } ${item.cls}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. KÊNH LIÊN HỆ & HOTLINE CHÂN TRANG */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Phone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    3. Kênh Tư Vấn & Mạng Xã Hội Chân Trang (Footer)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Giúp học viên và khách hàng liên hệ tư vấn mua gói VIP qua Hotline, Zalo, Facebook, TikTok
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Hotline */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Số điện thoại / Hotline:</span>
                  </label>
                  <input
                    type="text"
                    value={contactPhoneInput}
                    onChange={(e) => setContactPhoneInput(e.target.value)}
                    placeholder="0987.654.321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium"
                  />
                </div>

                {/* Zalo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Link Zalo tư vấn:</span>
                  </label>
                  <input
                    type="text"
                    value={contactZaloInput}
                    onChange={(e) => setContactZaloInput(e.target.value)}
                    placeholder="https://zalo.me/0987654321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-hidden font-medium"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-rose-500" />
                    <span>Email hỗ trợ:</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmailInput}
                    onChange={(e) => setContactEmailInput(e.target.value)}
                    placeholder="hungpv2172002@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-rose-500 outline-hidden font-medium"
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" />
                    <span>Link Facebook Fanpage:</span>
                  </label>
                  <input
                    type="text"
                    value={contactFacebookInput}
                    onChange={(e) => setContactFacebookInput(e.target.value)}
                    placeholder="https://facebook.com/your-fanpage"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-hidden font-medium"
                  />
                </div>

                {/* TikTok */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-slate-900" />
                    <span>Link Kênh TikTok:</span>
                  </label>
                  <input
                    type="text"
                    value={contactTiktokInput}
                    onChange={(e) => setContactTiktokInput(e.target.value)}
                    placeholder="https://tiktok.com/@dailytranslation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-slate-800 outline-hidden font-medium"
                  />
                </div>

                {/* Telegram */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                    <span>Link Telegram (tùy chọn):</span>
                  </label>
                  <input
                    type="text"
                    value={contactTelegramInput}
                    onChange={(e) => setContactTelegramInput(e.target.value)}
                    placeholder="https://t.me/your_channel"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-sky-500 outline-hidden font-medium"
                  />
                </div>
              </div>
            </div>

            {/* NÚT LƯU CÀI ĐẶT GIAO DIỆN */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingInterface}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingInterface ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu giao diện...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Toàn Bộ Cài Đặt Giao Diện</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* ================= TAB 2: QUẢN LÝ TÀI KHOẢN =================== */}
      {/* ============================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* THẺ THỐNG KÊ TÀI KHOẢN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tổng tài khoản
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900">{accountList.length}</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tài khoản VIP
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-600">
                  {accountList.filter((p) => p.is_vip).length}
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Crown className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tài khoản thường
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-700">
                  {accountList.filter((p) => !p.is_vip).length}
                </span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <User className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Quản trị viên (Admin)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-purple-700">
                  {accountList.filter((p) => p.role === 'admin').length}
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* CÔNG CỤ TÌM KIẾM, LỌC & THÊM TÀI KHOẢN */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder="Tìm theo email, tên, id..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-purple-600 outline-hidden shadow-2xs"
                />
              </div>

              {/* Lọc Role */}
              <select
                value={accountRoleFilter}
                onChange={(e) => setAccountRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">Mọi vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="user">Học viên (User)</option>
              </select>

              {/* Lọc VIP */}
              <select
                value={accountVipFilter}
                onChange={(e) => setAccountVipFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="vip">Thành viên VIP</option>
                <option value="normal">Thành viên Thường</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportAccountsJson}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sao lưu danh sách tài khoản ra file JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAccountModal()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo tài khoản mới</span>
              </button>
            </div>
          </div>

          {/* BẢNG DANH SÁCH TÀI KHOẢN */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Tài khoản & Tên</th>
                    <th className="py-3 px-4">Gmail / Đăng nhập</th>
                    <th className="py-3 px-4">Ngày tạo</th>
                    <th className="py-3 px-4">Vai trò (Role)</th>
                    <th className="py-3 px-4">Trạng thái VIP</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Không tìm thấy tài khoản nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Avatar & Name */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <User className="w-4 h-4 text-purple-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {user.full_name || 'Học viên'}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {user.id.slice(0, 10)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {user.email}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(user.created_at).toLocaleDateString('vi-VN')}
                        </td>

                        {/* Role & Toggle Role */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleRoleClick(user)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Bấm để chuyển đổi giữa Quản trị viên và Học viên"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{user.role}</span>
                          </button>
                        </td>

                        {/* VIP Status & Toggle VIP */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleVipClick(user)}
                            disabled={updatingVipId === user.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              user.is_vip
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={user.is_vip ? 'Bấm để hạ xuống thành viên thường' : 'Bấm để nâng cấp VIP'}
                          >
                            {user.is_vip ? (
                              <>
                                <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                <span>VIP</span>
                              </>
                            ) : (
                              <span>Thường</span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAccountModal(user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin tài khoản"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {accountDeletingId === user.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <span className="text-[10px] text-rose-700 font-bold">Xóa?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAccount(user.id)}
                                  className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                                >
                                  Có
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAccountDeletingId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAccountDeletingId(user.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa tài khoản này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ================= TAB 3: QUẢN LÝ KHÁCH HÀNG CRM ============= */}
      {/* ============================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* THỐNG KÊ DOANH THU & CHỐT ĐƠN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tổng khách hàng
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900">{customers.length}</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Đã chốt mua gói VIP
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-600">{convertedCount}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Award className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tỷ lệ chốt đơn (CR)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-indigo-600">{conversionRate}%</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tổng doanh thu ước tính
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {totalRevenue.toLocaleString('vi-VN')} đ
                </span>
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* CÔNG CỤ TÌM KIẾM, LỌC & THÊM KHÁCH HÀNG */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Tìm theo tên, số điện thoại/Zalo, email..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-emerald-600 outline-hidden shadow-2xs"
                />
              </div>

              {/* Lọc Trạng Thái */}
              <select
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="new">🟢 Lead mới</option>
                <option value="consulting">🟡 Đang tư vấn</option>
                <option value="converted">🔵 Đã mua VIP</option>
                <option value="vip_lifetime">👑 VIP trọn đời</option>
                <option value="callback">⚪ Hẹn gọi lại</option>
                <option value="cancelled">🔴 Hủy / Không mua</option>
              </select>

              {/* Lọc Gói Quan Tâm */}
              <select
                value={customerPackageFilter}
                onChange={(e) => setCustomerPackageFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">Mọi gói</option>
                <option value="vip_month">Gói VIP Tháng (199k)</option>
                <option value="vip_year">Gói VIP Năm (599k)</option>
                <option value="vip_lifetime">Gói VIP Trọn Đời (999k)</option>
                <option value="course_it">Tiếng Anh IT (499k)</option>
                <option value="course_business">Tiếng Anh Kinh Doanh (499k)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCustomersCsv}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Xuất file CSV cho Excel / Google Sheets"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV Excel</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCustomerModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm khách hàng mới</span>
              </button>
            </div>
          </div>

          {/* BẢNG KHÁCH HÀNG CRM */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Khách hàng</th>
                    <th className="py-3 px-4">Số điện thoại / Zalo</th>
                    <th className="py-3 px-4">Gói quan tâm</th>
                    <th className="py-3 px-4">Trạng thái chăm sóc</th>
                    <th className="py-3 px-4">Doanh thu</th>
                    <th className="py-3 px-4">Ghi chú tư vấn</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Chưa có khách hàng nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & Source */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{cust.full_name}</p>
                            <span className="text-[10px] text-slate-400">
                              Nguồn: <strong>{cust.source}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Phone & Zalo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${cust.phone}`}
                              className="font-mono font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                              title="Bấm để gọi điện"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{cust.phone}</span>
                            </a>
                            <a
                              href={`https://zalo.me/${cust.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold"
                              title="Mở chat Zalo"
                            >
                              Zalo
                            </a>
                          </div>
                          {cust.email && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              {cust.email}
                            </span>
                          )}
                        </td>

                        {/* Package */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {cust.package_interest === 'vip_lifetime' ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                              👑 VIP Trọn Đời
                            </span>
                          ) : cust.package_interest === 'vip_year' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                              VIP 1 Năm
                            </span>
                          ) : cust.package_interest === 'vip_month' ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                              VIP 1 Tháng
                            </span>
                          ) : cust.package_interest === 'course_it' ? (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
                              💻 Tiếng Anh IT
                            </span>
                          ) : cust.package_interest === 'course_business' ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                              💼 Kinh Doanh
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                              Gói khác
                            </span>
                          )}
                        </td>

                        {/* Status dropdown */}
                        <td className="py-3.5 px-4">
                          <select
                            value={cust.status}
                            onChange={(e) => handleQuickChangeCustomerStatus(cust.id, e.target.value as any)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer outline-hidden ${
                              cust.status === 'converted' || cust.status === 'vip_lifetime'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : cust.status === 'consulting'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : cust.status === 'callback'
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : cust.status === 'new'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            <option value="new">🟢 Lead mới</option>
                            <option value="consulting">🟡 Đang tư vấn</option>
                            <option value="converted">🔵 Đã mua VIP</option>
                            <option value="vip_lifetime">👑 VIP trọn đời</option>
                            <option value="callback">⚪ Hẹn gọi lại</option>
                            <option value="cancelled">🔴 Hủy</option>
                          </select>
                        </td>

                        {/* Deal Value */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {cust.deal_value ? `${cust.deal_value.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={cust.notes}>
                          {cust.notes || <span className="text-slate-300 italic">Chưa có ghi chú</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomerModal(cust)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Sửa thông tin khách hàng"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(cust.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa khách hàng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ================= TAB 4: CÔNG CỤ SINH CÂU AI ================= */}
      {/* ============================================================== */}
      {activeTab === 'ai_tools' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-700/80 text-indigo-200 text-[11px] font-bold tracking-wider uppercase border border-indigo-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Gemini AI Engine (gemini-3.8-flash)</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  Tự động sinh 10 câu dịch chất lượng cao bằng Gemini AI
                </h3>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Gọi endpoint <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">/api/cron/generate</code> để tạo các câu dịch tiếng Việt kèm từ vựng then chốt và các đáp án chuẩn tiếng Anh nạp trực tiếp vào kho bài tập.
                </p>

                {/* Chọn chuyên ngành */}
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
        </div>
      )}

      {/* ============================================================== */}
      {/* ================= MODAL THÊM / SỬA TÀI KHOẢN ================= */}
      {/* ============================================================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{editingAccount ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountForm} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Họ và tên:</label>
                <input
                  type="text"
                  value={accountFormName}
                  onChange={(e) => setAccountFormName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-hidden font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Email đăng nhập (*):</label>
                <input
                  type="email"
                  value={accountFormEmail}
                  onChange={(e) => setAccountFormEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-hidden font-medium"
                  required
                />
              </div>

              {!editingAccount && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Mật khẩu ban đầu:</label>
                  <input
                    type="text"
                    value={accountFormPassword}
                    onChange={(e) => setAccountFormPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-hidden font-medium font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Vai trò (Role):</label>
                  <select
                    value={accountFormRole}
                    onChange={(e) => setAccountFormRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="user">Học viên (User)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Trạng thái VIP:</label>
                  <select
                    value={accountFormVip ? 'yes' : 'no'}
                    onChange={(e) => setAccountFormVip(e.target.value === 'yes')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="no">Thành viên Thường</option>
                    <option value="yes">👑 Thành viên VIP</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  {editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ================= MODAL THÊM / SỬA KHÁCH HÀNG CRM ============ */}
      {/* ============================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{editingCustomer ? 'Chỉnh sửa thông tin khách hàng' : 'Thêm khách hàng mới vào CRM'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Họ và tên khách (*):</label>
                  <input
                    type="text"
                    value={custFormName}
                    onChange={(e) => setCustFormName(e.target.value)}
                    placeholder="VD: Nguyễn Thu Hà..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Số điện thoại / Zalo (*):</label>
                  <input
                    type="text"
                    value={custFormPhone}
                    onChange={(e) => setCustFormPhone(e.target.value)}
                    placeholder="0982.112.334"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email khách hàng:</label>
                  <input
                    type="email"
                    value={custFormEmail}
                    onChange={(e) => setCustFormEmail(e.target.value)}
                    placeholder="ha.nguyen@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nguồn khách hàng:</label>
                  <select
                    value={custFormSource}
                    onChange={(e) => setCustFormSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="Website">Website trực tiếp</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="TikTok">TikTok Video</option>
                    <option value="Zalo">Zalo tư vấn</option>
                    <option value="Bạn bè giới thiệu">Bạn bè giới thiệu</option>
                    <option value="Google Search">Tìm kiếm Google</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Gói quan tâm:</label>
                  <select
                    value={custFormPackage}
                    onChange={(e) => {
                      const val = e.target.value as CustomerPackage;
                      setCustFormPackage(val);
                      if (val === 'vip_month') setCustFormDealValue(199000);
                      else if (val === 'vip_year') setCustFormDealValue(599000);
                      else if (val === 'vip_lifetime') setCustFormDealValue(999000);
                      else if (val === 'course_it' || val === 'course_business') setCustFormDealValue(499000);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="vip_month">VIP 1 Tháng (199k)</option>
                    <option value="vip_year">VIP 1 Năm (599k)</option>
                    <option value="vip_lifetime">VIP Trọn Đời (999k)</option>
                    <option value="course_it">Tiếng Anh IT (499k)</option>
                    <option value="course_business">Kinh Doanh (499k)</option>
                    <option value="custom">Gói khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Trạng thái:</label>
                  <select
                    value={custFormStatus}
                    onChange={(e) => setCustFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="new">🟢 Lead mới</option>
                    <option value="consulting">🟡 Đang tư vấn</option>
                    <option value="converted">🔵 Đã mua VIP</option>
                    <option value="vip_lifetime">👑 VIP trọn đời</option>
                    <option value="callback">⚪ Hẹn gọi lại</option>
                    <option value="cancelled">🔴 Hủy</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Doanh thu (VND):</label>
                  <input
                    type="number"
                    value={custFormDealValue}
                    onChange={(e) => setCustFormDealValue(Number(e.target.value))}
                    placeholder="199000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Ghi chú tư vấn & nhu cầu học:</label>
                <textarea
                  rows={2}
                  value={custFormNotes}
                  onChange={(e) => setCustFormNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết trao đổi với khách hàng (VD: Đã chuyển khoản Vietcombank, cần xuất hóa đơn, hẹn gọi lại...)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  {editingCustomer ? 'Lưu thay đổi' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
