import React from 'react';
export type LearningAudience = 'adult' | 'kids';
export function LearningChoice({ onChoose, onSignOut, signedIn }: { onChoose: (value: LearningAudience) => void; onSignOut: () => void; signedIn: boolean }) {
  return <section className="mx-auto max-w-3xl py-6 sm:py-12 text-center" aria-labelledby="learning-choice-title">
    <span className="inline-block rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700">Mỗi ngày một điều mới ✨</span>
    <h1 id="learning-choice-title" className="mt-5 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">Hôm nay bạn muốn học gì?</h1>
    <p className="mt-3 text-slate-600 dark:text-slate-300">Chọn một khu vực để bắt đầu. Bạn có thể đổi lựa chọn bất cứ lúc nào.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <button onClick={()=>onChoose('adult')} className="rounded-3xl border-2 border-indigo-200 bg-white dark:bg-slate-900 p-7 text-left shadow-[0_6px_0_#c7d2fe] active:translate-y-1 focus-visible:outline-4 focus-visible:outline-indigo-500">
        <span aria-hidden="true" className="text-6xl">📚</span><h2 className="mt-5 text-2xl font-black text-indigo-700 dark:text-indigo-300">Học cho người lớn</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Luyện dịch, học theo ngành nghề và thi đấu cùng bạn bè.</p><span className="mt-5 inline-block font-bold text-indigo-600">Vào học →</span>
      </button>
      <button onClick={()=>onChoose('kids')} className="rounded-3xl border-2 border-amber-200 bg-amber-50 dark:bg-slate-900 p-7 text-left shadow-[0_6px_0_#fde68a] active:translate-y-1 focus-visible:outline-4 focus-visible:outline-amber-500">
        <span aria-hidden="true" className="text-6xl">🧸</span><h2 className="mt-5 text-2xl font-black text-amber-800 dark:text-amber-300">Học cho trẻ em</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Khám phá từ vựng qua âm thanh và hình minh họa vui nhộn.</p><span className="mt-5 inline-block font-bold text-amber-800 dark:text-amber-300">Chơi và học →</span>
      </button>
    </div>
    {signedIn && <button onClick={onSignOut} className="mt-8 min-h-11 px-4 text-sm underline">Đăng xuất</button>}
  </section>;
}
