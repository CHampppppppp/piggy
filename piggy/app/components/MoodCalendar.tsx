'use client';

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  differenceInCalendarDays
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Edit2 } from 'lucide-react';
import type { Mood } from '@/lib/types';
import { MOODS } from './MoodForm';
import { HeartSticker, PawSticker, ArrowSticker } from './KawaiiStickers';

// Define prop type
interface MoodCalendarProps {
  moods: Mood[];
  periodStatus: Record<string, 'actual' | 'predicted'>;
  onEditMood?: (mood: Mood) => void;
}

// 优化的日期格子组件 - 漫画风格
const DayCell = memo(({
  day,
  mood,
  periodType,
  isToday,
  onMoodClick,
  getMoodEmoji
}: {
  day: Date;
  mood: Mood | null;
  periodType: 'actual' | 'predicted' | null;
  isToday: boolean;
  onMoodClick: (mood: Mood) => void;
  getMoodEmoji: (moodValue: string) => string;
}) => {
  const isPeriod = Boolean(periodType);
  const isPredicted = periodType === 'predicted';

  return (
    <div className="aspect-square relative">
      <button
        onClick={() => mood && onMoodClick(mood)}
        disabled={!mood}
        className={`w-full h-full rounded-xl flex items-center justify-center text-lg transition-all duration-200 border-2
        ${mood
            ? 'bg-white border-black shadow-[2px_2px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer'
            : 'border-transparent'
          }
        ${!mood && isToday
            ? 'bg-[#ffd6e7] font-bold text-black border-black border-dashed'
            : !mood ? 'text-gray-400' : ''
          }
        ${isPeriod && !mood ? (isPredicted ? 'bg-[#fff4f8] border-pink-200 border-dashed' : 'bg-pink-50 border-pink-300 border-dashed') : ''}
        ${isPeriod && mood ? (isPredicted ? 'ring-2 ring-pink-200 ring-offset-1' : 'ring-2 ring-pink-400 ring-offset-1') : ''}
      `}
      >
        {mood ? (
          <span className="text-2xl kawaii-hover">
            {getMoodEmoji(mood.mood)}
          </span>
        ) : (
          <span className={`text-sm font-bold ${isPeriod ? (isPredicted ? 'text-pink-300' : 'text-pink-500') : ''}`}>
            {format(day, 'd')}
          </span>
        )}
      </button>
      {/* 经期标记 */}
      {isPeriod && (
        <span
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${isPredicted ? 'bg-pink-200' : 'bg-pink-400'
            }`}
        />
      )}

      {/* 今天指示箭头 - 漫画风格 */}
      {isToday && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none filter drop-shadow-sm">
          <ArrowSticker size={32} className="text-pink-500" />
        </div>
      )}
    </div>
  );
});

DayCell.displayName = 'DayCell';

function MoodCalendar({ moods, periodStatus, onEditMood }: MoodCalendarProps) {
  // 使用函数初始化，确保只在客户端执行，避免 SSR 和客户端时区不一致
  // 服务端渲染时返回 null，客户端 hydration 时使用客户端时区的当前日期
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  // 在客户端挂载后设置当前月份（使用客户端时区）
  useEffect(() => {
    if (currentMonth === null) {
      setCurrentMonth(new Date());
    }
  }, [currentMonth]);

  /**
   * 获取当月所有天数
   * 
   * 使用 useMemo 缓存计算结果，避免每次渲染都重新计算
   * 
   * 返回：
   * - daysInMonth: 当月的所有日期对象数组
   * - emptyDays: 月初需要填充的空位数量（用于对齐星期）
   */
  const { daysInMonth, emptyDays } = useMemo(() => {
    // 如果 currentMonth 还未初始化（SSR 阶段），返回空数组
    if (!currentMonth) {
      return { daysInMonth: [], emptyDays: [] };
    }

    const start = startOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end: endOfMonth(currentMonth) });
    const startDay = getDay(start); // 获取当月第一天是星期几（0=周日，6=周六）
    const empty = Array.from({ length: startDay }); // 生成空位数组，用于对齐日历网格

    return {
      daysInMonth: days,
      emptyDays: empty
    };
  }, [currentMonth]);

  /**
   * 查找特定日期的心情记录
   * 
   * 使用 useMemo 缓存心情映射表，避免每次渲染都重新构建
   * 
   * 日期匹配逻辑：
   * 1. 优先使用 mood.date_key（如果存在，这是前端保存时生成的，基于用户本地时区）
   * 2. 如果没有 date_key，则从 created_at 解析日期
   * 3. 将日期格式化为 YYYY-MM-DD 格式进行比较
   * 
   * 注意：使用 Map 存储映射关系，查找效率 O(1)
   */
  const getMoodForDay = useMemo(() => {
    // 构建日期到心情的映射表
    const moodMap = new Map<string, Mood>();
    moods.forEach(m => {
      // 优先使用前端传入并保存的 date_key（基于用户本地时区计算的"哪一天"）
      // 这样可以避免时区问题导致日期判断错误
      const dateKey =
        (m as any).date_key ||
        new Date(m.created_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '-');
      // 如果同一天有多条记录，只保留第一条（避免重复）
      if (!moodMap.has(dateKey)) {
        moodMap.set(dateKey, m);
      }
    });

    // 返回查找函数
    return (day: Date) => {
      const dateKey = day.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      return moodMap.get(dateKey) || null;
    };
  }, [moods]);

  /**
   * 获取某天的经期类型
   * 
   * 使用 useCallback 缓存函数，避免每次渲染都创建新函数
   * 
   * @param day - 要查询的日期
   * @returns 'actual'（实际记录）、'predicted'（预测）或 null（非经期）
   */
  const getPeriodType = useCallback((day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return periodStatus[dateKey] ?? null;
  }, [periodStatus]);

  const handlePrevMonth = () => {
    if (currentMonth) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };
  const handleNextMonth = () => {
    if (currentMonth) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const getMoodEmoji = (moodValue: string) => {
    const mood = MOODS.find(m => m.value === moodValue);
    return mood ? mood.emoji : '😐';
  };

  const getMoodLabel = (moodValue: string) => {
    const mood = MOODS.find(m => m.value === moodValue);
    return mood ? mood.label : '';
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header - 漫画风格 */}
      <div className="flex justify-between items-center mb-3 px-2 shrink-0">
        <button
          onClick={handlePrevMonth}
          className="cursor-pointer p-2 rounded-full border-3 border-black bg-white hover:bg-[#ffd6e7] transition-all shadow-[2px_2px_0_#1a1a1a] hover:shadow-[3px_3px_0_#1a1a1a] kawaii-hover"
        >
          <ChevronLeft size={20} strokeWidth={3} className="text-black" />
        </button>
        <h2 className="text-xl font-bold manga-text-thin px-4 py-1 bg-[#ffd6e7] rounded-full border-3 border-black shadow-[3px_3px_0_#1a1a1a]">
          {currentMonth ? format(currentMonth, 'yyyy年 M月', { locale: zhCN }) : '加载中...'}
        </h2>
        <button
          onClick={handleNextMonth}
          className="cursor-pointer p-2 rounded-full border-3 border-black bg-white hover:bg-[#ffd6e7] transition-all shadow-[2px_2px_0_#1a1a1a] hover:shadow-[3px_3px_0_#1a1a1a] kawaii-hover"
        >
          <ChevronRight size={20} strokeWidth={3} className="text-black" />
        </button>
      </div>

      {/* Days of Week - 漫画风格 */}
      <div className="grid grid-cols-7 gap-1 mb-2 px-2 shrink-0">
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-bold py-1 ${index === 0 || index === 6 ? 'text-pink-500' : 'text-black'
              }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-2 mb-1 text-[10px] font-bold text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-pink-400 border-2 border-black rounded-full" />
          <span>已记录经期</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-pink-200 border-2 border-black rounded-full" />
          <span>预测经期</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 p-2 flex-1 content-start">
        {/* 上个月的空位 */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 日期 */}
        {daysInMonth.map((day) => {
          const mood = getMoodForDay(day);
          const periodType = getPeriodType(day);
          // 只在客户端有 currentMonth 时才判断今天，避免 SSR 时区问题
          const isToday = currentMonth ? isSameDay(day, new Date()) : false;

          return (
            <DayCell
              key={day.toString()}
              day={day}
              mood={mood}
              periodType={periodType}
              isToday={isToday}
              onMoodClick={setSelectedMood}
              getMoodEmoji={getMoodEmoji}
            />
          );
        })}
      </div>

      {/* Detail Modal - 漫画风格 */}
      {selectedMood && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => setSelectedMood(null)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-3xl p-6 border-4 border-black shadow-[8px_8px_0_#1a1a1a] animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-500 font-bold mb-1">
                  {format(new Date(selectedMood.created_at), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-4xl kawaii-hover">{getMoodEmoji(selectedMood.mood)}</span>
                  <h3 className="text-2xl font-bold manga-text-thin">
                    {getMoodLabel(selectedMood.mood)}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onEditMood && differenceInCalendarDays(new Date(), new Date(selectedMood.created_at)) <= 3 && (
                  <button
                    onClick={() => {
                      onEditMood(selectedMood);
                      setSelectedMood(null);
                    }}
                    className="cursor-pointer p-2 rounded-full border-3 border-black bg-[#ffd6e7] hover:bg-pink-200 transition-colors kawaii-hover"
                  >
                    <Edit2 size={18} strokeWidth={2.5} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMood(null)}
                  className="cursor-pointer p-2 rounded-full border-3 border-black bg-white hover:bg-gray-100 transition-colors kawaii-hover"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* 情绪强度 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <PawSticker size={20} />
                <span className="text-xs font-bold uppercase tracking-wider text-black">情绪强度</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 h-3 rounded-full border-2 border-black transition-colors ${level <= selectedMood.intensity
                      ? 'bg-[#ffd6e7]'
                      : 'bg-gray-100'
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* 笔记 */}
            {selectedMood.note ? (
              <div className="bg-[#ffd6e7] p-4 rounded-2xl border-3 border-black relative">
                <div className="absolute -top-3 left-4">
                  <HeartSticker size={24} />
                </div>
                <p className="text-black text-sm leading-relaxed font-medium pt-2">
                  &ldquo;{selectedMood.note}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic text-center font-medium">
                没有写下笔记哦 ~
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MoodCalendar);
