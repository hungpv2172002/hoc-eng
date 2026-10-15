import { Friend, Profile } from '../types';
import { syncFriendsCount } from './badgeSystem';

const INITIAL_FRIENDS: Friend[] = [
  {
    id: 'friend-nam',
    email: 'nam.nguyen@gmail.com',
    name: 'Nguyễn Văn Nam',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NamNguyen',
    added_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'online',
    is_vip: false,
  },
  {
    id: 'friend-hoa',
    email: 'hoa.tran@gmail.com',
    name: 'Trần Thị Hoa',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoaTran',
    added_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'online',
    is_vip: true,
  },
  {
    id: 'friend-linh',
    email: 'linh.le@gmail.com',
    name: 'Lê Thùy Linh',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LinhLe',
    added_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'offline',
    is_vip: false,
  },
];

function getStorageKey(userEmail?: string): string {
  const normalized = (userEmail || 'default').toLowerCase().trim();
  return `app_user_friends_${normalized}`;
}

export function getFriendsList(userEmail?: string): Friend[] {
  try {
    const key = getStorageKey(userEmail);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  // Trả về danh sách khởi tạo mẫu ban đầu
  return INITIAL_FRIENDS;
}

export function saveFriendsList(friends: Friend[], userEmail?: string): void {
  try {
    const key = getStorageKey(userEmail);
    localStorage.setItem(key, JSON.stringify(friends));
  } catch (e) {}
}

export function addFriendByEmail(
  friendEmail: string,
  userEmail?: string,
  allProfiles: Profile[] = []
): { success: boolean; message: string; friend?: Friend } {
  const cleanTargetEmail = (friendEmail || '').trim().toLowerCase();
  const cleanUserEmail = (userEmail || '').trim().toLowerCase();

  // 1. Kiểm tra định dạng email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanTargetEmail || !emailRegex.test(cleanTargetEmail)) {
    return {
      success: false,
      message: 'Địa chỉ Gmail không đúng định dạng. Ví dụ: ban.cua.ban@gmail.com',
    };
  }

  // 2. Không được tự kết bạn với chính mình
  if (cleanUserEmail && cleanTargetEmail === cleanUserEmail) {
    return {
      success: false,
      message: 'Bạn không thể tự kết bạn với địa chỉ Gmail của chính mình.',
    };
  }

  const currentFriends = getFriendsList(userEmail);

  // 3. Đã có trong danh sách bạn bè chưa
  const existing = currentFriends.find(
    (f) => f.email.toLowerCase() === cleanTargetEmail
  );
  if (existing) {
    return {
      success: false,
      message: `Bạn và ${existing.name} (${existing.email}) đã là bạn bè từ trước!`,
      friend: existing,
    };
  }

  // 4. Tìm kiếm trong danh sách tài khoản đã đăng ký (allProfiles hoặc app_registered_users)
  let foundProfile = allProfiles.find(
    (p) => p.email?.toLowerCase() === cleanTargetEmail
  );

  if (!foundProfile) {
    try {
      const registered = localStorage.getItem('app_registered_users');
      if (registered) {
        const list = JSON.parse(registered);
        if (Array.isArray(list)) {
          const match = list.find(
            (u: any) => u.email?.toLowerCase() === cleanTargetEmail
          );
          if (match) {
            foundProfile = {
              id: match.id || `user-${Date.now()}`,
              email: match.email,
              full_name: match.full_name || match.email.split('@')[0],
              avatar_url:
                match.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanTargetEmail}`,
              role: match.role || 'user',
              is_vip: match.is_vip || false,
              created_at: match.created_at || new Date().toISOString(),
            };
          }
        }
      }
    } catch (e) {}
  }

  // Nếu không có sẵn tên trong hệ thống, tự động chuẩn hóa tên từ phần username của email
  const namePart = cleanTargetEmail.split('@')[0];
  const formattedName =
    foundProfile?.full_name ||
    namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const newFriend: Friend = {
    id: foundProfile?.id || `friend-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email: cleanTargetEmail,
    name: formattedName,
    avatar_url:
      foundProfile?.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanTargetEmail}`,
    added_at: new Date().toISOString(),
    status: 'online',
    is_vip: foundProfile?.is_vip || false,
  };

  const updatedFriends = [newFriend, ...currentFriends];
  saveFriendsList(updatedFriends, userEmail);
  syncFriendsCount(updatedFriends.length, userEmail);

  return {
    success: true,
    message: `Đã kết bạn thành công với ${newFriend.name} (${newFriend.email})!`,
    friend: newFriend,
  };
}

export function removeFriend(friendId: string, userEmail?: string): Friend[] {
  const currentFriends = getFriendsList(userEmail);
  const updated = currentFriends.filter((f) => f.id !== friendId);
  saveFriendsList(updated, userEmail);
  return updated;
}
