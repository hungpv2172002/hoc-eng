import React from 'react';
import {
  BookOpen,
  Sparkles,
  Languages,
  Globe,
  GraduationCap,
  Flame,
  Brain,
  MessageSquare,
  Zap,
  Heart,
  Award,
  Compass,
  Star,
  Bookmark,
} from 'lucide-react';

export const AVAILABLE_LUCIDE_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  BookOpen,
  Languages,
  Sparkles,
  Globe,
  GraduationCap,
  Flame,
  Brain,
  MessageSquare,
  Zap,
  Heart,
  Award,
  Compass,
  Star,
  Bookmark,
};

export const PRESET_ICONS = [
  { id: 'BookOpen', label: 'Sách mở', type: 'lucide' as const },
  { id: 'Languages', label: 'Đa ngôn ngữ', type: 'lucide' as const },
  { id: 'Sparkles', label: 'Tỏa sáng AI', type: 'lucide' as const },
  { id: 'GraduationCap', label: 'Mũ học cử nhân', type: 'lucide' as const },
  { id: 'Flame', label: 'Ngọn lửa nhiệt huyết', type: 'lucide' as const },
  { id: 'Globe', label: 'Toàn cầu', type: 'lucide' as const },
  { id: 'Brain', label: 'Trí tuệ', type: 'lucide' as const },
  { id: 'MessageSquare', label: 'Hội thoại', type: 'lucide' as const },
  { id: 'Zap', label: 'Tốc độ tia chớp', type: 'lucide' as const },
];

export const PRESET_EMOJIS = ['📖', '🇬🇧', '🇻🇳', '🌟', '💬', '⚡', '🎯', '🚀', '💡', '🎓', '🔥', '🌐'];

interface AppIconProps {
  icon?: string;
  type?: 'lucide' | 'emoji';
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  icon = 'BookOpen',
  type = 'lucide',
  className = 'w-5 h-5',
}) => {
  // Nếu là emoji hoặc chứa ký tự đặc biệt/emoji
  if (type === 'emoji' || (icon && !AVAILABLE_LUCIDE_ICONS[icon])) {
    return (
      <span className="inline-flex items-center justify-center text-lg leading-none select-none" role="img" aria-label="app-icon">
        {icon || '📖'}
      </span>
    );
  }

  const IconComponent = AVAILABLE_LUCIDE_ICONS[icon] || BookOpen;
  return <IconComponent className={className} />;
};
