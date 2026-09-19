import React, { useState } from 'react';
import { Mail, Facebook, Music2, ExternalLink, Check, Copy } from 'lucide-react';

interface FooterContactProps {
  email?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  className?: string;
}

export const FooterContact: React.FC<FooterContactProps> = ({
  email = 'hungpv2172002@gmail.com',
  facebookUrl = 'https://facebook.com',
  tiktokUrl = 'https://tiktok.com',
  className = '',
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Chuẩn hóa định dạng email và links
  const cleanEmail = email?.trim() || 'hungpv2172002@gmail.com';
  const mailtoHref = cleanEmail.startsWith('mailto:') ? cleanEmail : `mailto:${cleanEmail}`;

  const cleanFacebook = facebookUrl?.trim() || 'https://facebook.com';
  const formattedFacebook = cleanFacebook.startsWith('http://') || cleanFacebook.startsWith('https://')
    ? cleanFacebook
    : `https://${cleanFacebook}`;

  const cleanTiktok = tiktokUrl?.trim() || 'https://tiktok.com';
  const formattedTiktok = cleanTiktok.startsWith('http://') || cleanTiktok.startsWith('https://')
    ? cleanTiktok
    : `https://${cleanTiktok}`;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(cleanEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      window.location.href = mailtoHref;
    }
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* 1. ICON EMAIL */}
      <div className="relative group">
        <a
          href={mailtoHref}
          title={`Gửi Email tới ${cleanEmail}`}
          aria-label={`Gửi Email tới ${cleanEmail}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-all duration-200 shadow-2xs group-hover:scale-105"
        >
          <div className="w-6 h-6 rounded-full bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold hidden md:inline">Email</span>
        </a>

        {/* Nút copy email nhanh bên cạnh */}
        <button
          type="button"
          onClick={handleCopyEmail}
          title="Sao chép địa chỉ Email"
          className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md"
        >
          {copiedEmail ? 'Đã sao chép email!' : cleanEmail}
        </button>
      </div>

      {/* 2. ICON FACEBOOK */}
      <div className="relative group">
        <a
          href={formattedFacebook}
          target="_blank"
          rel="noopener noreferrer"
          title="Kết nối qua Facebook"
          aria-label="Liên hệ qua Facebook"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 hover:border-blue-200 transition-all duration-200 shadow-2xs group-hover:scale-105"
        >
          <div className="w-6 h-6 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
            <Facebook className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold hidden md:inline">Facebook</span>
        </a>

        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
          Mở Facebook
        </div>
      </div>

      {/* 3. ICON TIKTOK */}
      <div className="relative group">
        <a
          href={formattedTiktok}
          target="_blank"
          rel="noopener noreferrer"
          title="Kênh TikTok chính thức"
          aria-label="Kênh TikTok"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200/80 hover:border-slate-800 transition-all duration-200 shadow-2xs group-hover:scale-105"
        >
          <div className="w-6 h-6 rounded-full bg-slate-200 group-hover:bg-slate-800 text-slate-800 group-hover:text-cyan-300 flex items-center justify-center shrink-0 transition-colors">
            <Music2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold hidden md:inline">TikTok</span>
        </a>

        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
          Mở TikTok
        </div>
      </div>
    </div>
  );
};
