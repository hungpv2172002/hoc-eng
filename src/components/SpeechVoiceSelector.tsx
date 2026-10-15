import React, { useEffect, useState } from 'react';
import { AudioLines, Play } from 'lucide-react';
import {
  getAvailableEnglishVoices,
  getPreferredSpeechVoiceId,
  getSpeechVoiceId,
  setPreferredSpeechVoiceId,
  speakText,
  subscribeToSpeechVoices,
} from '../lib/speech';

interface SpeechVoiceSelectorProps {
  compact?: boolean;
}

export function SpeechVoiceSelector({ compact = false }: SpeechVoiceSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(() => getPreferredSpeechVoiceId());

  useEffect(() => {
    const refresh = () => setVoices(getAvailableEnglishVoices());
    refresh();
    return subscribeToSpeechVoices(refresh);
  }, []);

  const preview = () => speakText('Hello! This is a clear English voice.', { rate: 0.9, pitch: 1.04 });

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'w-full'}`}>
      {!compact && <span className="text-xs font-semibold text-slate-600">Giọng đọc</span>}
      {compact && <span className="text-xs font-semibold text-slate-600">Giọng:</span>}
      <select
        aria-label="Chọn giọng đọc tiếng Anh"
        title="Chọn giọng đọc tiếng Anh trên thiết bị này"
        value={selectedVoiceId || 'auto'}
        onChange={(event) => {
          const next = event.target.value === 'auto' ? null : event.target.value;
          setSelectedVoiceId(next);
          setPreferredSpeechVoiceId(next);
        }}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
      >
        <option value="auto">Giọng phù hợp nhất</option>
        {voices.map((voice) => (
          <option key={getSpeechVoiceId(voice)} value={getSpeechVoiceId(voice)}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={preview}
        title="Nghe thử giọng đang chọn"
        aria-label="Nghe thử giọng đang chọn"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 hover:bg-indigo-50"
      >
        {compact ? <AudioLines size={16} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}
