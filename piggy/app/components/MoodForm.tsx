'use client';

import { useState, useCallback, memo } from 'react';
import { saveMood, type Mood } from '@/lib/actions';
import { useToast } from './ToastProvider';
import { Droplet } from 'lucide-react';

export const MOODS = [
  { label: '开心', emoji: '😊', value: 'happy' },
  { label: '幸福', emoji: '🥰', value: 'blissful' },
  { label: '累', emoji: '😴', value: 'tired' },
  { label: '烦躁', emoji: '😫', value: 'annoyed' },
  { label: '生气', emoji: '😠', value: 'angry' },
  { label: '沮丧', emoji: '😔', value: 'depressed' },
];

// 优化的心情按钮组件
const MoodButton = memo(({
  mood,
  isSelected,
  onClick
}: {
  mood: typeof MOODS[0];
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`cursor-pointer flex flex-col items-center p-2 rounded-2xl border-2 transition-all duration-200 ${isSelected
      ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-400 scale-105 shadow-lg'
      : 'bg-gradient-to-br from-gray-50 to-white border-transparent hover:from-pink-50 hover:to-purple-50 hover:border-pink-200'
      }`}
  >
    <span className="text-3xl mb-1 filter drop-shadow-sm">{mood.emoji}</span>
    <span className={`text-sm font-medium ${isSelected ? 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent' : 'text-gray-500'}`}>
      {mood.label}
    </span>
  </button>
));

MoodButton.displayName = 'MoodButton';

// 优化的强度按钮组件
const IntensityButton = memo(({
  isSelected,
  onClick,
  label
}: {
  isSelected: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`cursor-pointer flex-1 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 ${isSelected
      ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 shadow-md ring-2 ring-pink-200/50'
      : 'text-gray-400 hover:text-gray-600'
      }`}
  >
    {label}
  </button>
));

IntensityButton.displayName = 'IntensityButton';

function MoodForm({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: Mood | null }) {
  const [selectedMood, setSelectedMood] = useState(initialData?.mood || '');
  const [intensity, setIntensity] = useState(initialData?.intensity || 1);
  const [isPeriodStart, setIsPeriodStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = useCallback(async (formData: FormData) => {
    if (!selectedMood) {
      showToast('先选一个心情嘛，想抱抱你～ 💕', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMood(formData);
      // Reset form state if not editing, or handle success
      if (!initialData) {
        setSelectedMood('');
        setIntensity(1);
        setIsPeriodStart(false);
        showToast('记录好啦，我会一直陪着你 💖', 'success');
      } else {
        showToast('修改好啦，爱你哦 💖', 'success');
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      showToast('哎呀出错啦，再试一次好不好～', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, selectedMood, showToast, initialData]);

  return (
    <form action={handleSubmit} className="space-y-4 w-full mx-auto">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <div>
        <label className="block text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2 text-center">
          {initialData ? '修改当时的心情' : '今天心情怎么样呀？Piggy~'}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map((m) => (
            <MoodButton
              key={m.value}
              mood={m}
              isSelected={selectedMood === m.value}
              onClick={() => setSelectedMood(m.value)}
            />
          ))}
        </div>
        <input type="hidden" name="mood" value={selectedMood} />
      </div>

      {selectedMood && (
        <div className="animate-fade-in space-y-3">
          <div>
            <label className="block text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 ml-1">
              强烈程度
            </label>
            <div className="flex justify-between bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-1.5 rounded-2xl border border-pink-200/30">
              {[1, 2, 3].map((level) => (
                <IntensityButton
                  key={level}
                  isSelected={intensity === level}
                  onClick={() => setIntensity(level)}
                  label={level === 1 ? '一点点' : level === 2 ? '中度' : '超级'}
                />
              ))}
            </div>
            <input type="hidden" name="intensity" value={intensity} />
          </div>

          <div>
            <label className="block text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 ml-1">
              想说点什么吗？
            </label>
            <textarea
              name="note"
              rows={3}
              defaultValue={initialData?.note || ''}
              className="w-full p-3 bg-gradient-to-br from-pink-50/30 to-purple-50/30 border-2 border-pink-200/30 rounded-2xl focus:bg-white focus:border-pink-400 outline-none transition-all resize-none text-gray-700 placeholder-gray-400 text-sm"
              placeholder="记录一下今天发生的小事..."
            />
          </div>

          {!initialData && (
            <div className="px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="is_period_start"
                    checked={isPeriodStart}
                    onChange={(e) => setIsPeriodStart(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-pink-300 rounded-md checked:bg-rose-400 checked:border-rose-400 transition-colors cursor-pointer"
                  />
                  <Droplet
                    size={12}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                    fill="currentColor"
                  />
                </div>
                <span className="text-sm font-bold text-gray-600 group-hover:text-rose-500 transition-colors flex items-center gap-1">
                  <Droplet size={16} className="text-rose-400" fill="currentColor" />
                  <span>来经期了</span>
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedMood || isSubmitting}
        className="cursor-pointer w-full py-3 px-4 bg-gradient-to-r from-pink-400 via-pink-500 to-purple-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-pink-300/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? '保存中...' : (initialData ? '保存修改 ❤️' : '确认记录 ❤️')}
      </button>
    </form>
  );
}

export default memo(MoodForm);
