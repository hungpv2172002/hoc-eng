import React from 'react';

export type LearningAudience = 'adult' | 'kids';

export function LearningChoice({ onChoose, signedIn, onSignOut }: { onChoose: (value: LearningAudience) => void; signedIn: boolean; onSignOut?: () => void }) {
  return (
    <section className="mx-auto max-w-5xl py-6 sm:py-10" aria-labelledby="learning-choice-title">
      <div className="grid items-center gap-7 overflow-hidden rounded-[2rem] border border-indigo-100 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:grid-cols-[1.05fr_.95fr] sm:p-7">
        <div className="text-center sm:text-left">
          <span className="inline-flex rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200">Mỗi ngày một điều mới</span>
          <h1 id="learning-choice-title" className="mt-5 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">Hôm nay bạn muốn học gì?</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Chọn một khu học để bắt đầu. Bạn có thể quay lại đổi khu bất cứ lúc nào.</p>
        </div>
        <img src="/assets/learning-illustration.svg" alt="Minh họa học tiếng Anh với sách và thẻ từ vựng" className="mx-auto w-full max-w-md rounded-2xl border border-slate-100 bg-slate-50 object-cover dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose('adult')} className="rounded-3xl border-2 border-indigo-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 dark:border-indigo-800 dark:bg-slate-900">
          <span aria-hidden="true" className="text-6xl">📚</span><h2 className="mt-5 text-2xl font-black text-indigo-700 dark:text-indigo-300">Khu người lớn</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Luyện dịch theo trình độ, ngành nghề và đấu trường.</p><span className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Bắt đầu học</span>
        </button>
        <button type="button" onClick={() => onChoose('kids')} className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-7 text-left shadow-sm transition hover:-translate-y-1 dark:border-amber-800 dark:bg-slate-900">
          <span aria-hidden="true" className="text-6xl">🧸</span><h2 className="mt-5 text-2xl font-black text-amber-800 dark:text-amber-300">Khu trẻ em lớp 1–6</h2><p className="mt-3 text-slate-600 dark:text-slate-300">Luyện từ theo lớp qua hình ảnh, âm thanh và trò chơi ngắn.</p><span className="mt-5 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white">Mở khu trẻ em</span>
        </button>
      </div>
      {!signedIn && <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">Bạn có thể học ngay. Đăng nhập khi muốn lưu tiến độ và kết bạn.</p>}
      {signedIn && onSignOut && <button type="button" onClick={onSignOut} className="mx-auto mt-6 block min-h-11 px-4 text-sm font-semibold text-slate-600 underline dark:text-slate-300">Đăng xuất</button>}
    </section>
  );
}
