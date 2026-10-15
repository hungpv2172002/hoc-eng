import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  X,
  Swords,
  Search,
  CheckCircle2,
  AlertCircle,
  Mail,
  Trash2,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Friend, Profile } from '../types';
import { addFriendByEmail, removeFriend } from '../lib/friendsStorage';
import { playSlashSound, playCriticalSound, playPlayerHurtSound } from '../lib/soundFx';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  friends: Friend[];
  onFriendsUpdated: (newFriends: Friend[]) => void;
  onChallengeFriend: (friend: Friend) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friends,
  onFriendsUpdated,
  onChallengeFriend,
}) => {
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddFriend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!friendEmailInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = addFriendByEmail(
      friendEmailInput.trim(),
      currentUser?.email,
      []
    );

    if (result.success && result.friend) {
      playCriticalSound();
      setFeedback({ type: 'success', text: result.message });
      setFriendEmailInput('');
      onFriendsUpdated([result.friend, ...friends.filter((f) => f.id !== result.friend!.id)]);
    } else {
      playPlayerHurtSound();
      setFeedback({ type: 'error', text: result.message });
    }

    setIsSubmitting(false);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleRemove = (friendId: string, friendName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${friendName}?`)) {
      playPlayerHurtSound();
      const updated = removeFriend(friendId, currentUser?.email);
      onFriendsUpdated(updated);
      setFeedback({
        type: 'success',
        text: `Đã hủy kết bạn với ${friendName}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Bạn bè & Thách đấu</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  {friends.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kết bạn bằng Gmail để cùng so tài dịch thuật 1v1 song song
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* KHỐI THÊM BẠN BÈ BẰNG GMAIL */}
        <form
          onSubmit={handleAddFriend}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5 shrink-0"
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Thêm bạn bè mới qua Gmail</span>
            </label>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              Nhập Gmail của bạn
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="VD: ban.cua.toi@gmail.com"
                value={friendEmailInput}
                onChange={(e) => setFriendEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={!friendEmailInput.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Kết bạn</span>
            </button>
          </div>
        </form>

        {/* Thanh tìm kiếm trong danh sách bạn bè */}
        {friends.length > 3 && (
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm bạn theo tên hoặc Gmail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* DANH SÁCH BẠN BÈ */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px]">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs">
                {searchQuery
                  ? 'Không tìm thấy bạn bè nào khớp với từ khóa tìm kiếm.'
                  : 'Chưa có bạn bè nào. Hãy nhập Gmail ở trên để kết bạn ngay!'}
              </p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                {/* Thông tin bạn */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        friend.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`
                      }
                      alt={friend.name}
                      className="w-10 h-10 rounded-xl ring-2 ring-indigo-400 shadow-xs object-cover"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        friend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      title={friend.status === 'online' ? 'Đang online' : 'Ngoại tuyến'}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                        {friend.name}
                      </span>
                      {friend.is_vip && (
                        <span className="p-0.5 rounded-full bg-amber-100 text-amber-600">
                          <Crown className="w-2.5 h-2.5 fill-amber-500" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      {friend.email}
                    </span>
                  </div>
                </div>

                {/* Các nút hành động */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Nút Thách đấu bạn bè */}
                  <button
                    onClick={() => {
                      playSlashSound();
                      onChallengeFriend(friend);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title={`Thách đấu 1v1 ngay với ${friend.name}`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Thách đấu</span>
                  </button>

                  {/* Nút xóa bạn */}
                  <button
                    onClick={() => handleRemove(friend.id, friend.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Hủy kết bạn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span>💡 Khi thách đấu, bạn bè sẽ nhận liên kết phòng đấu trực tiếp.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
