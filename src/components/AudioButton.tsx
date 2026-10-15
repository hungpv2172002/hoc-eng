import React, { useState } from 'react';
import { Volume2, VolumeX, Gauge } from 'lucide-react';
import { speakText } from '../lib/speech';
import { SpeechVoiceSelector } from './SpeechVoiceSelector';

interface AudioButtonProps {
  text: string;
  speed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpeedSelector?: boolean;
}

export const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75x', desc: 'Chậm & Rõ từng âm' },
  { value: 0.9, label: '0.9x', desc: 'Tự nhiên vừa phải' },
  { value: 1.0, label: '1.0x', desc: 'Tốc độ chuẩn' },
  { value: 1.25, label: '1.25x', desc: 'Nói nhanh bản xứ' },
];

export function playSpeech(text: string, rate: number = 0.9, onEnd?: () => void, lang: string = 'en-US') {
  speakText(text, { lang, rate, pitch: 1, onEnd });
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  speed,
  onSpeedChange,
  className = '',
  size = 'md',
  showSpeedSelector = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const handlePlay = (customSpeed?: number) => {
    const playRate = customSpeed ?? speed;
    setIsPlaying(true);
    playSpeech(text, playRate, () => {
      setIsPlaying(false);
    });
  };

  const buttonSizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Nút Loa chính */}
      <button
        type="button"
        onClick={() => handlePlay()}
        title={`Nghe phát âm chuẩn tiếng Anh (${speed}x)`}
        className={`${buttonSizeClasses} bg-white hover:bg-indigo-50 active:scale-95 text-indigo-600 hover:text-indigo-700 border border-slate-200/90 hover:border-indigo-300 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 font-semibold cursor-pointer select-none`}
      >
        <Volume2 className={`${iconSizes} ${isPlaying ? 'animate-pulse text-indigo-700' : ''}`} />
        <span className="text-[11px] font-bold text-slate-500 hover:text-indigo-600">
          {speed}x
        </span>
      </button>

      {/* Menu hoặc Pills lựa chọn tốc độ */}
      {showSpeedSelector && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            title="Tùy chỉnh tốc độ nghe (0.75x - 1.25x)"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg text-xs font-semibold transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5" />
          </button>

          {showSpeedMenu && (
            <>
              {/* Overlay backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSpeedMenu(false)}
              />

              {/* Popup chỉnh tốc độ */}
              <div className="absolute right-0 bottom-full mb-2 z-50 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Tốc độ đọc</span>
                  <span className="text-indigo-600 font-bold">{speed}x</span>
                </div>
                {SPEED_OPTIONS.map((opt) => {
                  const isCurrent = opt.value === speed;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onSpeedChange(opt.value);
                        setShowSpeedMenu(false);
                        handlePlay(opt.value);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer text-xs ${
                        isCurrent
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[85px]">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-100 pt-2">
                  <SpeechVoiceSelector />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
