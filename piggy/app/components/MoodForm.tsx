'use client';

import { useState } from 'react';
import { saveMood } from '@/lib/actions';

export const MOODS = [
  { label: '开心', emoji: '😊', value: 'happy' },
  { label: '幸福', emoji: '🥰', value: 'blissful' },
  { label: '累', emoji: '😴', value: 'tired' },
  { label: '烦躁', emoji: '😫', value: 'annoyed' },
  { label: '生气', emoji: '😠', value: 'angry' },
  { label: '沮丧', emoji: '😔', value: 'depressed' },
];

export default function MoodForm({ onSuccess }: { onSuccess?: () => void }) {
  const [selectedMood, setSelectedMood] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
      setIsSubmitting(true);
      await saveMood(formData);
      setIsSubmitting(false);
      // Reset form state
      setSelectedMood('');
      setIntensity(0);
      if (onSuccess) onSuccess();
  };

  return (
    <form action={handleSubmit} className="space-y-6 w-full mx-auto">
      <div>
        <label className="block text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center">今天心情怎么样呀？Piggy~</label>
        <div className="grid grid-cols-3 gap-3">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setSelectedMood(m.value)}
              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200 ${
                selectedMood === m.value
                  ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-400 scale-105 shadow-lg'
                  : 'bg-gradient-to-br from-gray-50 to-white border-transparent hover:from-pink-50 hover:to-purple-50 hover:border-pink-200'
              }`}
            >
              <span className="text-4xl mb-2 filter drop-shadow-sm">{m.emoji}</span>
              <span className={`text-sm font-medium ${selectedMood === m.value ? 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent' : 'text-gray-500'}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="mood" value={selectedMood} />
      </div>

      {selectedMood && (
        <div className="animate-fade-in space-y-4">
          <div>
            <label className="block text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3 ml-1">
                强烈程度
            </label>
            <div className="flex justify-between bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-2 rounded-2xl border border-pink-200/30">
                {[0, 1, 2, 3].map((level) => (
                <button
                    key={level}
                    type="button"
                    onClick={() => setIntensity(level)}
                    className={`flex-1 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                    intensity === level
                        ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 shadow-md ring-2 ring-pink-200/50'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    {level === 0 ? '一点点' : level === 3 ? '超级' : level}
                </button>
                ))}
            </div>
            <input type="hidden" name="intensity" value={intensity} />
          </div>

          <div>
            <label className="block text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2 ml-1">
              想说点什么吗？
            </label>
            <textarea
              name="note"
              rows={3}
              className="w-full p-4 bg-gradient-to-br from-pink-50/30 to-purple-50/30 border-2 border-pink-200/30 rounded-2xl focus:bg-white focus:border-pink-400 outline-none transition-all resize-none text-gray-700 placeholder-gray-400"
              placeholder="记录一下今天发生的小事..."
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedMood || isSubmitting}
        className="w-full py-4 px-4 bg-gradient-to-r from-pink-400 via-pink-500 to-purple-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-pink-300/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? '记录中...' : '确认记录 ❤️'}
      </button>
    </form>
  );
}

