import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Swords,
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  Trophy,
  ArrowLeft,
  Volume2,
  Clock,
  RotateCcw,
  Zap,
  Flame,
  Shield,
  Send,
  Delete,
  X,
  Keyboard,
  MousePointerClick,
  Crown,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Profile,
  DuelRoomState,
  DuelParticipant,
  DuelQuestionItem,
  DuelEmote,
  CareerCategory,
  CAREER_TRACKS,
  Friend,
} from '../types';
import { getFriendsList, addFriendByEmail, removeFriend } from '../lib/friendsStorage';
import { recordDuelWin } from '../lib/badgeSystem';
import { normalizeSentence } from './StudyView';
import { playSpeech } from './AudioButton';
import {
  playSlashSound,
  playCriticalSound,
  playMonsterHurtSound,
  playPlayerHurtSound,
  playVictorySound,
  playDefeatSound,
} from '../lib/soundFx';

interface DuelBattleViewProps {
  profile: Profile | null;
  onBackToStudy: () => void;
  initialRoomId?: string | null;
  allProfiles?: Profile[];
  friends?: Friend[];
  onFriendsUpdated?: (newFriends: Friend[]) => void;
}

interface AssembledToken {
  id: string;
  word: string;
}

const EMOTE_LIST: DuelEmote[] = ['🔥', '⚡', '😎', '😱', '👏', '🏆', '💪', '⚔️'];

// Từ nhiễu tiếng Anh để trộn vào khay từ tạo độ thử thách vừa phải
const DISTRACTOR_WORDS = [
  'always',
  'never',
  'very',
  'really',
  'already',
  'today',
  'now',
  'then',
  'great',
  'well',
  'also',
  'soon',
  'here',
  'there',
  'good',
  'more',
];

export const DuelBattleView: React.FC<DuelBattleViewProps> = ({
  profile,
  onBackToStudy,
  initialRoomId,
  allProfiles = [],
  friends: propFriends,
  onFriendsUpdated,
}) => {
  // 1. Quản lý danh tính người chơi
  const [guestName, setGuestName] = useState(() => {
    try {
      const saved = localStorage.getItem('duel_guest_name');
      if (saved) return saved;
    } catch (e) {}
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `Chiến binh #${randNum}`;
  });

  // Quản lý danh sách bạn bè kết bạn bằng Gmail
  const [friendsList, setFriendsList] = useState<Friend[]>(() => {
    if (propFriends && propFriends.length > 0) return propFriends;
    return getFriendsList(profile?.email);
  });
  const [newFriendGmail, setNewFriendGmail] = useState('');
  const [friendFormFeedback, setFriendFormFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (propFriends) {
      setFriendsList(propFriends);
    }
  }, [propFriends]);

  const handleAddFriendFromLobby = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFriendGmail.trim()) return;

    const res = addFriendByEmail(newFriendGmail.trim(), profile?.email, allProfiles);
    if (res.success && res.friend) {
      playCriticalSound();
      const updated = [res.friend, ...friendsList.filter((f) => f.id !== res.friend!.id)];
      setFriendsList(updated);
      if (onFriendsUpdated) onFriendsUpdated(updated);
      setNewFriendGmail('');
      setFriendFormFeedback({ type: 'success', text: res.message });
    } else {
      playPlayerHurtSound();
      setFriendFormFeedback({ type: 'error', text: res.message });
    }
    setTimeout(() => setFriendFormFeedback(null), 4000);
  };

  const handleRemoveFriendFromLobby = (friendId: string, friendName: string) => {
    if (window.confirm(`Hủy kết bạn với ${friendName}?`)) {
      playPlayerHurtSound();
      const updated = removeFriend(friendId, profile?.email);
      setFriendsList(updated);
      if (onFriendsUpdated) onFriendsUpdated(updated);
    }
  };

  const playerId = useMemo(() => {
    if (profile?.id) return profile.id;
    try {
      const saved = localStorage.getItem('duel_guest_id');
      if (saved) return saved;
      const newId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('duel_guest_id', newId);
      return newId;
    } catch (e) {
      return `guest-${Date.now()}`;
    }
  }, [profile]);

  const playerName = profile?.full_name || profile?.email?.split('@')[0] || guestName;
  const playerAvatar =
    profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`;

  const [onlinePlayers, setOnlinePlayers] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([]);
  const [invitation, setInvitation] = useState<{ inviteId: string; fromName: string; expiresAt: number } | null>(null);
  const pendingInvite = useRef<{ targetId?: string; targetEmail?: string } | null>(null);
  const finishedRoom = useRef<string | null>(null);
  const messageHandler = useRef<(data: any) => void>(() => {});
  useEffect(() => {
    if (!invitation) return;
    const timer = setTimeout(() => setInvitation(null), Math.max(0, invitation.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [invitation]);

  // 2. Trạng thái kết nối WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');

  // 3. Trạng thái phòng & Trận đấu
  const [roomState, setRoomState] = useState<DuelRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>(playerId);
  const [isHost, setIsHost] = useState(false);

  // 4. Tab điều hướng ở sảnh: 'friends' (Thách đấu bạn) | 'quick' (Ghép ngẫu nhiên) | 'learners' (Chọn bạn trên trang)
  const [lobbyTab, setLobbyTab] = useState<'friends' | 'quick' | 'learners'>('friends');
  const [roomInputCode, setRoomInputCode] = useState(initialRoomId || '');
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Cấu hình khi tạo phòng (Chủ phòng)
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(5);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 5. Trạng thái Đếm ngược 3... 2... 1...
  const [countdown, setCountdown] = useState<number | null>(null);

  // 6. Trạng thái Gameplay
  const [inputMode, setInputMode] = useState<'tokens' | 'keyboard'>('tokens');
  const [assembledTokens, setAssembledTokens] = useState<AssembledToken[]>([]);
  const [userSentence, setUserSentence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    correct: boolean;
    text: string;
    points?: number;
    isFirst?: boolean;
  } | null>(null);

  // Đối thủ đang gõ phím (Live Typing Indicator)
  const [opponentIsTyping, setOpponentIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Thông báo sự kiện nổi (Toasts/Events)
  const [floatingAlert, setFloatingAlert] = useState<string | null>(null);
  const [activeEmotes, setActiveEmotes] = useState<
    Array<{ id: string; emote: string; senderName: string }>
  >([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Gửi thông điệp qua WebSocket
  const sendWs = useCallback((payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    setFloatingAlert('Chưa kết nối máy chủ đấu. Hãy kết nối lại.');
    return false;
  }, []);

  // Khởi tạo kết nối WebSocket
  const connectWs = useCallback(() => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setConnectionStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = (import.meta as any).env.VITE_DUEL_WS_URL || `${protocol}//${window.location.host}/ws/duel`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus('connected');
        ws.send(JSON.stringify({ type: 'register_lobby', player: { id: playerId, name: playerName, avatar_url: playerAvatar, email: profile?.email } }));
        // Nếu có initialRoomId từ URL param (?duel=DUEL-xxxx)
        if (initialRoomId) {
          ws.send(
            JSON.stringify({
              type: 'join_room',
              roomId: initialRoomId.toUpperCase().trim(),
              player: {
                id: playerId,
                name: playerName,
                avatar_url: playerAvatar,
              },
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageHandler.current(data);
        } catch (e) {
          console.error('[Duel WS Message Parse Error]', e);
        }
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        setConnectionStatus('disconnected');
        setIsSearchingMatch(false);
        setIsSubmitting(false);
        setCountdown(null);
        setRoomState(null);
        setOnlinePlayers([]);
        setInvitation(null);
        pendingInvite.current = null;
      };

      ws.onerror = () => {
        if (wsRef.current === ws) setConnectionStatus('error');
      };

      wsRef.current = ws;
    } catch (e) {
      setConnectionStatus('error');
    }
  }, [initialRoomId, playerId, playerName, playerAvatar, profile?.email]);

  // Xử lý các sự kiện từ Server
  const handleServerMessage = (data: any) => {
    const { type } = data;

    if (type === 'lobby_players') {
      setOnlinePlayers(data.players.filter((p: any) => p.id !== playerId));
    } else if (type === 'duel_invitation') {
      setInvitation(data);
    } else if (type === 'invite_sent' || type === 'invite_declined') {
      setFloatingAlert(type === 'invite_sent' ? 'Đã gửi lời mời. Đang chờ bạn chấp nhận.' : 'Bạn đã từ chối lời mời. Bạn có thể gửi link phòng hoặc mời người khác.');
    } else if (type === 'joined_success') {
      setInvitation(null);
      setIsSearchingMatch(false);
      finishedRoom.current = null;
      if (pendingInvite.current) {
        sendWs({ type: 'send_invite', ...pendingInvite.current });
        pendingInvite.current = null;
      }
      setMyPlayerId(data.playerId);
      setIsHost(data.isHost);
      setFloatingAlert(`Đã tham gia phòng thi đấu ${data.roomId}!`);
      setTimeout(() => setFloatingAlert(null), 3000);
    } else if (type === 'room_state') {
      const state: DuelRoomState = data.state;
      setRoomState(state);

      // Cập nhật lại quyền Host nếu thay đổi
      if (state && state.players[myPlayerId]) {
        setIsHost(state.players[myPlayerId].isHost);
      }

      // Nếu trạng thái là countdown
      if (state.status === 'countdown') {
        finishedRoom.current = null;
        // Đồng bộ đếm ngược
      } else if (state.status === 'finished' && finishedRoom.current !== state.roomId) {
        finishedRoom.current = state.roomId;
        setCountdown(null);
        // Kích hoạt pháo hoa nếu mình là người thắng
        if (state.winnerId === myPlayerId) {
          try {
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          } catch (e) {}
          playVictorySound();

          // Ghi nhận trận thắng cho Huy hiệu & Thành tích
          const { newlyUnlocked } = recordDuelWin(profile?.email);
          if (newlyUnlocked && newlyUnlocked.length > 0) {
            setFloatingAlert(
              `🎉 MỞ KHÓA HUY HIỆU MỚI: "${newlyUnlocked[0].name}" (${newlyUnlocked[0].icon})!`
            );
          }
        } else if (state.winnerId && state.winnerId !== myPlayerId) {
          playDefeatSound();
        }
      }
    } else if (type === 'waiting_in_queue') {
      setIsSearchingMatch(true);
      setFloatingAlert('Đang tìm kiếm đối thủ trực tuyến trên hệ thống...');
    } else if (type === 'search_cancelled') {
      setIsSearchingMatch(false);
      setFloatingAlert('Đã hủy tìm kiếm đối thủ.');
      setTimeout(() => setFloatingAlert(null), 2000);
    } else if (type === 'match_found') {
      setIsSearchingMatch(false);
      playSlashSound();
      setFloatingAlert('⚡ Đã tìm thấy đối thủ xứng tầm! Chuẩn bị giao đấu!');
      setTimeout(() => setFloatingAlert(null), 3000);
    } else if (type === 'countdown_tick') {
      setCountdown(data.count);
      playCriticalSound();
    } else if (type === 'game_started') {
      setCountdown(null);
      finishedRoom.current = null;
      playSlashSound();
      setFloatingAlert('⚔️ TRANH TÀI BẮT ĐẦU! HÃY DỊCH THẬT NHANH!');
      setTimeout(() => setFloatingAlert(null), 2500);
    } else if (type === 'answer_result') {
      setIsSubmitting(false);
      if (data.correct) {
        playSlashSound();
        setAnswerFeedback({
          correct: true,
          text: data.isFirst
            ? `⚡ FIRST BLOOD! Dịch nhanh nhất (+${data.pointsEarned}đ)!`
            : `✓ Chính xác (+${data.pointsEarned}đ)!`,
          points: data.pointsEarned,
          isFirst: data.isFirst,
        });
        // Reset câu trả lời cho câu tiếp theo
        setAssembledTokens([]);
        setUserSentence('');
      } else {
        playPlayerHurtSound();
        setAnswerFeedback({
          correct: false,
          text: data.message || 'Bản dịch chưa đúng, hãy thử kiểm tra lại!',
        });
      }
      setTimeout(() => setAnswerFeedback(null), 2500);
    } else if (type === 'opponent_scored') {
      // Đối thủ vừa ghi điểm
      playMonsterHurtSound();
      setFloatingAlert(
        `⚡ ${data.playerName} vừa dịch đúng câu ${data.questionIndex + 1} ${
          data.isFirst ? '(First Blood!)' : ''
        }!`
      );
      setTimeout(() => setFloatingAlert(null), 2500);
    } else if (type === 'opponent_typing') {
      // Hiển thị chỉ báo đối thủ đang gõ phím
      setOpponentIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setOpponentIsTyping(false);
      }, 1500);
    } else if (type === 'emote_received') {
      // Nhận biểu cảm bay lên màn hình
      const emoteId = `emote-${Date.now()}-${Math.random()}`;
      setActiveEmotes((prev) => [
        ...prev.slice(-4),
        { id: emoteId, emote: data.emote, senderName: data.senderName },
      ]);
      playSlashSound();
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== emoteId));
      }, 2500);
    } else if (type === 'player_joined_event') {
      playCriticalSound();
      setFloatingAlert(`👋 ${data.player?.name} vừa bước vào phòng!`);
      setTimeout(() => setFloatingAlert(null), 3000);
    } else if (type === 'player_left_event' || type === 'player_disconnected_event') {
      playPlayerHurtSound();
      setFloatingAlert('Đối thủ đã rời khỏi phòng thi đấu.');
      setTimeout(() => setFloatingAlert(null), 3000);
    } else if (type === 'rematch_requested_by_player') {
      playCriticalSound();
      setFloatingAlert('🔥 Đối thủ vừa gửi lời mời TÁI ĐẤU! Bấm Tái Đấu để chấp nhận!');
    } else if (type === 'error') {
      setIsSearchingMatch(false);
      pendingInvite.current = null;
      setIsSubmitting(false);
      setFloatingAlert(`⚠️ ${data.message || 'Có lỗi xảy ra!'}`);
      setTimeout(() => setFloatingAlert(null), 4000);
    }
  };

  messageHandler.current = handleServerMessage;

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [connectWs]);

  // Đồng bộ userSentence khi assembledTokens thay đổi ở chế độ tokens
  useEffect(() => {
    if (inputMode === 'tokens') {
      const sentence = assembledTokens.map((t) => t.word).join(' ');
      setUserSentence(sentence);
    }
  }, [assembledTokens, inputMode]);

  // Gửi sự kiện typing khi người chơi gõ bàn phím
  const handleTypingChange = (text: string) => {
    setUserSentence(text);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 300) {
      lastTypingSentRef.current = now;
      sendWs({
        type: 'typing',
        textLength: text.length,
      });
    }
  };

  // Thông tin người chơi & đối thủ trong phòng
  const myPlayer: DuelParticipant | undefined = roomState?.players[myPlayerId];
  const opponent: DuelParticipant | undefined = useMemo(() => {
    if (!roomState) return undefined;
    for (const [pId, p] of Object.entries(roomState.players)) {
      if (pId !== myPlayerId) return p;
    }
    return undefined;
  }, [roomState, myPlayerId]);

  // Câu hỏi hiện tại của người chơi
  const currentQIndex = myPlayer?.currentQuestionIndex ?? 0;
  const currentQ: DuelQuestionItem | undefined = roomState?.questions[currentQIndex];

  // Danh sách từ vựng trong khay từ của câu hỏi hiện tại (kèm từ nhiễu)
  const availableBankTokens = useMemo(() => {
    if (!currentQ || !currentQ.answers || currentQ.answers.length === 0) return [];
    const baseSentence = currentQ.answers[0] || '';
    const cleanWords = baseSentence
      .replace(/[.,!?;:()"]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    // Thêm 2-3 từ gây nhiễu
    const distractors = DISTRACTOR_WORDS.filter((w) => !cleanWords.includes(w)).slice(0, 3);
    const combined = [...cleanWords, ...distractors];

    // Xáo trộn ngẫu nhiên dựa trên ID câu hỏi
    const shuffled = [...combined].sort((a, b) => {
      const hashA = (a.charCodeAt(0) * 17 + currentQ.id) % 31;
      const hashB = (b.charCodeAt(0) * 17 + currentQ.id) % 31;
      return hashA - hashB;
    });

    return shuffled.map((word, idx) => ({
      id: `q-${currentQ.id}-word-${idx}-${word}`,
      word,
    }));
  }, [currentQ]);

  // Hành động chạm từ vào câu
  const handleSelectBankToken = (token: { id: string; word: string }) => {
    playSlashSound();
    setAssembledTokens((prev) => [...prev, token]);
  };

  // Hành động gỡ từ khỏi câu
  const handleRemoveToken = (indexToRemove: number) => {
    playPlayerHurtSound();
    setAssembledTokens((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Nộp câu trả lời
  const handleSubmitAnswer = () => {
    if (!userSentence.trim() || isSubmitting || !roomState) return;
    setIsSubmitting(true);
    sendWs({
      type: 'submit_answer',
      questionIndex: currentQIndex,
      answer: userSentence.trim(),
    });
  };

  // Bỏ qua câu hỏi (Skip)
  const handleSkipQuestion = () => {
    if (!roomState) return;
    playPlayerHurtSound();
    sendWs({
      type: 'skip_question',
    });
    setAssembledTokens([]);
    setUserSentence('');
    setAnswerFeedback({
      correct: false,
      text: 'Đã bỏ qua câu này!',
    });
    setTimeout(() => setAnswerFeedback(null), 1500);
  };

  // Thả biểu cảm
  const handleSendEmote = (emote: DuelEmote) => {
    sendWs({
      type: 'send_emote',
      emote,
    });
    const emoteId = `emote-${Date.now()}`;
    setActiveEmotes((prev) => [...prev.slice(-4), { id: emoteId, emote, senderName: 'Bạn' }]);
    playSlashSound();
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== emoteId));
    }, 2500);
  };

  const challengePlayer = (targetId?: string, targetEmail?: string) => {
    if (connectionStatus !== 'connected') return;
    pendingInvite.current = { targetId, targetEmail };
    handleCreateRoom(selectedCategory, selectedQuestionCount);
  };

  // Tạo phòng mới
  const handleCreateRoom = (category: string = 'all', count: number = 5) => {
    sendWs({
      type: 'join_room',
      roomId: '', // Để trống thì server tự sinh DUEL-xxxx
      questionCount: count,
      category,
      player: {
        id: playerId,
        name: playerName,
        avatar_url: playerAvatar,
      },
    });
  };

  // Tham gia phòng bằng mã
  const handleJoinByCode = () => {
    if (!roomInputCode.trim()) return;
    sendWs({
      type: 'join_room',
      roomId: roomInputCode.toUpperCase().trim(),
      player: {
        id: playerId,
        name: playerName,
        avatar_url: playerAvatar,
      },
    });
  };

  // Tìm trận ngẫu nhiên
  const handleFindMatch = () => {
    if (connectionStatus !== 'connected') return;
    setIsSearchingMatch(true);
    sendWs({
      type: 'find_match',
      category: selectedCategory,
      questionCount: selectedQuestionCount,
      player: {
        id: playerId,
        name: playerName,
        avatar_url: playerAvatar,
      },
    });
  };

  // Hủy tìm trận ngẫu nhiên
  const handleCancelFindMatch = () => {
    setIsSearchingMatch(false);
    sendWs({
      type: 'cancel_find_match',
    });
  };

  // Đổi trạng thái sẵn sàng
  const handleToggleReady = () => {
    playCriticalSound();
    sendWs({
      type: 'toggle_ready',
    });
  };

  // Bắt đầu trận đấu (Chủ phòng)
  const handleStartGame = () => {
    playCriticalSound();
    sendWs({
      type: 'start_game',
    });
  };

  // Tái đấu (Rematch)
  const handleRequestRematch = () => {
    playCriticalSound();
    sendWs({
      type: 'request_rematch',
    });
    setFloatingAlert('Đã gửi yêu cầu TÁI ĐẤU! Đang chờ đối thủ đồng ý...');
  };

  // Rời phòng
  const handleLeaveRoom = () => {
    sendWs({
      type: 'leave_room',
    });
    setRoomState(null);
    setIsSearchingMatch(false);
    setAssembledTokens([]);
    setUserSentence('');
    setAnswerFeedback(null);
  };

  // Sao chép link mời bạn bè
  const handleCopyInviteLink = () => {
    if (!roomState) return;
    const url = `${window.location.origin}${window.location.pathname}?duel=${roomState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setFloatingAlert('Đã sao chép link mời thách đấu! Hãy gửi cho bạn của bạn!');
    setTimeout(() => {
      setCopiedLink(false);
      setFloatingAlert(null);
    }, 2500);
  };

  // Sao chép mã phòng
  const handleCopyRoomCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomId);
    setCopiedCode(true);
    setFloatingAlert(`Đã sao chép mã phòng: ${roomState.roomId}!`);
    setTimeout(() => {
      setCopiedCode(false);
      setFloatingAlert(null);
    }, 2500);
  };

  // Thay đổi cài đặt phòng (Chủ phòng)
  const handleUpdateRoomConfig = (newCount: number, newCat: string) => {
    setSelectedQuestionCount(newCount);
    setSelectedCategory(newCat);
    sendWs({
      type: 'update_room_settings',
      questionCount: newCount,
      category: newCat,
    });
  };

  // =========================================================================
  // RENDER 1: MÀN HÌNH ĐẾM NGƯỢC (3... 2... 1... CHIẾN!)
  // =========================================================================
  if (countdown !== null && countdown > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in p-4 text-center">
        <div className="space-y-6 max-w-md w-full">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {/* Player 1 */}
            <div className="flex flex-col items-center space-y-2">
              <img
                src={myPlayer?.avatar_url || playerAvatar}
                alt={myPlayer?.name || playerName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-indigo-500 shadow-xl"
              />
              <span className="font-bold text-white text-sm sm:text-base truncate max-w-[100px]">
                {myPlayer?.name || playerName}
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-rose-500 italic animate-pulse">
              VS
            </div>

            {/* Player 2 */}
            <div className="flex flex-col items-center space-y-2">
              <img
                src={
                  opponent?.avatar_url ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=opponent'
                }
                alt={opponent?.name || 'Đối thủ'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-rose-500 shadow-xl"
              />
              <span className="font-bold text-white text-sm sm:text-base truncate max-w-[100px]">
                {opponent?.name || 'Đối thủ'}
              </span>
            </div>
          </div>

          <div className="py-6">
            <span className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-rose-500 to-indigo-400 animate-ping inline-block">
              {countdown}
            </span>
          </div>

          <p className="text-sm sm:text-base font-bold text-slate-300 uppercase tracking-widest animate-pulse">
            Sẵn sàng dịch nhanh để đoạt First Blood!
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: MÀN HÌNH SẢNH CHỜ (LOBBY & MATCHMAKING)
  // =========================================================================
  if (!roomState || roomState.status === 'waiting') {
    return (
      <div className="w-full mx-auto space-y-4 sm:space-y-6 overflow-x-clip animate-in fade-in">
        {invitation && (
          <div role="alert" className="rounded-2xl border border-indigo-400 bg-indigo-50 dark:bg-slate-800 p-4 space-y-3">
            <p className="font-bold">{invitation.fromName} mời bạn đấu 1vs1 (lời mời có hiệu lực 60 giây).</p>
            <button className="rounded-xl bg-indigo-600 text-white px-4 py-2 mr-3" onClick={() => { sendWs({ type: 'respond_invite', inviteId: invitation.inviteId, accept: true }); setInvitation(null); }}>Chấp nhận</button>
            <button className="rounded-xl border px-4 py-2" onClick={() => { sendWs({ type: 'respond_invite', inviteId: invitation.inviteId, accept: false }); setInvitation(null); }}>Từ chối</button>
          </div>
        )}

        {/* Floating Notification */}
        {floatingAlert && (
          <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 max-w-sm">
            <div className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-xs shadow-xl border border-indigo-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{floatingAlert}</span>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStudy}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="Trở về phòng học"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                  Đấu Trường Dịch 1v1
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-black uppercase shadow-2xs">
                  Real-time LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thi dịch song song giữa 2 người chơi qua mạng thời gian thực
              </p>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold self-end sm:self-auto">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {connectionStatus === 'connected'
                ? 'Máy chủ trực tuyến'
                : connectionStatus === 'connecting'
                ? 'Đang kết nối...'
                : 'Mất kết nối'}
            </span>
          </div>
        </div>

        {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <div role="alert" className="rounded-xl border border-amber-400 p-4 text-sm">
            <p>Không kết nối được máy chủ đấu. Vui lòng thử lại.</p>
            <button className="mt-2 rounded-lg bg-indigo-600 text-white px-4 py-2" onClick={connectWs}>Kết nối lại</button>
          </div>
        )}
        {/* NẾU ĐÃ Ở TRONG PHÒNG CHỜ (ROOM LOBBY) */}
        {roomState && roomState.status === 'waiting' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-md space-y-6 transition-colors">
            {/* Header phòng & Nút copy link */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/30 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Mã phòng thách đấu
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-widest mt-0.5">
                  {roomState.roomId}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Gửi mã này hoặc link trực tiếp cho bạn bè để vào phòng thi đấu ngay
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleCopyRoomCode}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{copiedCode ? 'Đã sao chép mã!' : 'Sao chép mã'}</span>
                </button>

                <button
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Share2 className="w-4 h-4 text-white" />
                  )}
                  <span>{copiedLink ? 'Đã chép link mời!' : 'Sao chép link mời bạn'}</span>
                </button>
              </div>
            </div>

            {/* 2 NGƯỜI CHƠI TRONG PHÒNG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Chủ phòng */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-indigo-500/40 flex items-center gap-3.5 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Chủ phòng</span>
                </div>
                <img
                  src={myPlayer?.isHost ? myPlayer.avatar_url : opponent?.avatar_url || playerAvatar}
                  alt="Host"
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ring-2 ring-indigo-500 shadow-md"
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate block">
                    {myPlayer?.isHost ? myPlayer.name : opponent?.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã sẵn sàng</span>
                  </span>
                </div>
              </div>

              {/* Slot 2: Đối thủ / Bạn bè */}
              {opponent ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 flex items-center gap-3.5 relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                    <span>Người thách đấu</span>
                  </div>
                  <img
                    src={
                      !myPlayer?.isHost ? myPlayer?.avatar_url : opponent?.avatar_url || playerAvatar
                    }
                    alt="Player 2"
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ring-2 ring-rose-500 shadow-md"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate block">
                      {!myPlayer?.isHost ? myPlayer?.name : opponent?.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${
                        (!myPlayer?.isHost ? myPlayer?.isReady : opponent?.isReady)
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {(!myPlayer?.isHost ? myPlayer?.isReady : opponent?.isReady) ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã sẵn sàng</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Chưa sẵn sàng</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-pulse">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Đang đợi bạn bè vào phòng...
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sao chép mã phòng hoặc link mời ở trên gửi cho bạn bè để cùng chơi!
                  </p>
                </div>
              )}
            </div>

            {/* Cài đặt trận đấu (Chỉ chủ phòng chỉnh sửa) */}
            {isHost && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  ⚙️ Cài đặt trận đấu (Dành cho Chủ phòng)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Số câu thi đấu:
                    </label>
                    <div className="flex gap-2">
                      {[3, 5, 10].map((count) => (
                        <button
                          key={count}
                          onClick={() => handleUpdateRoomConfig(count, selectedCategory)}
                          className={`flex-1 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                            (roomState.questionCount || 5) === count
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {count} câu
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Chủ đề câu hỏi:
                    </label>
                    <select
                      value={roomState.category || 'all'}
                      onChange={(e) =>
                        handleUpdateRoomConfig(roomState.questionCount, e.target.value)
                      }
                      className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                    >
                      <option value="all">🌍 Tất cả chủ đề hỗn hợp</option>
                      <option value="general">💬 Giao tiếp hàng ngày</option>
                      <option value="it">💻 Công nghệ thông tin (IT & Tech)</option>
                      <option value="business">💼 Kinh doanh & Bán hàng (Sales)</option>
                      <option value="hospitality">🏨 Khách sạn & Du lịch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Các nút hành động chính */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleLeaveRoom}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-all cursor-pointer"
              >
                Rời phòng
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!isHost && (
                  <button
                    onClick={handleToggleReady}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                      myPlayer?.isReady
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {myPlayer?.isReady ? 'Hủy sẵn sàng' : '✓ Sẵn sàng chiến đấu'}
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!opponent}
                    className="flex-1 sm:flex-initial px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-indigo-600 to-amber-500 hover:brightness-110 text-white font-black text-sm transition-all shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Swords className="w-4 h-4" />
                    <span>BẮT ĐẦU TRANH TÀI</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* NẾU CHƯA VÀO PHÒNG: CHỌN CHẾ ĐỘ THÁCH ĐẤU */
          <div className="space-y-4">
            {/* Tabs chọn hình thức giao đấu */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setLobbyTab('friends')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  lobbyTab === 'friends'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Thách đấu bạn bè</span>
              </button>

              <button
                onClick={() => setLobbyTab('quick')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  lobbyTab === 'quick'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Ghép trận ngẫu nhiên</span>
              </button>

              <button
                onClick={() => setLobbyTab('learners')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  lobbyTab === 'learners'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Bạn học trên trang</span>
              </button>
            </div>

            {/* TAB 1: THÁCH ĐẤU BẠN BÈ */}
            {lobbyTab === 'friends' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Khối Tạo phòng mới */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                    <Swords className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Tạo phòng thách đấu bạn bè
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Hệ thống tự động sinh mã phòng và link chia sẻ. Bạn gửi cho bạn bè để cùng thi
                      dịch song song!
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Số câu tranh tài:
                      </label>
                      <div className="flex gap-2">
                        {[3, 5, 10].map((count) => (
                          <button
                            key={count}
                            onClick={() => setSelectedQuestionCount(count)}
                            className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                              selectedQuestionCount === count
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {count} câu
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Chủ đề:
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                      >
                        <option value="all">🌍 Tất cả chủ đề hỗn hợp</option>
                        <option value="general">💬 Giao tiếp hàng ngày</option>
                        <option value="it">💻 Công nghệ thông tin (IT & Tech)</option>
                        <option value="business">💼 Kinh doanh & Bán hàng (Sales)</option>
                        <option value="hospitality">🏨 Khách sạn & Du lịch</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleCreateRoom(selectedCategory, selectedQuestionCount)}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Tạo phòng ngay</span>
                    </button>
                  </div>
                </div>

                {/* Khối Nhập mã vào phòng bạn */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between transition-colors">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                      <Radio className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base mt-4">
                      Vào phòng của bạn bè
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Nhập mã phòng 4 chữ số (hoặc mã DUEL-xxxx) mà bạn bè đã gửi cho bạn để vào
                      ngay!
                    </p>

                    <div className="mt-4 space-y-2">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        Mã phòng thi đấu:
                      </label>
                      <input
                        type="text"
                        placeholder="VD: DUEL-4829 hoặc 4829"
                        value={roomInputCode}
                        onChange={(e) => setRoomInputCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleJoinByCode}
                    disabled={!roomInputCode.trim()}
                    className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-rose-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Vào phòng giao đấu</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* KHỐI KẾT BẠN BẰNG GMAIL & DANH SÁCH BẠN BÈ ĐỂ THÁCH ĐẤU TRỰC TIẾP */}
                <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-base">
                          Danh sách Bạn bè đã kết bạn ({friendsList.length})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Kết bạn bằng Gmail để gửi lời mời thách đấu 1v1 song song bất cứ lúc nào
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form thêm bạn bè bằng Gmail */}
                  <form
                    onSubmit={handleAddFriendFromLobby}
                    className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2"
                  >
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Thêm bạn bè mới bằng địa chỉ Gmail:</span>
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          placeholder="Nhập Gmail bạn bè (VD: ban.cua.toi@gmail.com)"
                          value={newFriendGmail}
                          onChange={(e) => setNewFriendGmail(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newFriendGmail.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                      >
                        <Users className="w-4 h-4" />
                        <span>Thêm bạn bè</span>
                      </button>
                    </div>

                    {friendFormFeedback && (
                      <div
                        className={`text-xs font-bold pt-1 flex items-center gap-1.5 ${
                          friendFormFeedback.type === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {friendFormFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{friendFormFeedback.text}</span>
                      </div>
                    )}
                  </form>

                  {/* Danh sách bạn bè để thách đấu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {friendsList.length === 0 ? (
                      <div className="col-span-2 text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                        Chưa có bạn bè nào. Hãy nhập Gmail của bạn bè ở trên để kết bạn ngay!
                      </div>
                    ) : (
                      friendsList.map((fr) => (
                        <div
                          key={fr.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={
                                  fr.avatar_url ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${fr.email}`
                                }
                                alt={fr.name}
                                className="w-10 h-10 rounded-xl ring-2 ring-indigo-400 shadow-xs object-cover"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                  onlinePlayers.some(p => p.id === fr.id) ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate block">
                                {fr.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                {fr.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => challengePlayer(fr.id, fr.email)}
                              disabled={connectionStatus !== 'connected' || isSearchingMatch}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title={`Thách đấu 1v1 ngay với ${fr.name}`}
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Thách đấu</span>
                            </button>

                            <button
                              onClick={() => handleRemoveFriendFromLobby(fr.id, fr.name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
                              title="Xóa bạn bè"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GHÉP TRẬN NGẪU NHIÊN */}
            {lobbyTab === 'quick' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-6 transition-colors">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
                  <Zap className="w-8 h-8 fill-white" />
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Tìm Đối Thủ Trực Tuyến Nhanh
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Hệ thống sẽ tự động ghép bạn với một người chơi bất kỳ đang online trên trang web
                    để thi thố khả năng dịch thuật!
                  </p>
                </div>

                {/* Radar tìm kiếm */}
                {isSearchingMatch ? (
                  <div className="py-6 space-y-4">
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full bg-rose-500/30 animate-pulse" />
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md">
                        <Search className="w-6 h-6 animate-spin" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 animate-pulse block">
                      Đang tìm kiếm đối thủ xứng tầm...
                    </span>
                    <button
                      onClick={handleCancelFindMatch}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Hủy tìm kiếm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="text-left space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Số câu:
                        </label>
                        <div className="flex gap-2">
                          {[3, 5, 10].map((c) => (
                            <button
                              key={c}
                              onClick={() => setSelectedQuestionCount(c)}
                              className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                                selectedQuestionCount === c
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {c} câu
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Chủ đề:
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                        >
                          <option value="all">🌍 Mọi chủ đề</option>
                          <option value="general">💬 Giao tiếp hàng ngày</option>
                          <option value="it">💻 Công nghệ thông tin (IT)</option>
                          <option value="business">💼 Kinh doanh (Business)</option>
                          <option value="hospitality">🏨 Khách sạn du lịch</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleFindMatch}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-indigo-600 hover:brightness-110 text-white font-black text-sm transition-all shadow-lg shadow-rose-200 dark:shadow-none cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>BẮT ĐẦU TÌM ĐỐI THỦ</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BẠN HỌC TRÊN TRANG (DANH SÁCH BẠN BÈ) */}
            {lobbyTab === 'learners' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Giao đấu với Bạn học trên trang
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Người đang mở sảnh đấu sẽ xuất hiện ở đây. Bấm Thách đấu để gửi lời mời trực tiếp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {onlinePlayers.length === 0 && <p className="text-sm text-slate-500">Chưa có người khác ở sảnh đấu. Hãy nhờ bạn mở mục 1vs1 hoặc dùng Tìm trận.</p>}
                  {onlinePlayers
                    .map((learner) => (
                      <div
                        key={learner.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              learner.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.id}`
                            }
                            alt={learner.full_name || 'Học viên'}
                            className="w-10 h-10 rounded-xl ring-2 ring-indigo-400 shadow-xs shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate block">
                              {learner.full_name || 'Người chơi'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              Đang ở sảnh đấu
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => challengePlayer(learner.id)}
                          disabled={connectionStatus !== 'connected' || isSearchingMatch}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          Thách đấu ⚔️
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: MÀN HÌNH TỔNG KẾT KẾT QUẢ (FINISHED / WINNER SHOWCASE)
  // =========================================================================
  if (roomState.status === 'finished') {
    const isWinner = roomState.winnerId === myPlayerId;
    const isDraw = roomState.winnerId === null;
    const myFinalScore = myPlayer?.score ?? 0;
    const opponentFinalScore = opponent?.score ?? 0;

    return (
      <div className="max-w-2xl w-full mx-auto space-y-6 animate-in fade-in py-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 transition-colors">
          {/* Huy hiệu kết quả */}
          <div className="space-y-3">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl ${
                isWinner
                  ? 'bg-gradient-to-tr from-amber-400 to-amber-600 text-white ring-4 ring-amber-300'
                  : isDraw
                  ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                  : 'bg-gradient-to-tr from-slate-600 to-slate-800 text-white'
              }`}
            >
              {isWinner ? '🏆' : isDraw ? '🤝' : '⚔️'}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isWinner
                ? 'CHIẾN THẮNG HUY HOÀNG!'
                : isDraw
                ? 'BẤT PHÂN THẮNG BẠI!'
                : 'THẤT BẠI ĐẦY TIẾC NUỐI!'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isWinner
                ? 'Chúc mừng bạn đã xuất sắc chiến thắng đối thủ bằng tốc độ và độ chuẩn xác vượt trội!'
                : isDraw
                ? 'Cả hai đấu thủ có trình độ dịch thuật ngang tài ngang sức!'
                : 'Đừng nản chí! Hãy bấm Tái Đấu Ngay để phục thù ván mới!'}
            </p>
          </div>

          {/* Bảng so sánh điểm số 2 bên */}
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Bạn */}
            <div
              className={`p-4 rounded-2xl border-2 ${
                isWinner
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <img
                src={myPlayer?.avatar_url || playerAvatar}
                alt={myPlayer?.name || playerName}
                className="w-14 h-14 rounded-2xl ring-2 ring-indigo-500 mx-auto shadow-md"
              />
              <span className="font-bold text-slate-900 dark:text-white text-sm truncate block mt-2">
                {myPlayer?.name || playerName} (Bạn)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {myFinalScore}đ
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {myPlayer?.answeredCount || 0} câu hoàn thành
              </span>
            </div>

            {/* Đối thủ */}
            <div
              className={`p-4 rounded-2xl border-2 ${
                !isWinner && !isDraw
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <img
                src={
                  opponent?.avatar_url ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=opponent'
                }
                alt={opponent?.name || 'Đối thủ'}
                className="w-14 h-14 rounded-2xl ring-2 ring-rose-500 mx-auto shadow-md"
              />
              <span className="font-bold text-slate-900 dark:text-white text-sm truncate block mt-2">
                {opponent?.name || 'Đối thủ'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {opponentFinalScore}đ
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {opponent?.answeredCount || 0} câu hoàn thành
              </span>
            </div>
          </div>

          {/* Các nút hành động: Tái Đấu & Về sảnh */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleRequestRematch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-indigo-600 to-amber-500 hover:brightness-110 text-white font-black text-sm sm:text-base transition-all shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              <span>
                {roomState.rematchVotes?.[myPlayerId]
                  ? 'Đang chờ đối thủ đồng ý...'
                  : 'TÁI ĐẤU NGAY (REMATCH)'}
              </span>
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleLeaveRoom}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Về Sảnh Đấu
              </button>
              <button
                onClick={onBackToStudy}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Về Phòng Học
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 4: MÀN HÌNH THI ĐẤU SONG SONG (LIVE PARALLEL ARENA)
  // =========================================================================
  return (
    <div className="w-full mx-auto space-y-3 sm:space-y-4 overflow-x-clip relative">
      {/* Floating Active Emotes over screen */}
      {activeEmotes.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          {activeEmotes.map((em) => (
            <div
              key={em.id}
              className="animate-in fade-in zoom-in slide-out-to-top-24 duration-700 text-center"
            >
              <div className="text-6xl sm:text-8xl drop-shadow-2xl animate-bounce">{em.emote}</div>
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-xs font-bold">
                {em.senderName}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Floating Alert Toast */}
      {floatingAlert && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 max-w-sm pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/90 text-white font-bold text-xs shadow-xl border border-indigo-500/50 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{floatingAlert}</span>
          </div>
        </div>
      )}

      {/* 1. THANH TOP TỈ SỐ & TIẾN ĐỘ SONG SONG */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 transition-colors">
        {/* Người chơi (Bạn) */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <img
            src={myPlayer?.avatar_url || playerAvatar}
            alt={myPlayer?.name || playerName}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ring-2 ring-indigo-500 shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate block">
              {myPlayer?.name || playerName}
            </span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
              {myPlayer?.score ?? 0}đ
            </span>
          </div>
        </div>

        {/* Thông số vòng đấu & VS */}
        <div className="flex flex-col items-center shrink-0 px-2 text-center">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-400">
            ⚔️ TRỰC TIẾP
          </span>
          <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
            Câu {currentQIndex + 1}/{roomState.questions.length}
          </span>
        </div>

        {/* Đối thủ */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 text-right">
          <div className="min-w-0">
            <div className="flex items-center justify-end gap-1">
              {opponentIsTyping && (
                <span className="flex gap-0.5 items-center mr-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[9px] font-bold text-rose-500 hidden sm:inline">Gõ...</span>
                </span>
              )}
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate block">
                {opponent?.name || 'Đối thủ'}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
              {opponent?.score ?? 0}đ
            </span>
          </div>
          <img
            src={opponent?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=opponent'}
            alt={opponent?.name || 'Đối thủ'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ring-2 ring-rose-500 shadow-xs shrink-0"
          />
        </div>
      </div>

      {/* 2. THANH BẮN BIỂU CẢM NHANH (LIVE EMOTES QUICK BAR) */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 px-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 pr-1">
          Cảm xúc:
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          {EMOTE_LIST.map((emote) => (
            <button
              key={emote}
              onClick={() => handleSendEmote(emote)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-base sm:text-lg transition-transform active:scale-125 cursor-pointer shadow-2xs shrink-0"
              title={`Thả biểu cảm ${emote}`}
            >
              {emote}
            </button>
          ))}
        </div>
      </div>

      {/* 3. KHU VỰC THI ĐẤU DỊCH BÀI (ACTION ARENA) */}
      {currentQ ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 transition-colors">
          {/* Thẻ câu hỏi tiếng Việt */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-300">
                Câu hỏi #{currentQIndex + 1}:
              </span>
              <button
                onClick={() => playSpeech(currentQ.vi)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Nghe phát âm"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-base sm:text-lg md:text-xl font-bold leading-snug">{currentQ.vi}</p>
          </div>

          {/* Gợi ý từ vựng trọng tâm */}
          {currentQ.hints && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2 text-xs">
              <span className="p-0.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">💡</span>
              <span className="text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                <strong>Gợi ý:</strong> {currentQ.hints}
              </span>
            </div>
          )}

          {/* Chuyển chế độ: Chạm từ vs Gõ phím */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Phương thức dịch:
            </span>
            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setInputMode('tokens')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  inputMode === 'tokens'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Chạm từ</span>
              </button>
              <button
                onClick={() => setInputMode('keyboard')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  inputMode === 'keyboard'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Gõ phím</span>
              </button>
            </div>
          </div>

          {/* Ô lắp ráp câu trả lời */}
          {inputMode === 'tokens' ? (
            <div className="space-y-3">
              <div className="min-h-[70px] sm:min-h-[85px] p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 flex flex-wrap gap-2 items-center content-start">
                {assembledTokens.length === 0 ? (
                  <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic select-none">
                    Chạm các từ bên dưới để ghép thành câu dịch hoàn chỉnh...
                  </span>
                ) : (
                  assembledTokens.map((token, idx) => (
                    <button
                      key={`${token.id}-${idx}`}
                      onClick={() => handleRemoveToken(idx)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xs hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-1 animate-in zoom-in-90"
                      title="Bấm để gỡ từ"
                    >
                      <span>{token.word}</span>
                      <X className="w-3 h-3 opacity-70" />
                    </button>
                  ))
                )}
              </div>

              {/* Khay ngân hàng từ vựng chạm nhanh */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">
                  Khay từ vựng (Chạm để chọn):
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableBankTokens.map((token) => {
                    const isUsed = assembledTokens.some((t) => t.id === token.id);
                    return (
                      <button
                        key={token.id}
                        disabled={isUsed}
                        onClick={() => handleSelectBankToken(token)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                          isUsed
                            ? 'opacity-30 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-indigo-400 active:scale-95'
                        }`}
                      >
                        {token.word}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Chế độ gõ phím */
            <div>
              <textarea
                ref={textareaRef}
                rows={3}
                value={userSentence}
                onChange={(e) => handleTypingChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnswer();
                  }
                }}
                placeholder="Gõ bản dịch tiếng Anh của bạn tại đây rồi nhấn Enter hoặc Ra chiêu..."
                className="w-full p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm sm:text-base focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
              />
            </div>
          )}

          {/* Phản hồi nộp bài */}
          {answerFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                answerFeedback.correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {answerFeedback.correct ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{answerFeedback.text}</span>
            </div>
          )}

          {/* Các nút hành động: Nộp bài & Bỏ qua */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleSkipQuestion}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs transition-colors cursor-pointer"
            >
              Bỏ qua câu (-0đ)
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!userSentence.trim() || isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:brightness-110 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              <Swords className="w-4 h-4" />
              <span>NỘP BÀI / RA CHIÊU</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Bạn đã hoàn thành toàn bộ bài thi!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Đang chờ đối thủ hoàn thành nốt câu hỏi để tổng kết điểm số...
          </p>
        </div>
      )}
    </div>
  );
};

