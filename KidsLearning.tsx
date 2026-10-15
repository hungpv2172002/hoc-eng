import React, { useEffect, useMemo, useRef, useState } from 'react';
import kidsAudio from '../data/kidsAudio.json';
import { createKidsRound, getKidsWordsForGrade, KIDS_WORDS, KidsActivity, KidsGrade, KidsWord } from '../lib/kidsLearning';
import { KidsProgress, readKidsProgress, writeKidsProgress } from '../lib/kidsProgress';
import { KidsRewardShelf } from './KidsRewardShelf';
import { KidsGameHub } from './KidsGameHub';
import { KidsGardenScene } from './KidsGardenScene';

export function KidsLearning({ onBack }: { onBack?: () => void } = {}) {
  const [grade, setGrade] = useState<KidsGrade>(1);
  const [publishedWords, setPublishedWords] = useState<KidsWord[]>([]);
  const [activity, setActivity] = useState<KidsActivity | null>(null);
  const [round, setRound] = useState(() => createKidsRound(1));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [progress, setProgress] = useState<KidsProgress>(() => readKidsProgress(1));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const question = round[index];
  const canSpeak = typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window);
  const gradeLabel = useMemo(() => `Lớp ${grade}`, [grade]);
  const allWords = useMemo(() => {
    const words = new Map(KIDS_WORDS.map((word) => [word.word.trim().toLowerCase(), word]));
    publishedWords.forEach((word) => {
      const key = word.word.trim().toLowerCase();
      if (key && word.meaning && word.picture && Array.isArray(word.grades) && !words.has(key)) {
        words.set(key, word);
      }
    });
    return [...words.values()];
  }, [publishedWords]);
  const gradeWords = useMemo(() => getKidsWordsForGrade(grade, allWords), [grade, allWords]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/kids/words')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!cancelled && Array.isArray(result?.data)) setPublishedWords(result.data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [canSpeak]);

  useEffect(() => {
    setProgress(readKidsProgress(grade));
  }, [grade]);

  function updateProgress(change: (current: KidsProgress) => KidsProgress) {
    setProgress((current) => {
      const next = change(current);
      writeKidsProgress(grade, next);
      return next;
    });
  }

  function awardBadge(id: string) {
    updateProgress((current) => ({
      ...current,
      earnedBadges: current.earnedBadges.includes(id) ? current.earnedBadges : [...current.earnedBadges, id],
    }));
  }

  function rememberMistake(word: string) {
    updateProgress((current) => ({
      ...current,
      wrongWords: current.wrongWords.includes(word) ? current.wrongWords : [...current.wrongWords, word],
      correctStreak: 0,
    }));
  }

  function recordCorrectWord(word: string) {
    updateProgress((current) => {
      const practicedWords = current.practicedWords.includes(word) ? current.practicedWords : [...current.practicedWords, word];
      const earnedBadges = practicedWords.length >= 10 && !current.earnedBadges.includes('ten-words')
        ? [...current.earnedBadges, 'ten-words']
        : current.earnedBadges;
      return { ...current, practicedWords, earnedBadges };
    });
  }

  function speak(word: string) {
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    const recordingUrl = (kidsAudio as Record<string, string>)[word];
    if (recordingUrl && typeof Audio !== 'undefined') {
      const recording = new Audio(recordingUrl);
      audioRef.current = recording;
      recording.onplay = () => setIsSpeaking(true);
      recording.onended = () => setIsSpeaking(false);
      recording.onerror = () => fallbackSpeech(word);
      recording.play().catch(() => fallbackSpeech(word));
      return;
    }
    fallbackSpeech(word);
  }

  function fallbackSpeech(word: string) {
    if (!canSpeak || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /^en(-US|[-_]US)/i.test(voice.lang))
      || voices.find((voice) => /^en/i.test(voice.lang))
      || null;
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function start(mode: KidsActivity) {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActivity(mode);
    setRound(createKidsRound(grade, gradeWords));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  function choose(word: string) {
    if (selected || !question) return;
    setSelected(word);
    if (word === question.target.word) {
      setScore((value) => value + 1);
      updateProgress((current) => {
        const correctStreak = current.correctStreak + 1;
        const practicedWords = current.practicedWords.includes(question.target.word)
          ? current.practicedWords
          : [...current.practicedWords, question.target.word];
        const unlocks = [
          ...(correctStreak >= 5 ? ['five-streak'] : []),
          ...(practicedWords.length >= 10 ? ['ten-words'] : []),
        ];
        const earnedBadges = Array.from(new Set([...current.earnedBadges, ...unlocks]));
        return { ...current, correctStreak, practicedWords, earnedBadges };
      });
    } else {
      rememberMistake(question.target.word);
    }
  }

  function next() {
    if (!selected) return;
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (index === round.length - 1) {
      setFinished(true);
      updateProgress((current) => {
        const today = new Date().toISOString().slice(0, 10);
        const newBadges = ['first-win'];
        if (current.lastActivityDate && current.lastActivityDate !== today) newBadges.push('daily-return');
        if (score === round.length) newBadges.push('perfect-round');
        if (score >= Math.ceil(round.length * 0.8)) newBadges.push(activity === 'picture' ? 'picture-pro' : 'listening-star');
        const earnedBadges = Array.from(new Set([...current.earnedBadges, ...newBadges]));
        return {
          ...current,
          completedRounds: current.completedRounds + 1,
          lastActivityDate: today,
          earnedBadges,
        };
      });
    }
    else {
      setIndex((value) => value + 1);
      setSelected(null);
    }
  }

  function changeGrade(value: KidsGrade) {
    setGrade(value);
    setProgress(readKidsProgress(value));
    setActivity(null);
    setRound(createKidsRound(value, getKidsWordsForGrade(value, allWords)));
    setIndex(0);
    setSelected(null);
    setFinished(false);
  }

  const tile = 'kids-choice-tile min-h-16 rounded-2xl border-2 px-4 py-4 text-lg font-bold transition active:translate-y-0.5 disabled:cursor-not-allowed';

  return (
    <section className="kids-learning-shell mx-auto max-w-3xl p-5 sm:p-8" aria-labelledby="kids-learning-title">
      <div className="kids-learning-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kids-learning-eyebrow">KHU VƯỜN TIẾNG ANH</p>
          <h1 id="kids-learning-title" className="mt-2 text-3xl font-black sm:text-4xl">Bé chơi mà học</h1>
          <p className="kids-learning-subtitle mt-2">Chọn lớp và trò chơi để luyện từ vựng thật vui.</p>
        </div>
        <KidsGardenScene />
        {onBack && <button type="button" onClick={onBack} className="kids-back-button min-h-11 rounded-xl border px-4 py-2 text-sm font-bold">
          ← Khu người lớn
        </button>}
      </div>

      <div className="kids-grade-picker mt-7" aria-label="Chọn lớp học">
        <span className="kids-label">Trình độ</span>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5, 6] as KidsGrade[]).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => changeGrade(value)}
              aria-pressed={grade === value}
              className={`kids-grade-button rounded-xl px-3 py-2 text-sm font-bold ${grade === value ? 'is-active' : ''}`}
            >
              Lớp {value}
            </button>
          ))}
        </div>
      </div>

      {!activity ? (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => start('listen')} className={`${tile} kids-activity-listen`}>
              <span className="kids-activity-icon" aria-hidden="true">🔊</span>
              <span>Nghe và đoán từ</span>
              <span className="kids-activity-description">Nghe phát âm rõ ràng rồi chọn từ bé nghe được.</span>
            </button>
            <button type="button" onClick={() => start('picture')} className={`${tile} kids-activity-picture`}>
              <span className="kids-activity-icon" aria-hidden="true">🖼️</span>
              <span>Nhìn hình đoán từ</span>
              <span className="kids-activity-description">Nhìn hình minh họa rồi chọn tên tiếng Anh.</span>
            </button>
          </div>
          <p className="kids-round-note mt-3">
            {gradeLabel} · Bộ từ hiện có {gradeWords.length} từ · Mỗi lượt 10 câu được xáo trộn.
          </p>
          <KidsGameHub
            grade={grade}
            words={gradeWords}
            wrongWords={progress.wrongWords}
            adventureStage={progress.adventureStage}
            onMistake={(word) => rememberMistake(word.word)}
            onCorrectWord={(word) => recordCorrectWord(word.word)}
            onClearMistake={(word) => updateProgress((current) => ({ ...current, wrongWords: current.wrongWords.filter((item) => item !== word.word) }))}
            onSetAdventureStage={(stage) => updateProgress((current) => ({ ...current, adventureStage: Math.min(5, Math.max(current.adventureStage, stage)) }))}
            onAward={awardBadge}
          />
          <KidsRewardShelf grade={grade} earnedBadges={progress.earnedBadges} />
        </>
      ) : finished ? (
        <div className="kids-result py-10 text-center">
          <span className="kids-result-icon" aria-hidden="true">🌟</span>
          <h2 className="mt-5 text-2xl font-black">Bé đã hoàn thành!</h2>
          <p className="mt-3 text-xl">Đúng {score}/{round.length} câu</p>
          <button type="button" onClick={() => start(activity)} className={`${tile} kids-new-round mt-7 border-0 text-white`}>Chơi lượt mới</button>
        </div>
      ) : question ? (
        <>
          <div className="kids-progress-row mt-7 flex justify-between text-sm font-bold">
            <span>Câu {index + 1}/{round.length}</span>
            <span>⭐ {score} điểm</span>
          </div>
          <progress className="kids-progress mt-2 h-3 w-full" value={index + (selected ? 1 : 0)} max={round.length} aria-label="Tiến độ lượt chơi" />

          {activity === 'picture' ? (
            <div className="kids-prompt my-8 text-center">
              <span role="img" aria-label={question.target.meaning} className="kids-picture text-8xl sm:text-9xl">{question.target.picture}</span>
              <h2 className="mt-4 text-xl font-black">Hình này là từ nào?</h2>
              <p className="kids-help mt-2">Chọn đáp án đúng bên dưới nhé.</p>
            </div>
          ) : (
            <div className="kids-prompt my-8 text-center">
              <button type="button" onClick={() => speak(question.target.word)} disabled={!canSpeak} className="kids-audio-button rounded-full px-8 py-5 text-xl font-black text-white">
                {isSpeaking ? '🔊 Đang đọc...' : '🔊 Bấm để nghe'}
              </button>
              <p className="kids-help mt-3">Bé có thể nghe lại nhiều lần.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option) => (
              <button
                type="button"
                key={option.word}
                disabled={Boolean(selected)}
                onClick={() => choose(option.word)}
                className={`${tile} ${selected && option.word === question.target.word ? 'kids-answer-correct' : selected === option.word ? 'kids-answer-wrong' : 'kids-answer'}`}
              >
                {option.word}{selected && option.word === question.target.word ? ' ✓' : selected === option.word ? ' ✕' : ''}
              </button>
            ))}
          </div>

          {selected && (
            <div className="kids-feedback mt-5 rounded-2xl p-4">
              <p className="font-bold">{selected === question.target.word ? 'Chính xác! Giỏi lắm!' : 'Mình cùng nhớ lại nhé!'}</p>
              <p className="mt-2">{question.target.picture} <strong>{question.target.word}</strong> nghĩa là {question.target.meaning.toLowerCase()}.</p>
              <button type="button" onClick={next} className="kids-next-button mt-4 min-h-12 rounded-xl px-5 py-3 font-bold text-white">
                {index === round.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo →'}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
