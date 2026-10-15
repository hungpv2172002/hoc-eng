import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import kidsAudio from '../data/kidsAudio.json';
import { KidsGrade, KidsWord, shuffled } from '../lib/kidsLearning';
import { playKidsGameSound, stopKidsGameSounds } from '../lib/soundFx';

type Game = 'memory' | 'bingo' | 'adventure' | 'review';
type Card = { id: number; word: KidsWord; side: 'word' | 'picture' };

const BINGO_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type KidsGameHubProps = {
  grade: KidsGrade;
  words: KidsWord[];
  wrongWords: string[];
  adventureStage: number;
  onMistake: (word: KidsWord) => void;
  onCorrectWord: (word: KidsWord) => void;
  onClearMistake: (word: KidsWord) => void;
  onSetAdventureStage: (stage: number) => void;
  onAward: (id: string) => void;
};

function fallbackSpeech(word: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => /^en(-US|[-_]US)/i.test(voice.lang))
    || voices.find((voice) => /^en/i.test(voice.lang)) || null;
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  utterance.pitch = 1.12;
  window.speechSynthesis.speak(utterance);
}

export function KidsGameHub({ grade, words, wrongWords, adventureStage, onMistake, onCorrectWord, onClearMistake, onSetAdventureStage, onAward }: KidsGameHubProps) {
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const uniqueWords = useMemo(() => Array.from(new Map(words.map((word) => [word.word, word])).values()), [words]);
  const [cards, setCards] = useState<Card[]>([]);
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [bingoWords, setBingoWords] = useState<KidsWord[]>([]);
  const [bingoTarget, setBingoTarget] = useState<KidsWord | null>(null);
  const [bingoMarked, setBingoMarked] = useState<string[]>([]);
  const [adventureWords, setAdventureWords] = useState<KidsWord[]>([]);
  const [adventureOptions, setAdventureOptions] = useState<KidsWord[][]>([]);
  const [adventureIndex, setAdventureIndex] = useState(0);
  const [adventureFinished, setAdventureFinished] = useState(false);
  const [revealedReview, setRevealedReview] = useState<string | null>(null);
  const memoryTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (memoryTimer.current !== null) window.clearTimeout(memoryTimer.current);
    activeAudio.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopKidsGameSounds();
  }, []);

  useEffect(() => {
    setGame(null);
    setCards([]);
    setFaceUp([]);
    setMatched([]);
    setBingoTarget(null);
    setBingoWords([]);
    setBingoMarked([]);
    setAdventureWords([]);
    setAdventureOptions([]);
    setAdventureIndex(0);
    setAdventureFinished(false);
    setRevealedReview(null);
  }, [grade]);

  const speakWord = (word: string) => {
    activeAudio.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const recordingUrl = (kidsAudio as Record<string, string>)[word];
    if (recordingUrl) {
      const recording = new Audio(recordingUrl);
      activeAudio.current = recording;
      recording.play().catch(() => fallbackSpeech(word));
      return;
    }
    fallbackSpeech(word);
  };

  const playGameSound = (sound: Parameters<typeof playKidsGameSound>[0]) => {
    if (!soundMuted) playKidsGameSound(sound);
  };

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    if (nextMuted) stopKidsGameSounds();
    setSoundMuted(nextMuted);
  };

  const soundToggle = <button type="button" className="kids-game-sound-toggle" onClick={toggleSound} aria-pressed={soundMuted}>
    {soundMuted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
    <span>Âm thanh: {soundMuted ? 'đã tắt' : 'đang bật'}</span>
  </button>;

  const startMemory = () => {
    const chosen = shuffled(uniqueWords).slice(0, 6);
    const deck = shuffled(chosen.flatMap((word) => [
      { id: Math.random(), word, side: 'word' as const },
      { id: Math.random(), word, side: 'picture' as const },
    ]));
    setCards(deck);
    setFaceUp([]);
    setMatched([]);
    setMoves(0);
    if (memoryTimer.current !== null) window.clearTimeout(memoryTimer.current);
    setGame('memory');
  };

  const flipCard = (card: Card) => {
    if (faceUp.length >= 2 || matched.includes(card.id) || faceUp.includes(card.id)) return;
    playGameSound('flip');
    const next = [...faceUp, card.id];
    setFaceUp(next);
    if (next.length === 2) {
      setMoves((value) => value + 1);
      const first = cards.find((item) => item.id === next[0]);
      const second = cards.find((item) => item.id === next[1]);
      if (first && second && first.word.word === second.word.word && first.side !== second.side) {
        const nextMatched = [...matched, ...next];
        setMatched(nextMatched);
        onCorrectWord(first.word);
        setFaceUp([]);
        if (nextMatched.length === cards.length) {
          playGameSound('reward');
          onAward('memory-match');
          onAward('first-win');
        } else {
          playGameSound('correct');
        }
      } else {
        playGameSound('wrong');
        memoryTimer.current = window.setTimeout(() => {
          setFaceUp([]);
          memoryTimer.current = null;
        }, 750);
      }
    }
  };

  const startBingo = () => {
    const board = shuffled(uniqueWords).slice(0, 9);
    setBingoWords(board);
    setBingoTarget(shuffled(board)[0] ?? null);
    setBingoMarked([]);
    setGame('bingo');
  };

  const markBingo = (word: KidsWord) => {
    if (!bingoTarget || bingoMarked.includes(word.word)) return;
    if (word.word !== bingoTarget.word) {
      playGameSound('wrong');
      onMistake(bingoTarget);
      return;
    }
    const next = [...bingoMarked, word.word];
    setBingoMarked(next);
    onCorrectWord(word);
    const nextSet = new Set(next);
    const hasLine = BINGO_LINES.some((line) => line.every((index) => nextSet.has(bingoWords[index]?.word ?? '')));
    if (hasLine) {
      playGameSound('bingo');
      setBingoTarget(null);
      onAward('bingo-winner');
      onAward('first-win');
      return;
    }
    playGameSound('correct');
    const remaining = bingoWords.filter((item) => !next.includes(item.word));
    setBingoTarget(shuffled(remaining)[0] ?? null);
  };

  const startAdventure = () => {
    const route = shuffled(uniqueWords).slice(0, 5);
    setAdventureWords(route);
    setAdventureOptions(route.map((target) => shuffled([
      target,
      ...shuffled(uniqueWords.filter((word) => word.word !== target.word)).slice(0, 2),
    ])));
    setAdventureIndex(0);
    setAdventureFinished(false);
    setGame('adventure');
  };

  const answerAdventure = (choice: KidsWord) => {
    const target = adventureWords[adventureIndex];
    if (!target || adventureFinished) return;
    if (choice.word !== target.word) {
      playGameSound('wrong');
      onMistake(target);
      setAdventureFinished(true);
      return;
    }
    const nextIndex = adventureIndex + 1;
    setAdventureIndex(nextIndex);
    onCorrectWord(target);
    onSetAdventureStage(Math.max(adventureStage, nextIndex));
    if (nextIndex === adventureWords.length) {
      playGameSound('reward');
      setAdventureFinished(true);
      onAward('adventure-explorer');
      onAward('first-win');
    } else {
      playGameSound('correct');
    }
  };

  const begin = (selectedGame: Game) => {
    if (selectedGame === 'memory') startMemory();
    else if (selectedGame === 'bingo') startBingo();
    else if (selectedGame === 'adventure') startAdventure();
    else { setRevealedReview(null); setGame('review'); }
  };

  const backToGames = () => {
    if (memoryTimer.current !== null) {
      window.clearTimeout(memoryTimer.current);
      memoryTimer.current = null;
      setFaceUp([]);
    }
    setGame(null);
    setBingoTarget(null);
    setAdventureFinished(false);
  };

  const wordByName = new Map(uniqueWords.map((word) => [word.word, word]));
  const reviewItems = wrongWords.map((name) => wordByName.get(name)).filter((word): word is KidsWord => Boolean(word));
  const target = adventureWords[adventureIndex];
  const options = adventureOptions[adventureIndex] ?? [];

  return (
    <section className="kids-game-hub" aria-labelledby="kids-game-hub-title">
      {!game ? (
        <>
          <div className="kids-game-section-heading">
            <div><p className="kids-game-eyebrow">LỚP {grade}</p><h2 id="kids-game-hub-title">Chọn trò chơi</h2></div>
            <div className="kids-game-heading-tools">
              <span className="kids-game-review-count">📖 {reviewItems.length} từ cần ôn</span>
              {soundToggle}
            </div>
          </div>
          <div className="kids-game-grid">
            <button type="button" className="kids-game-card kids-memory-card" onClick={() => begin('memory')}>
              <span aria-hidden="true">🧩</span><strong>Lật thẻ tìm cặp</strong><small>Ghép từ tiếng Anh với hình và nghĩa đúng.</small>
            </button>
            <button type="button" className="kids-game-card kids-bingo-card" onClick={() => begin('bingo')}>
              <span aria-hidden="true">🔊</span><strong>Bingo nghe từ</strong><small>Nghe từ rồi tìm ô đúng trên bảng.</small>
            </button>
            <button type="button" className="kids-game-card kids-adventure-card" onClick={() => begin('adventure')}>
              <span aria-hidden="true">🗺️</span><strong>Bản đồ phiêu lưu</strong><small>Chặng đã mở: {adventureStage}/5 · Trả lời để đi tiếp.</small>
            </button>
            <button type="button" className="kids-game-card kids-review-card" onClick={() => begin('review')}>
              <span aria-hidden="true">💡</span><strong>Ôn từ cần nhớ</strong><small>{reviewItems.length ? `Bé có ${reviewItems.length} từ để luyện lại.` : 'Từ trả lời sai sẽ hiện ở đây.'}</small>
            </button>
          </div>
        </>
      ) : (
        <div className="kids-game-play">
          <div className="kids-game-play-header">
            <button type="button" className="kids-game-back" onClick={backToGames}>← Trò chơi</button>
            <span>Lớp {grade}</span>
            {soundToggle}
          </div>

          {game === 'memory' && (
            <div>
              <div className="kids-game-section-heading"><div><p className="kids-game-eyebrow">🧩 TÌM CẶP</p><h2>Lật thẻ ghép đôi</h2></div><span className="kids-game-review-count">Lượt lật: {moves}</span></div>
              <div className="kids-memory-grid">
                {cards.map((card) => {
                  const isOpen = faceUp.includes(card.id) || matched.includes(card.id);
                  return <button type="button" key={card.id} onClick={() => flipCard(card)} disabled={isOpen} className={`kids-memory-tile${matched.includes(card.id) ? ' is-matched' : ''}`} aria-label={isOpen ? (card.side === 'word' ? card.word.word : `${card.word.picture} ${card.word.meaning}`) : 'Lá bài úp'}>
                    {isOpen ? <>{card.side === 'word' ? <strong>{card.word.word}</strong> : <><span aria-hidden="true">{card.word.picture}</span><small>{card.word.meaning}</small></>}</> : <span aria-hidden="true">❔</span>}
                  </button>;
                })}
              </div>
              {matched.length === cards.length && <p className="kids-game-success" role="status">Tuyệt lắm! Bé đã ghép đủ các cặp. 🌟</p>}
              <button type="button" className="kids-game-secondary" onClick={startMemory}>Chơi lượt mới</button>
            </div>
          )}

          {game === 'bingo' && (
            <div>
              <div className="kids-game-section-heading"><div><p className="kids-game-eyebrow">🔊 BINGO</p><h2>Nghe từ và chọn ô</h2></div><span className="kids-game-review-count">Đúng {bingoMarked.length} ô</span></div>
              {bingoTarget ? <div className="kids-bingo-prompt"><button type="button" className="kids-audio-button" onClick={() => speakWord(bingoTarget.word)}>🔊 Nghe từ</button><span>Nối 3 ô đúng thành một hàng để Bingo nhé.</span></div> : <p className="kids-game-success" role="status">BINGO! Bé đã hoàn thành. 🎉</p>}
              <div className="kids-bingo-grid">
                {bingoWords.map((word) => <button type="button" key={word.word} disabled={bingoMarked.includes(word.word) || !bingoTarget} onClick={() => markBingo(word)} className={`kids-bingo-cell${bingoMarked.includes(word.word) ? ' is-marked' : ''}`}><span aria-hidden="true">{word.picture}</span><strong>{bingoMarked.includes(word.word) ? word.word : word.meaning}</strong>{bingoMarked.includes(word.word) && <small>✓ Đúng</small>}</button>)}
              </div>
              <button type="button" className="kids-game-secondary" onClick={startBingo}>Chơi bảng mới</button>
            </div>
          )}

          {game === 'adventure' && (
            <div>
              <div className="kids-game-section-heading"><div><p className="kids-game-eyebrow">🗺️ CHUYẾN ĐI LỚP {grade}</p><h2>Đường đến kho báu</h2></div><span className="kids-game-review-count">Chặng {Math.min(adventureIndex + (adventureFinished ? 0 : 1), 5)}/5</span></div>
              <div className="kids-adventure-map" aria-label={`Bản đồ phiêu lưu, đã mở ${Math.max(adventureStage, adventureIndex)} trên 5 chặng`}>
                {[1, 2, 3, 4, 5].map((stage) => <span key={stage} className={`kids-adventure-stop${stage <= Math.max(adventureStage, adventureIndex) ? ' is-open' : ''}${stage === adventureIndex + 1 && !adventureFinished ? ' is-current' : ''}`}><span aria-hidden="true">{stage === 5 ? '🏆' : stage <= adventureStage ? '⭐' : '🌳'}</span><small>{stage}</small></span>)}
              </div>
              {!adventureFinished && target ? <div className="kids-adventure-question"><span className="kids-adventure-picture" aria-hidden="true">{target.picture}</span><h3>{target.meaning} tiếng Anh là gì?</h3><div className="kids-game-options">{options.map((word) => <button type="button" key={word.word} className="kids-game-option" onClick={() => answerAdventure(word)}>{word.word}</button>)}</div></div> : <div className="kids-adventure-result"><span aria-hidden="true">{adventureIndex >= 5 ? '🏆' : '🧭'}</span><h3>{adventureIndex >= 5 ? 'Đã tìm thấy kho báu!' : 'Chuyến đi tạm dừng'}</h3><p>{adventureIndex >= 5 ? 'Bé đã vượt qua cả 5 chặng.' : `Bé đã đi đến chặng ${adventureIndex}. Chặng đã mở được lưu lại.`}</p><button type="button" className="kids-game-secondary" onClick={startAdventure}>Đi chuyến mới</button></div>}
            </div>
          )}

          {game === 'review' && (
            <div>
              <div className="kids-game-section-heading"><div><p className="kids-game-eyebrow">💡 LUYỆN LẠI NHẸ NHÀNG</p><h2>Từ bé muốn nhớ</h2></div><span className="kids-game-review-count">Còn {reviewItems.length} từ</span></div>
              {reviewItems.length ? <ul className="kids-review-list">{reviewItems.map((word) => <li key={word.word} className="kids-review-item"><span className="kids-review-picture" aria-hidden="true">{word.picture}</span><div className="kids-review-content">{revealedReview === word.word ? <><strong>{word.word}</strong><span>{word.meaning}</span></> : <><strong>{word.meaning}</strong><span>Nhớ từ tiếng Anh nào nhỉ?</span></>}</div>{revealedReview === word.word ? <button type="button" className="kids-review-action" onClick={() => { onCorrectWord(word); onClearMistake(word); if (reviewItems.length === 1) { playGameSound('reward'); onAward('review-master'); } else playGameSound('correct'); setRevealedReview(null); }}>Đã nhớ ✓</button> : <button type="button" className="kids-review-action" onClick={() => setRevealedReview(word.word)}>Xem từ</button>}</li>)}</ul> : <div className="kids-adventure-result"><span aria-hidden="true">🌈</span><h3>Chưa có từ nào cần ôn</h3><p>Khi bé luyện trò chơi, từ cần nhớ sẽ được lưu ở đây.</p></div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
