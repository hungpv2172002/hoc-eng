import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Shield,
  Heart,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  RefreshCw,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Coins,
  ChevronRight,
  HelpCircle,
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

interface TowerBattleViewProps {
  profile: Profile | null;
  onBackToStudy: () => void;
}

export const TowerBattleView: React.FC<TowerBattleViewProps> = ({
  profile,
  onBackToStudy,
}) => {
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const currentFloor = TOWER_FLOORS[currentFloorIndex] || TOWER_FLOORS[0];

  // Chỉ số Hiệp Sĩ
  const [playerHp, setPlayerHp] = useState(3); // 3 Trái tim
  const [maxPlayerHp] = useState(3);
  const [rageEnergy, setRageEnergy] = useState(0); // 0 - 100 nộ khí
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

  // Trạng thái chiến đấu
  const [userSentence, setUserSentence] = useState('');
  const [timeLeft, setTimeLeft] = useState(35); // 35 giây đếm ngược
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [comboCount, setComboCount] = useState(0);
  const [floatingText, setFloatingText] = useState<{
    text: string;
    type: 'crit' | 'hit' | 'hurt' | 'heal';
  } | null>(null);

  // Hiệu ứng hoạt họa
  const [heroAction, setHeroAction] = useState<'idle' | 'attack' | 'hurt'>('idle');
  const [monsterAction, setMonsterAction] = useState<'idle' | 'attack' | 'hurt'>('idle');

  // Trạng thái kết thúc
  const [gameState, setGameState] = useState<
    'fighting' | 'floor_cleared' | 'game_over' | 'tower_completed'
  >('fighting');

  // Đạo cụ (Items)
  const [hasUsedHeal, setHasUsedHeal] = useState(false);
  const [hasUsedFreeze, setHasUsedFreeze] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Nạp tầng mới
  useEffect(() => {
    setMonsterHp(currentFloor.monster.maxHp);
    setMonsterMaxHp(currentFloor.monster.maxHp);
    setUserSentence('');
    setTimeLeft(35);
    setIsTimerActive(true);
    setGameState('fighting');
    setHeroAction('idle');
    setMonsterAction('idle');
    setHasUsedHeal(false);
    setHasUsedFreeze(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, [currentFloorIndex]);

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

  // Khi hết thời gian -> Quái vật đánh lén
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

  // Người chơi bấm Tấn công / Enter
  const handleAttack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userSentence.trim() || gameState !== 'fighting') return;

    const normalized = normalizeSentence(userSentence);
    const isCorrect = currentFloor.answers.some(
      (ans) => normalizeSentence(ans) === normalized
    );

    if (isCorrect) {
      // Đòn dịch CHÍNH XÁC!
      const isCritical = timeLeft >= 25; // Nhanh dưới 10 giây tính từ lúc bắt đầu 35s
      const damage = isCritical
        ? Math.round(monsterMaxHp * 0.75) // Đòn chí mạng chém cực đau
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

      // Quái vật nhận sát thương
      setMonsterHp((prev) => {
        const next = Math.max(0, prev - damage);
        if (next === 0) {
          setTimeout(() => handleMonsterDefeated(), 500);
        }
        return next;
      });

      // Âm thanh phát âm câu tiếng Anh chuẩn để người học nghe lại
      setTimeout(() => {
        playSpeech(currentFloor.answers[0]);
      }, 700);

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
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });

    const rewardCoins = 25 * (currentFloor.floor);
    const newCoins = goldCoins + rewardCoins;
    setGoldCoins(newCoins);
    try {
      localStorage.setItem('tower_battle_coins', newCoins.toString());
    } catch (e) {}

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

  // Sử dụng Kiếm Thần (Excalibur) khi nộ khí 100%
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

  // Bấm vào từ gợi ý để ghép câu nhanh
  const handleAddToken = (token: string) => {
    setUserSentence((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return token;
      return `${trimmed} ${token}`;
    });
    inputRef.current?.focus();
  };

  // Tính phần trăm máu quái vật
  const monsterHpPercent = Math.max(0, Math.round((monsterHp / monsterMaxHp) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* 1. THANH TRẠNG THÁI TRẬN ĐẤU TRÊN CÙNG */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Nút quay lại phòng học */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToStudy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Phòng học</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              🏰
            </span>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Tháp Ma Vương</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                  Tầng {currentFloor.floor}/{TOWER_FLOORS.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Dịch câu để chém quái vật leo lên đỉnh tháp
              </p>
            </div>
          </div>
        </div>

        {/* Chỉ số Hiệp sĩ & Phần thưởng */}
        <div className="flex items-center gap-3">
          {/* Vàng */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{goldCoins} Vàng</span>
          </div>

          {/* Combo */}
          {comboCount > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black animate-bounce">
              <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
              <span>x{comboCount} Combo!</span>
            </div>
          )}

          {/* Trái tim (HP) */}
          <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {[1, 2, 3].map((heartIdx) => (
              <Heart
                key={heartIdx}
                className={`w-4 h-4 transition-all ${
                  heartIdx <= playerHp
                    ? 'text-rose-500 fill-rose-500 scale-100'
                    : 'text-slate-300 scale-90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. SÂN KHẤU CHIẾN ĐẤU CHÍNH (BATTLE ARENA) */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-8 text-white border border-slate-800 shadow-2xl min-h-[300px] flex flex-col justify-between">
        {/* Nền hoạt họa hạt năng lượng */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Chữ bay sát thương nổi lên giữa sân đấu */}
        {floatingText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-300">
            <div
              className={`px-4 py-2 rounded-2xl font-black text-base sm:text-xl shadow-2xl border ${
                floatingText.type === 'crit'
                  ? 'bg-rose-600 text-yellow-300 border-yellow-400 scale-110 animate-pulse'
                  : floatingText.type === 'hit'
                  ? 'bg-amber-500 text-white border-amber-300'
                  : floatingText.type === 'heal'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-rose-800 text-white border-rose-600'
              }`}
            >
              {floatingText.text}
            </div>
          </div>
        )}

        {/* Hàng ngang đấu sĩ: Hiệp sĩ (Trái) vs Quái vật (Phải) */}
        <div className="relative z-10 flex items-center justify-between gap-4 py-4 sm:py-6">
          {/* HIỆP SĨ */}
          <div className="flex flex-col items-center text-center space-y-2 max-w-[140px] sm:max-w-[180px]">
            {/* Sprite Hiệp Sĩ */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-sky-400 border-2 border-indigo-200 flex items-center justify-center text-3xl sm:text-4xl shadow-lg transition-transform duration-300 ${
                heroAction === 'attack'
                  ? 'translate-x-6 scale-110 rotate-6 shadow-indigo-500/50'
                  : heroAction === 'hurt'
                  ? '-translate-x-4 scale-95 brightness-75 animate-shake'
                  : 'hover:scale-105'
              }`}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Hero"
                  className="w-full h-full rounded-3xl object-cover"
                />
              ) : (
                <span>🛡️</span>
              )}
            </div>

            <div>
              <div className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[130px]">
                {profile?.full_name || 'Hiệp Sĩ Dịch Thuật'}
              </div>
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                Dũng Sĩ Cấp {currentFloor.floor}
              </div>
            </div>

            {/* Thanh Nộ Khí (Rage) */}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                <span>Nộ khí:</span>
                <span>{rageEnergy}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-300"
                  style={{ width: `${rageEnergy}%` }}
                />
              </div>
            </div>
          </div>

          {/* ICON ĐỐI ĐẦU VS */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shadow-inner">
              VS
            </div>

            {/* Đồng hồ đếm ngược nạp chiêu */}
            <div className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200">
              <Clock className={`w-3.5 h-3.5 ${timeLeft <= 10 ? 'text-rose-400 animate-spin' : 'text-sky-400'}`} />
              <span className={timeLeft <= 10 ? 'text-rose-400 font-black animate-pulse' : ''}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* QUÁI VẬT TẦNG THÁP */}
          <div className="flex flex-col items-center text-center space-y-2 max-w-[150px] sm:max-w-[200px]">
            {/* Sprite Quái Vật */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr ${currentFloor.monster.bgGradient} border-2 border-white/20 flex items-center justify-center text-4xl sm:text-5xl shadow-xl transition-transform duration-300 ${
                monsterAction === 'attack'
                  ? '-translate-x-6 scale-110 -rotate-6'
                  : monsterAction === 'hurt'
                  ? 'translate-x-4 scale-90 brightness-150 animate-shake'
                  : 'hover:scale-105'
              }`}
            >
              <span>{currentFloor.monster.emoji}</span>
            </div>

            <div>
              <div className="font-black text-xs sm:text-sm text-white">
                {currentFloor.monster.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {currentFloor.monster.title}
              </div>
            </div>

            {/* Thanh Máu Quái Vật (HP) */}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                <span>HP Quái:</span>
                <span className="font-mono">
                  {monsterHp}/{monsterMaxHp}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    monsterHpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : monsterHpPercent > 20
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-400 animate-pulse'
                  }`}
                  style={{ width: `${monsterHpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lời thoại khiêu khích của quái vật */}
        <div className="relative z-10 bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 rounded-2xl p-3 text-xs text-center text-slate-300 italic">
          "{currentFloor.monster.tauntMessage}"
        </div>
      </div>

      {/* 3. BÀN RA CHIÊU & KHU VỰC DỊCH THUẬT (ACTION AREA) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-4">
        {/* Câu thần chú tiếng Việt cần giải mã */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Câu thần chú cần dịch sang Tiếng Anh:
            </span>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {currentFloor.category}
            </span>
          </div>

          <div className="p-4 bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl text-slate-900 font-extrabold text-base sm:text-lg">
            "{currentFloor.questionVi}"
          </div>

          {currentFloor.hints && (
            <p className="text-[11px] text-slate-500 italic px-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-500" />
              <span>Gợi ý: {currentFloor.hints}</span>
            </p>
          )}
        </div>

        {/* Khung nhập câu dịch tiếng Anh */}
        <form onSubmit={handleAttack} className="space-y-3">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={userSentence}
              onChange={(e) => setUserSentence(e.target.value)}
              disabled={gameState !== 'fighting'}
              placeholder="Nhập câu dịch tiếng Anh để tung đòn kiếm..."
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!userSentence.trim() || gameState !== 'fighting'}
              className="absolute right-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Swords className="w-4 h-4" />
              <span>Chém!</span>
            </button>
          </div>

          {/* Dãy nút bấm từ vựng nhanh (Dành cho điện thoại hoặc lười gõ phím) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Bấm từ để ghép câu nhanh:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentFloor.wordTokens.map((word, wIdx) => (
                <button
                  key={wIdx}
                  type="button"
                  onClick={() => handleAddToken(word)}
                  disabled={gameState !== 'fighting'}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {word}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUserSentence('')}
                disabled={!userSentence}
                className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                title="Xóa trắng"
              >
                Xóa
              </button>
            </div>
          </div>
        </form>

        {/* 4. TÚI ĐỒ VẬT PHẨM & TUYỆT CHIÊU (POWER-UPS) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Bình Hồi Máu */}
            <button
              type="button"
              onClick={handleUseHealPotion}
              disabled={hasUsedHeal || playerHp >= maxPlayerHp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-2xs active:scale-95"
              title="Hồi 1 Trái Tim (1 lần/trận)"
            >
              <span>🧪 Hồi Máu</span>
              {hasUsedHeal && <span className="text-[10px]">(Đã dùng)</span>}
            </button>

            {/* Đồng Hồ Đóng Băng */}
            <button
              type="button"
              onClick={handleUseFreezeHourglass}
              disabled={hasUsedFreeze}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-2xs active:scale-95"
              title="Cộng thêm 20 giây suy nghĩ"
            >
              <span>❄️ Đóng Băng</span>
              {hasUsedFreeze && <span className="text-[10px]">(Đã dùng)</span>}
            </button>
          </div>

          {/* Nút Tuyệt Chiêu Kiếm Thần Excalibur khi nộ 100% */}
          <button
            type="button"
            onClick={handleUseExcalibur}
            disabled={rageEnergy < 100 || gameState !== 'fighting'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
              rageEnergy >= 100
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white animate-pulse hover:scale-105 shadow-amber-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>⚡ Kiếm Thần Excalibur (Nộ Khí 100%)</span>
          </button>
        </div>
      </div>

      {/* 5. MODAL CHIẾN THẮNG TẦNG (FLOOR CLEARED) */}
      {gameState === 'floor_cleared' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🏆
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                HẠ GỤC {currentFloor.monster.name}!
              </h3>
              <p className="text-xs text-slate-500">
                "{currentFloor.monster.victoryMessage}"
              </p>
            </div>

            {/* Câu trả lời chuẩn */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
              <span className="font-bold text-slate-500 block text-[11px] uppercase">
                Câu dịch chuẩn xác:
              </span>
              <p className="font-bold text-indigo-700 text-sm">
                "{currentFloor.answers[0]}"
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1 text-amber-600">
                <Coins className="w-4 h-4" /> +{currentFloor.floor * 25} Vàng
              </span>
              <span>•</span>
              <span className="text-emerald-600">Mở khóa tầng {currentFloor.floor + 1}</span>
            </div>

            <button
              type="button"
              onClick={handleNextFloor}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Tiếp tục leo Tầng {currentFloor.floor + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL THẤT BẠI (GAME OVER) */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto">
              💀
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                HIỆP SĨ ĐÃ KIỆT SỨC!
              </h3>
              <p className="text-xs text-slate-500">
                Quái vật {currentFloor.monster.name} quá mạnh! Đừng nản lòng, hãy hồi sinh và thử lại ngay.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
              <span className="font-bold text-slate-500 block text-[11px] uppercase">
                Gợi ý cho câu này:
              </span>
              <p className="font-semibold text-slate-800">
                "{currentFloor.answers[0]}"
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onBackToStudy}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
              >
                Về phòng học
              </button>
              <button
                type="button"
                onClick={handleRevive}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Hồi sinh & Thử lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL PHÁ ĐẢO THÁP MA VƯƠNG (TOWER COMPLETED) */}
      {gameState === 'tower_completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-white to-amber-50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl border-2 border-amber-300 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center text-4xl mx-auto shadow-xl shadow-amber-300 animate-bounce">
              👑
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-amber-950">
                CHÚC MỪNG ĐẠI PHÁP SƯ NGÔN NGỮ!
              </h3>
              <p className="text-xs text-slate-600">
                Bạn đã tiêu diệt Ma Vương Hắc Long và giải cứu phong ấn ngôn ngữ của toàn bộ nhân loại!
              </p>
            </div>

            <div className="p-4 bg-white/90 rounded-2xl border border-amber-200 text-xs space-y-2 text-slate-700 shadow-xs">
              <div className="font-extrabold text-amber-900 text-sm flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Danh Hiệu Mở Khóa: KỴ SĨ HUYỀN THOẠI</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Vốn từ vựng và ngữ pháp của bạn đã đạt đến đẳng cấp siêu việt!
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onBackToStudy}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
              >
                Về phòng học
              </button>
              <button
                type="button"
                onClick={handleRestartTower}
                className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thách thức lại từ Tầng 1</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
