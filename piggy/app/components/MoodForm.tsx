'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { saveMood } from '@/lib/actions';
import type { Mood } from '@/lib/types';
import { useToast } from './ToastProvider';
import { Droplet } from 'lucide-react';
import { HeartSticker, PawSticker } from './KawaiiStickers';

export const MOODS = [
  { label: '开心', emoji: '😊', value: 'happy', image: '/images/happy.webp' },
  { label: '幸福', emoji: '🥰', value: 'blissful', image: '/images/happiness.webp' },
  { label: '累', emoji: '😴', value: 'tired', image: '/images/tired.webp' },
  { label: '烦躁', emoji: '😫', value: 'annoyed', image: '/images/annoy.webp' },
  { label: '生气', emoji: '😠', value: 'angry', image: '/images/angry.webp' },
  { label: '沮丧', emoji: '😔', value: 'depressed', image: '/images/sad.webp' },
] as const;

// 优化的心情按钮组件 - 漫画风格，更紧凑
const MoodButton = memo(({
  mood,
  isSelected,
  onClick
}: {
  mood: (typeof MOODS)[number];
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`cursor-pointer flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-200 kawaii-hover ${isSelected
      ? 'bg-[#ffd6e7] border-black shadow-[3px_3px_0_#1a1a1a] -translate-x-0.5 -translate-y-0.5'
      : 'bg-white border-gray-200 hover:border-black hover:shadow-[2px_2px_0_#1a1a1a]'
      }`}
  >
    <div className="relative w-14 h-14 flex items-center justify-center mb-1 overflow-hidden rounded-xl border-2 border-white shadow-[2px_2px_0_#1a1a1a]">
      <Image
        src={mood.image}
        alt={`${mood.label}情绪图片`}
        fill
        sizes="56px"
        className="object-cover"
        priority={false}
        loading="lazy"
      />
    </div>
    <span className={`text-xs font-bold ${isSelected ? 'text-black' : 'text-gray-500'}`}>
      {mood.label}
    </span>
  </button>
));

MoodButton.displayName = 'MoodButton';

// 优化的强度按钮组件 - 漫画风格，更紧凑
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
    className={`cursor-pointer flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 ${isSelected
      ? 'bg-[#ffd6e7] border-black text-black shadow-[2px_2px_0_#1a1a1a]'
      : 'bg-white border-gray-200 text-gray-400 hover:border-black'
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

  // 使用浏览器本地时间生成今天的日期 key，避免受服务端 / 数据库时区影响
  const todayKey = new Date()
    .toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
    .replace(/\//g, '-'); // 例如 2025-11-27

  const handleSubmit = useCallback(async (formData: FormData) => {
    if (!selectedMood) {
      showToast('先选一个心情嘛～ 💕', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMood(formData);
      if (!initialData) {
        setSelectedMood('');
        setIntensity(1);
        setIsPeriodStart(false);
        showToast('记录好啦！💖', 'success');
      } else {
        showToast('修改好啦！💖', 'success');
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      showToast('哎呀出错啦，再试一次～', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, selectedMood, showToast, initialData]);

  return (
    <form action={handleSubmit} className="space-y-3 w-full mx-auto">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      {!initialData && <input type="hidden" name="date_key" value={todayKey} />}

      <div>
        <label className="flex items-center justify-center gap-2 text-sm font-bold text-black mb-2">
          <PawSticker size={18} />
          <span className="manga-text-thin">
            {initialData ? '修改当时的心情' : '今天心情怎么样呀？'}
          </span>
          <PawSticker size={18} />
        </label>
        <div className="grid grid-cols-3 gap-1.5">
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
        <div className="animate-fade-in space-y-2.5">
          {/* 强烈程度 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-black mb-1.5 ml-1">
              <HeartSticker size={14} />
              强烈程度
            </label>
            <div className="flex gap-1.5 bg-gray-50 p-1.5 rounded-xl border-2 border-gray-200">
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

          {/* 笔记 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-black mb-1.5 ml-1">
              <HeartSticker size={14} />
              想说点什么吗？
            </label>
            <textarea
              name="note"
              rows={4}
              defaultValue={initialData?.note || ''}
              className="input-manga w-full rounded-xl resize-none text-gray-700 placeholder-gray-400 text-xs py-2 px-3 scrollbar-cute min-h-[140px]"
              placeholder="记录一下今天发生的小事..."
            />
          </div>

          {/* 经期标记 */}
          {!initialData && (
            <div className="px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    name="is_period_start"
                    checked={isPeriodStart}
                    onChange={(e) => setIsPeriodStart(e.target.checked)}
                    className="checkbox-kawaii rounded-md w-5 h-5"
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-pink-500 transition-colors flex items-center gap-1.5">
                  <Droplet size={14} className="text-pink-400" fill="currentColor" />
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
        className={`w-full py-2.5 px-4 font-bold text-sm rounded-xl transition-all ${!selectedMood || isSubmitting
          ? 'bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed'
          : 'bg-[#ffd6e7] text-black border-2 border-black shadow-[3px_3px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#1a1a1a]'
          }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">🐱</span>
            保存中...
          </span>
        ) : (
          <span>{initialData ? '保存修改 ♡' : '确认记录 ♡'}</span>
        )}
      </button>
    </form>
  );
}

export default memo(MoodForm);
