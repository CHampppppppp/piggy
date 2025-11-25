'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  addDays,
  isWithinInterval,
  differenceInCalendarDays
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Edit2 } from 'lucide-react';
import { Mood, Period } from '@/lib/actions';
import { MOODS } from './MoodForm';

// Define prop type
interface MoodCalendarProps {
  moods: Mood[];
  periods: Period[];
  onEditMood?: (mood: Mood) => void;
}

// 优化的日期格子组件
const DayCell = memo(({
  day,
  mood,
  isPeriod,
  isToday,
  onMoodClick,
  getMoodEmoji
}: {
  day: Date;
  mood: Mood | null;
  isPeriod: boolean;
  isToday: boolean;
  onMoodClick: (mood: Mood) => void;
  getMoodEmoji: (moodValue: string) => string;
}) => (
  <div className="aspect-square relative">
    <button
      onClick={() => mood && onMoodClick(mood)}
      disabled={!mood}
      className={`w-full h-full rounded-xl flex items-center justify-center text-lg transition-all duration-200
        ${mood
          ? 'bg-gradient-to-br from-white to-pink-50/30 hover:from-pink-50 hover:to-purple-50 hover:scale-105 cursor-pointer shadow-md border border-pink-200/50'
          : 'text-gray-300 cursor-default'
        }
        ${!mood && isToday ? 'bg-gradient-to-br from-pink-50 to-purple-50 font-bold text-pink-500 ring-2 ring-pink-300 ring-inset shadow-inner' : ''}
        ${isPeriod ? 'ring-2 ring-rose-300 bg-rose-50/50' : ''}
      `}
    >
      {mood ? (
        <span className="text-2xl filter drop-shadow-sm transform hover:scale-110 transition-transform" style={{ color: 'inherit' }}>
          {getMoodEmoji(mood.mood)}
        </span>
      ) : (
        <span className={`text-sm ${isPeriod ? 'text-rose-400 font-medium' : ''}`}>{format(day, 'd')}</span>
      )}
    </button>
    {isPeriod && (
      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-400 rounded-full" />
    )}
    {mood && mood.intensity >= 2 && (
      <span className="absolute bottom-1 right-1 w-2 h-2 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full border border-white shadow-sm" />
    )}
  </div>
));

DayCell.displayName = 'DayCell';

function MoodCalendar({ moods, periods, onEditMood }: MoodCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  // Get all days in current month - memoized
  const { daysInMonth, emptyDays } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end: endOfMonth(currentMonth) });
    const startDay = getDay(start);
    const empty = Array.from({ length: startDay });

    return {
      daysInMonth: days,
      emptyDays: empty
    };
  }, [currentMonth]);

  // Helper to find mood for a specific day - memoized
  const getMoodForDay = useMemo(() => {
    // 创建日期到情绪的映射表，提高查找效率
    const moodMap = new Map<string, Mood>();
    moods.forEach(m => {
      const dateKey = format(new Date(m.created_at), 'yyyy-MM-dd');
      if (!moodMap.has(dateKey)) {
        moodMap.set(dateKey, m);
      }
    });

    return (day: Date) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return moodMap.get(dateKey) || null;
    };
  }, [moods]);

  // Check if a day is within a period
  const isPeriodDay = useCallback((day: Date) => {
    return periods.some(period => {
      const startDate = new Date(period.start_date);
      // Normalize to start of day to avoid time issues
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = addDays(start, 6); // 6 days after start = 7 days total

      return isWithinInterval(day, { start, end });
    });
  }, [periods]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-2 shrink-0">
        <button onClick={handlePrevMonth} className="cursor-pointer p-2 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent transition-all shadow-sm">
          <ChevronLeft size={20} className="text-pink-500" />
        </button>
        <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </h2>
        <button onClick={handleNextMonth} className="cursor-pointer p-2 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent transition-all shadow-sm">
          <ChevronRight size={20} className="text-pink-500" />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-1 px-2 shrink-0">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-xs font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 p-2 flex-1 overflow-y-auto content-start">
        {/* Empty slots for previous month */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Days */}
        {daysInMonth.map((day) => {
          const mood = getMoodForDay(day);
          const isPeriod = isPeriodDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <DayCell
              key={day.toString()}
              day={day}
              mood={mood}
              isPeriod={isPeriod}
              isToday={isToday}
              onMoodClick={setSelectedMood}
              getMoodEmoji={getMoodEmoji}
            />
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedMood && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={() => setSelectedMood(null)}
        >
          <div
            className="bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 w-full max-w-xs rounded-3xl shadow-2xl p-6 transform scale-100 border-4 border-white/80 ring-1 ring-pink-200/50 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-medium mb-1">{format(new Date(selectedMood.created_at), 'yyyy年M月d日 HH:mm', { locale: zhCN })}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-4xl filter drop-shadow-sm">{getMoodEmoji(selectedMood.mood)}</span>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
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
                    className="cursor-pointer bg-gradient-to-br from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 p-2 rounded-full text-pink-500 hover:text-pink-600 transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMood(null)}
                  className="cursor-pointer bg-gradient-to-br from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 p-2 rounded-full text-pink-500 hover:text-pink-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">情绪强度</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 h-2 rounded-full transition-colors ${level <= selectedMood.intensity ? 'bg-gradient-to-r from-pink-400 to-purple-400' : 'bg-gray-100'
                      }`}
                  />
                ))}
              </div>
            </div>

            {selectedMood.note ? (
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-2xl relative border border-pink-200/30">
                <div className="absolute -top-2 left-4 w-4 h-4 bg-gradient-to-br from-pink-50 to-purple-50 rotate-45 border-l border-t border-pink-200/30" />
                <p className="text-gray-700 text-sm leading-relaxed font-medium">&ldquo;{selectedMood.note}&rdquo;</p>
              </div>
            ) : (
              <p className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-sm italic text-center">没有写下笔记哦 ~</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MoodCalendar);