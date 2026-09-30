import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CareerTrackInfo, Question } from '../types';

export function QuestionEditor({ tracks, onAdded }: { tracks: CareerTrackInfo[]; onAdded?: (question: Question) => void }) {
  const [vi, setVi] = useState('');
  const [answers, setAnswers] = useState('');
  const [hints, setHints] = useState('');
  const [category, setCategory] = useState('general');
  const [level, setLevel] = useState<Question['level']>('A1');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const accepted = [...new Set(answers.split('\n').map(s => s.trim()).filter(Boolean))];
    if (!vi.trim() || !accepted.length || !tracks.some(t => t.id === category)) { setMessage('Vui lòng nhập câu tiếng Việt, đáp án và chọn ngành hợp lệ.'); return; }
    setBusy(true); setMessage('');
    try {
      const id = Date.now() * 1000 + crypto.getRandomValues(new Uint32Array(1))[0] % 1000;
      const { data, error } = await supabase.from('questions').insert({ id, vi: vi.trim(), answers: accepted, hints: hints.trim(), category, level }).select('*').single();
      if (error) throw error;
      onAdded?.(data as Question);
      setVi(''); setAnswers(''); setHints(''); setMessage('Đã lưu câu hỏi. Câu mới đã có trong phần luyện tập.');
    } catch { setMessage('Không lưu được câu hỏi. Kiểm tra kết nối và quyền quản trị rồi thử lại.'); }
    finally { setBusy(false); }
  }
  const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5';
  return <section className="rounded-3xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 p-5 sm:p-7">
    <h2 className="text-xl font-black">Thêm câu luyện dịch</h2>
    <p className="mt-1 mb-5 text-sm text-slate-500">Nhập câu hỏi của bạn, chọn ngành và trình độ. Mỗi dòng đáp án là một cách dịch được chấp nhận.</p>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label>Ngành chuyên sâu<select className={input} value={category} onChange={e=>setCategory(e.target.value)}>{tracks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Trình độ<select className={input} value={level} onChange={e=>setLevel(e.target.value as Question['level'])}>{['A1','A2','B1','B2','C1'].map(l=><option key={l}>{l}</option>)}</select></label>
      <label className="sm:col-span-2">Câu tiếng Việt<textarea required maxLength={2000} className={input} value={vi} onChange={e=>setVi(e.target.value)} /></label>
      <label className="sm:col-span-2">Đáp án tiếng Anh (mỗi dòng một đáp án)<textarea required maxLength={10000} rows={3} className={input} value={answers} onChange={e=>setAnswers(e.target.value)} /></label>
      <label className="sm:col-span-2">Gợi ý từ vựng<textarea maxLength={2000} className={input} value={hints} onChange={e=>setHints(e.target.value)} /></label>
      <div className="sm:col-span-2"><button disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu câu hỏi'}</button><p role="status" className="mt-3 text-sm">{message}</p></div>
    </form>
  </section>;
}
