import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Swords,
  Shield,
  Heart,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Coins,
  ChevronRight,
  HelpCircle,
  Delete,
  X,
  Keyboard,
  MousePointerClick,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TOWER_FLOORS, TowerFloor } from '../data/towerLevels';
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
import { Profile } from '../types';
import { recordTowerFloorCleared } from '../lib/badgeSystem';

interface TowerBattleViewProps {
  profile: Profile | null;
  onBackToStudy: () => void;
}

interface AssembledToken {
  id: string;
  word: string;
}

export const TowerBattleView: React.FC<TowerBattleViewProps> = ({
  profile,
  onBackToStudy,
}) => {
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const currentFloor = TOWER_FLOORS[currentFloorIndex] || TOWER_FLOORS[0];

  // Chỉ số Hiệp Sĩ
  const [playerHp, setPlayerHp] = useState(3);
  const [maxPlayerHp] = useState(3);
  const [rageEnergy, setRageEnergy] = useState(0); // 0 - 100
  const [goldCoins, setGoldCoins] = useState(() => {
    try {
      const saved = localStorage.getItem('tower_battle_coins');
      return saved ? parseInt(saved, 10) : 50;
    } catch (e) {
      return 50;
    }
  });

  // Chỉ số Quái Vật
  const [monsterHp, setMonsterHp] = useState(currentFloor.monster.maxHp);
  const [monsterMaxHp, setMonsterMaxHp] = useState(currentFloor.monster.maxHp);

  // Chế độ nhập liệu: 'tokens' (chạm từ - tối ưu cho di động không giật lag) hoặc 'keyboard' (gõ bàn phím)
  const [inputMode, setInputMode] = useState<'tokens' | 'keyboard'>('tokens');

  // Trạng thái ghép từ tương tác (Word Bank Tray)
  const [assembledTokens, setAssembledTokens] = useState<AssembledToken[]>([]);

  // Chuỗi câu trả lời (dùng cho cả 2 chế độ)
  const [userSentence, setUserSentence] = useState('');

  // Thời gian & Trạng thái chiến đấu
  const [timeLeft, setTimeLeft] = useState(35);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [comboCount, setComboCount] = useState(0);
  const [floatingText, setFloatingText] = useState<{
    text: string;
    type: 'crit' | 'hit' | 'hurt' | 'heal';
  } | null>(null);

  // Hiệu ứng hoạt họa
  const [heroAction, setHeroAction] = useState<'idle' | 'attack' | 'hurt'>('idle');
  const [monsterAction, setMonsterAction] = useState<'idle' | 'attack' | 'hurt'>('idle');

  // Trạng thái kết thúc trận
  const [gameState, setGameState] = useState<
    'fighting' | 'floor_cleared' | 'game_over' | 'tower_completed'
  >('fighting');

  // Đạo cụ (Items)
  const [hasUsedHeal, setHasUsedHeal] = useState(false);
  const [hasUsedFreeze, setHasUsedFreeze] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Danh sách từ trong kho ngân hàng từ vựng của tầng hiện tại
  const availableBankTokens = useMemo(() => {
    return currentFloor.wordTokens.map((word, index) => ({
      id: `floor-${currentFloorIndex}-word-${index}-${word}`,
      word,
    }));
  }, [currentFloor, currentFloorIndex]);

  // Đồng bộ userSentence khi assembledTokens thay đổi ở chế độ tokens
  useEffect(() => {
    if (inputMode === 'tokens') {
      const sentence = assembledTokens.map((t) => t.word).join(' ');
      setUserSentence(sentence);
    }
  }, [assembledTokens, inputMode]);

  // Nạp tầng mới
  useEffect(() => {
    setMonsterHp(currentFloor.monster.maxHp);
    setMonsterMaxHp(currentFloor.monster.maxHp);
    setUserSentence('');
    setAssembledTokens([]);
    setTimeLeft(35);
    setIsTimerActive(true);
    setGameState('fighting');
    setHeroAction('idle');
    setMonsterAction('idle');
    setHasUsedHeal(false);
    setHasUsedFreeze(false);
  }, [currentFloorIndex, currentFloor]);

  // Bộ đếm ngược thời gian tấn công
  useEffect(() => {
    if (gameState !== 'fighting' || !isTimerActive) return;

    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, isTimerActive]);

  // Khi hết thời gian -> Quái vật phản đòn
  const handleTimeOut = () => {
    playPlayerHurtSound();
    setMonsterAction('attack');
    setHeroAction('hurt');
    showFloatingText('Hết giờ! Quái phản đòn!', 'hurt');

    setPlayerHp((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        handleGameOver();
      }
      return Math.max(0, next);
    });

    setComboCount(0);
    setTimeout(() => {
      setMonsterAction('idle');
      setHeroAction('idle');
      setTimeLeft(30);
    }, 1200);
  };

  const showFloatingText = (
    text: string,
    type: 'crit' | 'hit' | 'hurt' | 'heal'
  ) => {
    setFloatingText({ text, type });
    setTimeout(() => setFloatingText(null), 1800);
  };

  // Người chơi tung chiêu Tấn công
  const handleAttack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userSentence.trim() || gameState !== 'fighting') return;

    const normalized = normalizeSentence(userSentence);
    const isCorrect = currentFloor.answers.some(
      (ans) => normalizeSentence(ans) === normalized
    );

    if (isCorrect) {
      // Đòn dịch CHÍNH XÁC!
      const isCritical = timeLeft >= 25;
      const damage = isCritical
        ? Math.round(monsterMaxHp * 0.75)
        : Math.round(monsterMaxHp * 0.5);

      if (isCritical) {
        playCriticalSound();
        showFloatingText(`💥 CHÍ MẠNG! -${damage} HP`, 'crit');
      } else {
        playSlashSound();
        showFloatingText(`⚔️ Sát thương: -${damage} HP`, 'hit');
      }

      setHeroAction('attack');
      setMonsterAction('hurt');
      setComboCount((prev) => prev + 1);
      setRageEnergy((prev) => Math.min(100, prev + 35));

      setMonsterHp((prev) => {
        const next = Math.max(0, prev - damage);
        if (next === 0) {
          setTimeout(() => handleMonsterDefeated(), 500);
        }
        return next;
      });

      // Phát âm câu tiếng Anh chuẩn
      setTimeout(() => {
        playSpeech(currentFloor.answers[0]);
      }, 500);

      setTimeout(() => {
        setHeroAction('idle');
        setMonsterAction('idle');
      }, 1000);
    } else {
      // Dịch SAI -> Quái vật phản đòn
      playPlayerHurtSound();
      setMonsterAction('attack');
      setHeroAction('hurt');
      showFloatingText('Dịch sai! Quái cắn mất 1 Tim!', 'hurt');
      setComboCount(0);

      setPlayerHp((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          handleGameOver();
        }
        return Math.max(0, next);
      });

      setTimeout(() => {
        setHeroAction('idle');
        setMonsterAction('idle');
      }, 1000);
    }
  };

  // Quái vật bị tiêu diệt
  const handleMonsterDefeated = () => {
    playVictorySound();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });

    const rewardCoins = 25 * currentFloor.floor;
    const newCoins = goldCoins + rewardCoins;
    setGoldCoins(newCoins);
    try {
      localStorage.setItem('tower_battle_coins', newCoins.toString());
    } catch (e) {}

    // Ghi nhận tiến độ tháp cho Huy hiệu Dũng Sĩ Diệt Quái
    recordTowerFloorCleared(currentFloor.floor, profile?.email);

    if (currentFloorIndex + 1 < TOWER_FLOORS.length) {
      setGameState('floor_cleared');
    } else {
      setGameState('tower_completed');
    }
  };

  // Thua trận
  const handleGameOver = () => {
    playDefeatSound();
    setGameState('game_over');
  };

  // Hồi sinh thử lại
  const handleRevive = () => {
    setPlayerHp(3);
    setMonsterHp(currentFloor.monster.maxHp);
    setUserSentence('');
    setAssembledTokens([]);
    setTimeLeft(35);
    setGameState('fighting');
  };

  // Sang tầng kế tiếp
  const handleNextFloor = () => {
    setCurrentFloorIndex((prev) => prev + 1);
  };

  // Chơi lại từ đầu
  const handleRestartTower = () => {
    setCurrentFloorIndex(0);
    setPlayerHp(3);
    setGameState('fighting');
  };

  // Sử dụng bình hồi máu
  const handleUseHealPotion = () => {
    if (hasUsedHeal || playerHp >= maxPlayerHp) return;
    setHasUsedHeal(true);
    setPlayerHp((prev) => Math.min(maxPlayerHp, prev + 1));
    showFloatingText('+1 ❤️ Hồi phục', 'heal');
    playSlashSound();
  };

  // Sử dụng đồng hồ băng
  const handleUseFreezeHourglass = () => {
    if (hasUsedFreeze) return;
    setHasUsedFreeze(true);
    setTimeLeft((prev) => prev + 20);
    showFloatingText('+20 Giây thời gian', 'heal');
    playSlashSound();
  };

  // Tuyệt chiêu Kiếm Thần (Excalibur) khi nộ khí 100%
  const handleUseExcalibur = () => {
    if (rageEnergy < 100 || gameState !== 'fighting') return;
    setRageEnergy(0);
    playCriticalSound();
    setHeroAction('attack');
    setMonsterAction('hurt');

    const ultiDamage = Math.round(monsterMaxHp * 0.6);
    showFloatingText(`⚡ TUYỆT CHIÊU KIẾM THẦN! -${ultiDamage} HP`, 'crit');

    setMonsterHp((prev) => {
      const next = Math.max(0, prev - ultiDamage);
      if (next === 0) {
        setTimeout(() => handleMonsterDefeated(), 500);
      }
      return next;
    });

    setTimeout(() => {
      setHeroAction('idle');
      setMonsterAction('idle');
    }, 1000);
  };

  // Thao tác CHẠM TỪ TỰ NHIÊN (Không mở bàn phím ảo, không gây khựng lag trên điện thoại)
  const handleAddTokenFromBank = (tokenItem: { id: string; word: string }) => {
    if (gameState !== 'fighting') return;
    setAssembledTokens((prev) => [...prev, tokenItem]);
  };

  // Chạm vào từ trong khay đã ghép để gỡ bỏ trực tiếp
  const handleRemoveTokenAt = (indexToRemove: number) => {
    if (gameState !== 'fighting') return;
    setAssembledTokens((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Xóa từ cuối cùng
  const handleRemoveLastWord = () => {
    if (inputMode === 'tokens') {
      setAssembledTokens((prev) => prev.slice(0, -1));
    } else {
      setUserSentence((prev) => {
        const words = prev.trim().split(/\s+/);
        if (words.length <= 1) return '';
        words.pop();
        return words.join(' ');
      });
    }
  };

  // Xóa hết toàn bộ
  const handleClearAll = () => {
    setAssembledTokens([]);
    setUserSentence('');
  };

  // Kiểm tra từ trong ngân hàng đã được chọn vào khay chưa
  const usedTokenIds = useMemo(() => {
    return new Set(assembledTokens.map((t) => t.id));
  }, [assembledTokens]);

  const monsterHpPercent = Math.max(0, Math.round((monsterHp / monsterMaxHp) * 100));
  const wordCount = userSentence.trim() ? userSentence.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 animate-in fade-in duration-200 pb-16 px-1 sm:px-0 overflow-x-hidden">
      {/* 1. TOP NAV BAR CHO MINI GAME (Gọn gàng trên Mobile) */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0 transition-colors">
        {/* Nút Về phòng học */}
        <button
          onClick={onBackToStudy}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer touch-press shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Về học</span>
          <span className="xs:hidden">Thoát</span>
        </button>

        {/* Tên Tháp & Tầng */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
            🏰
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              Tháp Ma Vương
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
              T{currentFloor.floor}/{TOWER_FLOORS.length}
            </span>
          </div>
        </div>

        {/* Chỉ số nhanh: Tim & Vàng */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold">
            <Coins className="w-3 h-3 text-amber-500" />
            <span>{goldCoins}</span>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 sm:py-1 rounded-full border border-slate-200 dark:border-slate-700">
            {[1, 2, 3].map((heartIdx) => (
              <Heart
                key={heartIdx}
                className={`w-3.5 h-3.5 transition-all ${
                  heartIdx <= playerHp
                    ? 'text-rose-500 fill-rose-500 scale-100'
                    : 'text-slate-300 dark:text-slate-600 scale-90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. SÂN KHẤU CHIẾN ĐẤU (BATTLE STAGE - Compact & Siêu mượt trên Di Động) */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white border border-slate-800 shadow-lg w-full max-w-full">
        {/* Chữ bay sát thương (Floating Combat Text) */}
        {floatingText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-75 fade-in duration-200">
            <div
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base shadow-xl border ${
                floatingText.type === 'crit'
                  ? 'bg-rose-600 text-yellow-300 border-yellow-300 shadow-rose-600/50 scale-105 animate-bounce'
                  : floatingText.type === 'hit'
                  ? 'bg-amber-500 text-white border-amber-300'
                  : floatingText.type === 'heal'
                  ? 'bg-emerald-600 text-white border-emerald-300'
                  : 'bg-rose-800 text-white border-rose-500'
              }`}
            >
              {floatingText.text}
            </div>
          </div>
        )}

        {/* 2 Đấu thủ: Hiệp Sĩ & Quái Vật */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0">
          {/* CỘT HIỆP SĨ */}
          <div className="flex-1 max-w-[120px] sm:max-w-[170px] min-w-0 flex flex-col items-center text-center space-y-1">
            <div className="relative">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 border border-indigo-300/80 flex items-center justify-center text-xl sm:text-2xl shadow-md transition-transform duration-200 ${
                  heroAction === 'attack'
                    ? 'translate-x-3 scale-110 rotate-3'
                    : heroAction === 'hurt'
                    ? '-translate-x-2 scale-95 brightness-75'
                    : ''
                }`}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Hero"
                    className="w-full h-full rounded-xl sm:rounded-2xl object-cover"
                  />
                ) : (
                  <span>🛡️</span>
                )}
              </div>

              {comboCount > 1 && (
                <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black border border-white flex items-center gap-0.5">
                  <Flame className="w-2 h-2 fill-current" />
                  <span>x{comboCount}</span>
                </div>
              )}
            </div>

            <div className="w-full min-w-0">
              <div className="font-extrabold text-[11px] sm:text-xs text-white truncate">
                {profile?.full_name || 'Hiệp Sĩ'}
              </div>
            </div>

            {/* Thanh Nộ Khí */}
            <div className="w-full bg-slate-900/80 px-1.5 py-0.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-amber-300">
                <span className="flex items-center gap-0.5">
                  <Zap className="w-2 h-2 fill-amber-300" /> Nộ
                </span>
                <span>{rageEnergy}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-300"
                  style={{ width: `${rageEnergy}%` }}
                />
              </div>
            </div>
          </div>

          {/* CỘT GIỮA: ĐỒNG HỒ & VS */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-[9px] font-black text-amber-400 shadow-inner">
              VS
            </div>

            <div
              className={`mt-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                timeLeft <= 10
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-800/90 border-slate-700 text-slate-200'
              }`}
            >
              <Clock className="w-2.5 h-2.5 text-sky-400" />
              <span className="font-mono font-black">{timeLeft}s</span>
            </div>
          </div>

          {/* CỘT QUÁI VẬT */}
          <div className="flex-1 max-w-[120px] sm:max-w-[170px] min-w-0 flex flex-col items-center text-center space-y-1">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-tr ${currentFloor.monster.bgGradient} border border-white/20 flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-transform duration-200 ${
                monsterAction === 'attack'
                  ? '-translate-x-3 scale-110 -rotate-3'
                  : monsterAction === 'hurt'
                  ? 'translate-x-2 scale-95 brightness-150'
                  : ''
              }`}
            >
              <span>{currentFloor.monster.emoji}</span>
            </div>

            <div className="w-full min-w-0">
              <div className="font-black text-[11px] sm:text-xs text-white truncate">
                {currentFloor.monster.name}
              </div>
            </div>

            {/* Thanh Máu Quái Vật (HP) */}
            <div className="w-full bg-slate-900/80 px-1.5 py-0.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-slate-300">
                <span>HP</span>
                <span className="font-mono text-white">
                  {monsterHp}/{monsterMaxHp}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    monsterHpPercent > 50
                      ? 'bg-emerald-500'
                      : monsterHpPercent > 20
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${monsterHpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lời thách thức của Quái Vật */}
        <div className="mt-2 bg-slate-900/80 rounded-xl px-2.5 py-1 text-[11px] text-center text-slate-300 truncate">
          <span className="text-amber-400 font-bold mr-1">[{currentFloor.monster.name}]:</span>
          <span className="italic">"{currentFloor.monster.tauntMessage}"</span>
        </div>
      </div>

      {/* 3. BÀN DỊCH THUẬT & RA CHIÊU (ACTION ARENA - TỐI ƯU CỰC MẠNH CHO ĐIỆN THOẠI) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full overflow-hidden transition-colors">
        {/* Câu Tiếng Việt Cần Dịch */}
        <div className="space-y-1 w-full min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              Dịch sang Tiếng Anh:
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
              {currentFloor.category}
            </span>
          </div>

          <div className="p-3 sm:p-3.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-indigo-50/90 dark:from-slate-850 dark:via-indigo-950/40 dark:to-slate-850 border border-indigo-200/90 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-900 dark:text-white font-extrabold text-sm sm:text-base leading-snug break-words">
            "{currentFloor.questionVi}"
          </div>

          {currentFloor.hints && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic px-1 flex items-center gap-1 break-words">
              <HelpCircle className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>Gợi ý: {currentFloor.hints}</span>
            </p>
          )}
        </div>

        {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ NHẬP LIỆU: CHẠM TỪ (MOBILE) VS GÕ BÀN PHÍM */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs w-full min-w-0">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setInputMode('tokens')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                inputMode === 'tokens'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MousePointerClick className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Chạm từ ghép câu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('keyboard');
                setTimeout(() => textareaRef.current?.focus(), 100);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                inputMode === 'keyboard'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Keyboard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Gõ phím</span>
            </button>
          </div>

          {/* Nút Xóa nhanh câu */}
          {(assembledTokens.length > 0 || userSentence.trim()) && (
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleRemoveLastWord}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer touch-press"
                title="Xóa từ cuối cùng"
              >
                <Delete className="w-3 h-3" />
                <span>Xóa từ cuối</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer touch-press"
                title="Xóa toàn bộ"
              >
                <X className="w-3 h-3" />
                <span>Xóa hết</span>
              </button>
            </div>
          )}
        </div>

        {/* KHAY HIỂN THỊ CÂU ĐÃ GHÉP (WORD BANK TRAY - CHẠM TỪNG TỪ ĐỂ GỠ RA) */}
        {inputMode === 'tokens' ? (
          <div className="min-h-[72px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-200/80 dark:border-indigo-900/80 flex flex-wrap items-center gap-1.5 transition-all w-full max-w-full overflow-hidden">
            {assembledTokens.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium select-none italic">
                👉 Chạm các từ vựng bên dưới để ghép câu dịch...
              </p>
            ) : (
              assembledTokens.map((token, index) => (
                <button
                  key={`${token.id}-${index}`}
                  type="button"
                  onClick={() => handleRemoveTokenAt(index)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-2xs hover:bg-rose-600 active:scale-95 transition-all cursor-pointer group"
                  title="Chạm để gỡ từ này ra khỏi câu"
                >
                  <span>{token.word}</span>
                  <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>
        ) : (
          /* CHẾ ĐỘ GÕ PHÍM TRỰC TIẾP */
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-950 transition-all w-full max-w-full overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={2}
              value={userSentence}
              onChange={(e) => setUserSentence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAttack();
                }
              }}
              disabled={gameState !== 'fighting'}
              placeholder="Gõ bản dịch tiếng Anh của bạn tại đây..."
              className="w-full p-3 bg-transparent outline-hidden text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed"
            />
          </div>
        )}

        {/* KHO TỪ VỰNG GỢI Ý (WORD BANK - TOUCH TARGETS TO RÕ, KHÔNG BỊ TRỄ) */}
        <div className="space-y-1.5 pt-1 w-full min-w-0">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Kho từ vựng chọn nhanh:</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
              {wordCount > 0 ? `${wordCount} từ đã chọn` : 'Chạm từ để thêm'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full max-w-full">
            {availableBankTokens.map((tokenItem) => {
              const isUsed = usedTokenIds.has(tokenItem.id);
              return (
                <button
                  key={tokenItem.id}
                  type="button"
                  onClick={() => handleAddTokenFromBank(tokenItem)}
                  disabled={isUsed || gameState !== 'fighting'}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none touch-press ${
                    isUsed
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800 pointer-events-none'
                      : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white border-slate-300 dark:border-slate-700 shadow-2xs active:bg-indigo-100 dark:active:bg-slate-700 active:scale-95'
                  }`}
                >
                  {tokenItem.word}
                </button>
              );
            })}
          </div>
        </div>

        {/* NÚT TUNG CHIÊU TẤN CÔNG (THUMB-FRIENDLY, TO RÕ TRÊN DI ĐỘNG) */}
        <button
          type="button"
          onClick={() => handleAttack()}
          disabled={!userSentence.trim() || gameState !== 'fighting'}
          className="w-full min-h-[48px] py-3 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white rounded-2xl text-sm sm:text-base font-black shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer touch-press"
        >
          <Swords className="w-5 h-5" />
          <span>TUNG ĐÒN CHÉM NGAY</span>
        </button>

        {/* TÚI ĐẠO CỤ & TUYỆT CHIÊU (POWER-UPS) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Bình Hồi Máu */}
            <button
              type="button"
              onClick={handleUseHealPotion}
              disabled={hasUsedHeal || playerHp >= maxPlayerHp}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 touch-press"
              title="Hồi 1 Trái Tim"
            >
              <span>🧪 Máu</span>
              <span className="text-[10px] text-rose-500 font-semibold">
                {hasUsedHeal ? '(Đã dùng)' : '+1 ❤️'}
              </span>
            </button>

            {/* Đồng Hồ Đóng Băng */}
            <button
              type="button"
              onClick={handleUseFreezeHourglass}
              disabled={hasUsedFreeze}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 touch-press"
              title="Cộng 20 giây"
            >
              <span>❄️ Băng</span>
              <span className="text-[10px] text-sky-500 font-semibold">
                {hasUsedFreeze ? '(Đã dùng)' : '+20s'}
              </span>
            </button>
          </div>

          {/* Tuyệt chiêu Kiếm Thần Excalibur */}
          <button
            type="button"
            onClick={handleUseExcalibur}
            disabled={rageEnergy < 100 || gameState !== 'fighting'}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs touch-press ml-auto ${
              rageEnergy >= 100
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white animate-pulse'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Kiếm Thần ({rageEnergy}%)</span>
          </button>
        </div>
      </div>

      {/* 4. MODAL CHIẾN THẮNG TẦNG (FLOOR CLEARED) */}
      {gameState === 'floor_cleared' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🏆
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                HẠ GỤC {currentFloor.monster.name}!
              </h3>
              <p className="text-xs text-slate-500">
                "{currentFloor.monster.victoryMessage}"
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
              <span className="font-bold text-slate-500 block text-[10px] uppercase">
                Câu dịch chuẩn:
              </span>
              <p className="font-bold text-indigo-700 text-xs sm:text-sm">
                "{currentFloor.answers[0]}"
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1 text-amber-600">
                <Coins className="w-4 h-4" /> +{currentFloor.floor * 25} Vàng
              </span>
              <span>•</span>
              <span className="text-emerald-600">Mở Tầng {currentFloor.floor + 1}</span>
            </div>

            <button
              type="button"
              onClick={handleNextFloor}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer touch-press"
            >
              <span>Leo Tầng {currentFloor.floor + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL THẤT BẠI (GAME OVER) */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto">
              💀
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                HIỆP SĨ ĐÃ KIỆT SỨC!
              </h3>
              <p className="text-xs text-slate-500">
                Đừng nản lòng, hãy hồi sinh và thử lại ngay!
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
              <span className="font-bold text-slate-500 block text-[10px] uppercase">
                Gợi ý câu dịch:
              </span>
              <p className="font-semibold text-slate-800 text-xs">
                "{currentFloor.answers[0]}"
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBackToStudy}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Về phòng học
              </button>
              <button
                type="button"
                onClick={handleRevive}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs touch-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PHÁ ĐẢO THÁP MA VƯƠNG (TOWER COMPLETED) */}
      {gameState === 'tower_completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-white to-amber-50 rounded-3xl p-5 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl border-2 border-amber-300 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-300 animate-bounce">
              👑
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-amber-950">
                PHÁ ĐẢO THÁP MA VƯƠNG!
              </h3>
              <p className="text-xs text-slate-600">
                Bạn đã tiêu diệt toàn bộ ma quái và giải cứu phong ấn ngôn ngữ!
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs space-y-1 text-slate-700">
              <div className="font-extrabold text-amber-900 text-xs sm:text-sm flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Danh Hiệu: KỴ SĨ HUYỀN THOẠI</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBackToStudy}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Về phòng học
              </button>
              <button
                type="button"
                onClick={handleRestartTower}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs touch-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Chơi lại Tầng 1</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
