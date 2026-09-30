import React, { useEffect, useState, useRef } from 'react';
import { createKidsRound, KidsActivity, KidsWord } from '../lib/kidsLearning';

export function KidsLearning() {
  const [activity, setActivity] = useState<KidsActivity | null>(null);
  const [round, setRound] = useState(createKidsRound);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  useEffect(() => () => { audioRef.current?.pause(); if (canSpeak) window.speechSynthesis.cancel(); }, [canSpeak]);
  function fallbackSpeech(word: string) {
    if (!canSpeak) { setAudioError('Trình duyệt này chưa hỗ trợ phát âm. Bé hãy chọn trò nhìn hình nhé.'); return; }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = 'en-US'; speech.rate = 0.75;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('en'));
    if (voice) speech.voice = voice;
    speech.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) setAudioError('Chưa phát được âm thanh. Kiểm tra âm lượng, bấm nghe lại hoặc chuyển sang trò nhìn hình.'); };
    setAudioError(''); window.speechSynthesis.speak(speech);
  }
  function speak(word: string) {
    audioRef.current?.pause();
    if (canSpeak) window.speechSynthesis.cancel();
    setAudioError('');
    const recording = new Audio(`/api/kids-audio/${encodeURIComponent(word)}`);
    audioRef.current = recording;
    recording.play().catch(() => { if (audioRef.current === recording) fallbackSpeech(word); });
  }
  function start(mode: KidsActivity) {
    audioRef.current?.pause(); audioRef.current = null;
    if (canSpeak) window.speechSynthesis.cancel();
    setActivity(mode); setRound(createKidsRound()); setIndex(0); setSelected(null); setScore(0); setFinished(false); setAudioError('');
  }
  const question = round[index];
  function answer(option: KidsWord) {
    if (selected !== null) return;
    setSelected(option.word);
    if (option.word === question.target.word) setScore(value => value + 1);
  }
  function next() {
    if (!selected) return;
    audioRef.current?.pause(); audioRef.current = null;
    if (canSpeak) window.speechSynthesis.cancel();
    if (index === round.length - 1) setFinished(true);
    else { setIndex(value => value + 1); setSelected(null); setAudioError(''); }
  }
  const tile = 'min-h-16 rounded-2xl border-2 px-4 py-5 text-lg sm:text-xl font-bold shadow-sm focus-visible:outline-4 focus-visible:outline-indigo-400';
  return <section className="mx-auto max-w-3xl rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 sm:p-8 text-slate-800 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-700">KHU VƯỜN TIẾNG ANH 🌱</p><h1 className="mt-2 text-2xl sm:text-3xl font-black">Bé chơi mà học</h1></div>{activity && <button className="min-h-11 rounded-xl border px-4 text-sm font-bold" onClick={()=>{audioRef.current?.pause(); audioRef.current = null; if(canSpeak) window.speechSynthesis.cancel(); setActivity(null);}}>← Chọn trò chơi</button>}</div>
    {!activity ? <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <button onClick={()=>start('listen')} className={`${tile} border-violet-200 bg-violet-50 text-violet-900 disabled:opacity-50`}><span className="block text-5xl mb-4" aria-hidden="true">🎧</span>Nghe và đoán từ<span className="mt-3 block text-sm font-normal">Bấm nghe tiếng Anh, chọn từ bé nghe được.</span></button>
      <button onClick={()=>start('picture')} className={`${tile} border-orange-200 bg-orange-50 text-orange-900`}><span className="block text-5xl mb-4" aria-hidden="true">🎨</span>Nhìn hình đoán từ<span className="mt-3 block text-sm font-normal">Nhìn hình minh họa, chọn tên tiếng Anh.</span></button>
      <p className="sm:col-span-2 text-sm text-slate-600">Mỗi lượt 10 câu, không giới hạn thời gian.</p>
    </div> : finished ? <div className="py-8 text-center" aria-live="polite"><span className="text-7xl" aria-hidden="true">🌟</span><h2 className="mt-5 text-2xl font-black">Bé đã hoàn thành!</h2><p className="mt-3 text-xl">Đúng {score}/{round.length} câu — cùng luyện thêm nhé!</p><button onClick={()=>start(activity)} className={`${tile} mt-6 border-indigo-700 bg-indigo-600 text-white`}>Chơi lượt mới</button><div className="mt-7 flex flex-wrap justify-center gap-2">{round.map(q=><span key={q.target.word} className="rounded-xl bg-white px-3 py-2 text-sm">{q.target.picture} {q.target.word} · {q.target.meaning}</span>)}</div></div> : <>
      <div className="mt-6 flex justify-between text-sm font-bold"><span>Câu {index + 1}/{round.length}</span><span>⭐ {score} điểm</span></div><progress className="mt-2 h-3 w-full accent-indigo-600" value={index + (selected ? 1 : 0)} max={round.length} aria-label="Tiến độ lượt chơi" />
      <div className="my-6 min-h-40 flex flex-col items-center justify-center gap-3">
        {activity === 'picture' ? <><span role="img" aria-label={question.target.meaning} className="text-8xl sm:text-9xl">{question.target.picture}</span><h2 className="font-bold text-lg">Hình này là từ nào?</h2></> : <><button onClick={()=>speak(question.target.word)} className="rounded-full bg-violet-600 px-8 py-6 text-xl font-black text-white shadow-[0_5px_0_#5b21b6] active:translate-y-1">🔊 Bấm để nghe</button><p className="text-sm text-slate-500">Bé có thể nghe lại nhiều lần.</p></>}
        {audioError && <p role="alert" className="text-sm text-rose-700">{audioError}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">{question.options.map(option=><button key={option.word} disabled={selected !== null} onClick={()=>answer(option)} className={`${tile} ${selected && option.word === question.target.word ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : selected === option.word ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white'}`}>{option.word}{selected && option.word === question.target.word ? ' ✓' : selected === option.word ? ' ✕' : ''}</button>)}</div>
      {selected && <div aria-live="polite" className="mt-5 rounded-2xl bg-sky-50 p-4"><p className="font-bold">{selected === question.target.word ? 'Chính xác! Giỏi lắm! 🎉' : 'Chưa đúng rồi, mình cùng nhớ nhé 💛'}</p><p className="mt-2">{question.target.picture} <strong>{question.target.word}</strong> nghĩa là {question.target.meaning.toLowerCase()}.</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={next} className="min-h-12 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">{index === round.length-1 ? 'Xem kết quả' : 'Câu tiếp theo →'}</button><button onClick={()=>speak(question.target.word)} className="min-h-12 rounded-xl border px-4 font-bold disabled:opacity-50">🔊 Nghe phát âm</button></div></div>}
    </>}
    <p className="mt-6 text-center text-xs text-slate-500">Nguồn bản ghi phát âm: <a href="https://dictionaryapi.dev/" target="_blank" rel="noreferrer" className="underline">Free Dictionary API</a> · <a href={selected || finished ? `https://en.wiktionary.org/wiki/${question.target.word}` : 'https://en.wiktionary.org/'} target="_blank" rel="noreferrer" className="underline">Xem nguồn từ điển</a></p>
  </section>;
}
