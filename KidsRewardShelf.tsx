import React, { useEffect, useMemo, useState } from 'react';
import { KidsGrade } from '../lib/kidsLearning';

type KidsRewardShelfProps = {
  grade: KidsGrade;
  earnedBadges: string[];
  onReset?: () => void;
};

type Sticker = { id: string; name: string; picture: string; message: string };

const STICKERS: Sticker[] = [
  { id: 'first-win', name: 'Ngôi sao khởi đầu', picture: '⭐', message: 'Bắt đầu thật tuyệt!' },
  { id: 'perfect-round', name: 'Siêu trí nhớ', picture: '🦉', message: 'Một lượt chơi hoàn hảo!' },
  { id: 'five-streak', name: 'Chuỗi chiến thắng', picture: '🔥', message: 'Bé đang tiến bộ từng ngày!' },
  { id: 'ten-words', name: 'Nhà sưu tập từ', picture: '📚', message: 'Thêm nhiều từ mới vào bộ sưu tập!' },
  { id: 'picture-pro', name: 'Mắt tinh nhanh', picture: '🦋', message: 'Nhìn hình đoán từ rất giỏi!' },
  { id: 'listening-star', name: 'Đôi tai thính', picture: '🐬', message: 'Nghe tiếng Anh thật chăm chú!' },
  { id: 'memory-match', name: 'Bậc thầy ghép đôi', picture: '🧩', message: 'Tìm được những cặp thật khéo!' },
  { id: 'bingo-winner', name: 'Bingo vui vẻ', picture: '🎉', message: 'Bingo! Bé đã tìm đúng!' },
  { id: 'word-builder', name: 'Kiến trúc sư từ', picture: '🧱', message: 'Xếp chữ thành từ thật giỏi!' },
  { id: 'adventure-explorer', name: 'Nhà thám hiểm', picture: '🗺️', message: 'Mỗi từ mới là một chuyến đi!' },
  { id: 'daily-return', name: 'Mầm cây chăm chỉ', picture: '🌱', message: 'Chăm học mỗi ngày!' },
  { id: 'review-master', name: 'Bền bỉ ôn tập', picture: '🧸', message: 'Bé đã ôn lại các từ thật chăm chỉ!' },
];

const STORAGE_PREFIX = 'hoc-eng:kids-rewards:v1:grade:';

function storageKey(grade: KidsGrade): string {
  return `${STORAGE_PREFIX}${grade}`;
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string =>
    typeof id === 'string' && id.length > 0 && id.length <= 100,
  )));
}

function readUnlocked(grade: KidsGrade): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(grade));
    if (!raw) return [];
    return cleanIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeUnlocked(grade: KidsGrade, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(grade), JSON.stringify(ids));
  } catch {
    // The collection still works for this session when storage is unavailable.
  }
}

function friendlyName(id: string): string {
  return id
    .replace(/^(kids[-_:])+/i, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('vi-VN'))
    .slice(0, 44) || 'Sticker bí mật';
}

const GARDEN_STAGES = [
  { picture: '🌱', name: 'Hạt mầm' },
  { picture: '🌿', name: 'Chồi non' },
  { picture: '🌷', name: 'Nụ hoa' },
  { picture: '🌼', name: 'Vườn hoa' },
  { picture: '🌳', name: 'Khu vườn rực rỡ' },
];

export function KidsRewardShelf({ grade, earnedBadges }: KidsRewardShelfProps) {
  const [saved, setSaved] = useState<{ grade: KidsGrade; ids: string[] }>(() => ({
    grade,
    ids: readUnlocked(grade),
  }));
  const earnedSignature = useMemo(
    () => JSON.stringify(cleanIds(earnedBadges).sort()),
    [earnedBadges],
  );
  const currentEarned = useMemo(() => {
    try {
      return cleanIds(JSON.parse(earnedSignature));
    } catch {
      return [];
    }
  }, [earnedSignature]);

  useEffect(() => {
    const merged = Array.from(new Set([...readUnlocked(grade), ...currentEarned]));
    writeUnlocked(grade, merged);
    setSaved({ grade, ids: merged });
  }, [grade, earnedSignature, currentEarned]);

  const unlockedIds = Array.from(new Set([
    ...(saved.grade === grade ? saved.ids : readUnlocked(grade)),
    ...currentEarned,
  ]));
  const knownStickers = STICKERS.map((sticker) => ({
    ...sticker,
    unlocked: unlockedIds.includes(sticker.id),
  }));
  const extraStickers = unlockedIds
    .filter((id) => !STICKERS.some((sticker) => sticker.id === id))
    .map((id, index) => ({
      id,
      name: friendlyName(id),
      picture: ['🎈', '🦊', '🍀', '🐝'][index % 4],
      message: 'Bé vừa mở khóa một sticker mới!',
      unlocked: true,
    }));
  const allStickers = [...knownStickers, ...extraStickers];
  const stageIndex = Math.min(Math.floor(unlockedIds.length / 3), GARDEN_STAGES.length - 1);
  const stage = GARDEN_STAGES[stageIndex];
  const nextStageCount = stageIndex === GARDEN_STAGES.length - 1 ? 0 : 3 - (unlockedIds.length % 3);
  const progress = stageIndex === GARDEN_STAGES.length - 1 ? 3 : unlockedIds.length % 3;

  return (
    <section className="kids-reward-shelf" aria-labelledby="kids-reward-title">
      <div className="kids-reward-header">
        <div className="kids-reward-heading">
          <p className="kids-reward-eyebrow">PHẦN THƯỞNG CỦA BÉ</p>
          <h2 id="kids-reward-title" className="kids-reward-title">Bộ sưu tập sticker</h2>
          <p className="kids-reward-subtitle">Mỗi lần hoàn thành trò chơi, khu vườn của bé lại lớn thêm.</p>
        </div>
        <div className="kids-reward-garden" aria-label={`Khu vườn lớp ${grade}: ${stage.name}`}>
          <span className="kids-reward-garden-picture" aria-hidden="true">{stage.picture}</span>
          <span className="kids-reward-garden-name">{stage.name}</span>
          <span className="kids-reward-garden-count">Lớp {grade} · {unlockedIds.length} sticker</span>
          <progress
            className="kids-reward-garden-progress"
            value={progress}
            max={3}
            aria-label={stageIndex === GARDEN_STAGES.length - 1 ? 'Khu vườn đã phát triển tối đa' : `Tiến độ tới khu vườn tiếp theo: ${progress} trên 3 sticker`}
          />
          <span className="kids-reward-garden-hint">
            {stageIndex === GARDEN_STAGES.length - 1 ? 'Khu vườn đã nở rộ!' : `Thêm ${nextStageCount} sticker để khu vườn lớn hơn`}
          </span>
        </div>
      </div>

      <ul className="kids-reward-grid" aria-label="Sticker đã mở khóa và sticker còn lại">
        {allStickers.map((sticker) => (
          <li
            className={`kids-reward-sticker${sticker.unlocked ? ' is-unlocked' : ' is-locked'}`}
            key={sticker.id}
            aria-label={sticker.unlocked ? `${sticker.name}. ${sticker.message}` : `${sticker.name}, chưa mở khóa`}
          >
            <span className="kids-reward-sticker-picture" aria-hidden="true">{sticker.unlocked ? sticker.picture : '🔒'}</span>
            <span className="kids-reward-sticker-name">{sticker.name}</span>
            <span className="kids-reward-sticker-state">{sticker.unlocked ? 'Đã nhận' : 'Chưa mở'}</span>
          </li>
        ))}
      </ul>
      <p className="kids-reward-note" aria-live="polite">
        {unlockedIds.length === 0
          ? 'Chơi một trò bất kỳ để nhận sticker đầu tiên nhé!'
          : `Bé đã sưu tầm ${unlockedIds.length} sticker. Cố lên, khu vườn đang lớn dần!`}
      </p>
    </section>
  );
}

