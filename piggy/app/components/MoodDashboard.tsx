'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, List as ListIcon, type LucideIcon, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import MoodCalendar from './MoodCalendar';
import MoodHistory from './MoodHistory';
import MoodForm from './MoodForm';
import type { Mood, Period } from '@/lib/types';
import LogoutButton from './LogoutButton';
import {
  CatSticker, DogSticker, HeartSticker, PawSticker, SleepyCatSticker,
  SnakeSticker, CapybaraSticker, PandaSticker, BunnySticker, BirdSticker,
  BearSticker, DuckSticker, FrogSticker, CharacterAvatar, StarSticker
} from './KawaiiStickers';

// 动物贴纸配置
const ANIMAL_STICKERS = [
  { Component: SleepyCatSticker, minSize: 60, maxSize: 95 },
  { Component: CatSticker, minSize: 55, maxSize: 80 },
  { Component: DogSticker, minSize: 55, maxSize: 80 },
  { Component: CapybaraSticker, minSize: 60, maxSize: 90 },
  { Component: SnakeSticker, minSize: 50, maxSize: 75 },
  { Component: PandaSticker, minSize: 55, maxSize: 80 },
  { Component: BunnySticker, minSize: 50, maxSize: 70 },
  { Component: BirdSticker, minSize: 45, maxSize: 65 },
  { Component: BearSticker, minSize: 50, maxSize: 70 },
  { Component: DuckSticker, minSize: 45, maxSize: 65 },
  { Component: FrogSticker, minSize: 45, maxSize: 60 },
];

// 小装饰配置
const SMALL_DECORATIONS = [
  { Component: StarSticker, minSize: 25, maxSize: 40 },
  { Component: HeartSticker, minSize: 28, maxSize: 45 },
  { Component: PawSticker, minSize: 32, maxSize: 50 },
];

// 角色头像配置（排除情绪图片：angry.jpg, annoy.jpg, happiness.jpg）
const CHARACTER_AVATARS = [
  { src: '/images/luffy.jpg', alt: 'Luffy' },
  { src: '/images/luffy2.jpg', alt: 'Luffy' },
  { src: '/images/zoro.jpg', alt: 'Zoro' },
  { src: '/images/L.jpg', alt: 'L' },
  { src: '/images/misa.jpg', alt: 'Misa' },
  { src: '/images/akaza.jpg', alt: 'Akaza' },
  { src: '/images/akaza2.jpg', alt: 'Akaza' },
  { src: '/images/Kamado.jpg', alt: 'Kamado' },
  { src: '/images/makima2.jpg', alt: 'Makima' },
  { src: '/images/makima3.jpg', alt: 'Makima' },
  { src: '/images/paiqiushaonian.jpg', alt: '排球少年' },
  { src: '/images/paiqiushaonian2.jpg', alt: '排球少年' },
  { src: '/images/wushan1.webp', alt: '巫山云海' },
  { src: '/images/wushan2.avif', alt: '巫山云海' },
  { src: '/images/wushan3.webp', alt: '巫山云海' },
  { src: '/images/catty.jpg', alt: 'Catty' },
  { src: '/images/kapibala.jpg', alt: 'Capybara' },
  { src: '/images/kunomi.jpg', alt: 'Kunomi' },
  { src: '/images/kunomi1.jpg', alt: 'Kunomi' },
  { src: '/images/penguin.jpg', alt: 'Penguin' },
  { src: '/images/zhangyu.jpg', alt: '章鱼' },
  { src: '/images/fortnitecat1.jpg', alt: 'Fortnite Cat' },
  { src: '/images/uno2.jpg', alt: 'Uno2' },
  { src: '/images/uno1.jpg', alt: 'Uno1' },
  { src: '/images/xiaohon.jpg', alt: '小红' }
];

const PERIOD_DURATION_DAYS = 7;
const DEFAULT_CYCLE_DAYS = 28;
const MIN_CYCLE_DAYS = 21;
const MAX_CYCLE_DAYS = 35;
const PREDICTION_HORIZON_DAYS = 180;

type PeriodStatus = Record<string, 'actual' | 'predicted'>;

const toDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

function addPeriodInterval(status: PeriodStatus, start: Date, type: 'actual' | 'predicted') {
  for (let i = 0; i < PERIOD_DURATION_DAYS; i++) {
    const current = addDays(start, i);
    const key = toDateKey(current);
    if (type === 'actual' || !status[key]) {
      status[key] = type;
    }
  }
}

function calculateCycleLengthDays(sortedPeriods: Period[]) {
  if (sortedPeriods.length < 2) {
    return DEFAULT_CYCLE_DAYS;
  }

  const diffs: number[] = [];
  for (let i = 1; i < sortedPeriods.length; i++) {
    const prev = normalizeDate(new Date(sortedPeriods[i - 1].start_date));
    const current = normalizeDate(new Date(sortedPeriods[i].start_date));
    const diff = differenceInCalendarDays(current, prev);
    if (diff > 0) {
      diffs.push(diff);
    }
  }

  if (!diffs.length) {
    return DEFAULT_CYCLE_DAYS;
  }

  const avg = Math.round(diffs.reduce((sum, d) => sum + d, 0) / diffs.length);
  return Math.max(MIN_CYCLE_DAYS, Math.min(MAX_CYCLE_DAYS, avg));
}

function buildPeriodStatus(periods: Period[]): PeriodStatus {
  const status: PeriodStatus = {};
  if (!periods.length) {
    return status;
  }

  const sorted = [...periods].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  sorted.forEach((period) => {
    const start = normalizeDate(new Date(period.start_date));
    addPeriodInterval(status, start, 'actual');
  });

  const cycleDays = calculateCycleLengthDays(sorted);
  const lastActualStart = normalizeDate(new Date(sorted[sorted.length - 1].start_date));
  const horizonEnd = addDays(startOfDay(new Date()), PREDICTION_HORIZON_DAYS);

  let nextStart = addDays(lastActualStart, cycleDays);
  while (nextStart <= horizonEnd) {
    addPeriodInterval(status, nextStart, 'predicted');
    nextStart = addDays(nextStart, cycleDays);
  }

  return status;
}

// 生成不重叠的随机位置（针对 Dashboard 的边缘区域，考虑元素尺寸不超出视口）
// maxElementSize: 元素最大尺寸（像素），用于计算安全边距
function generateRandomPositions(
  count: number,
  maxElementSize: number = 100,
  minDistanceOverride?: number
) {
  const positions: { top: number; left: number; delay: number }[] = [];
  const baseMinDistance = minDistanceOverride ?? 14; // 最小间距百分比
  // 根据元素尺寸计算安全边距（假设视口约1000px，转换为百分比）
  const safeMargin = Math.ceil(maxElementSize / 10); // 约等于元素尺寸的百分比

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    let top = 0, left = 0;
    let minDistance = baseMinDistance;

    while (!validPosition && attempts < 50) {
      // 将屏幕分为边缘区域，避开中心手机框架区域，同时确保不超出视口
      const zone = Math.floor(Math.random() * 4); // 0:左 1:右 2:上 3:下
      switch (zone) {
        case 0: // 左侧
          left = Math.random() * 15 + 2;
          top = Math.random() * (70 - safeMargin) + 10;
          break;
        case 1: // 右侧（留出元素宽度的空间）
          left = Math.random() * 12 + (75 - safeMargin);
          top = Math.random() * (70 - safeMargin) + 10;
          break;
        case 2: // 顶部
          left = Math.random() * (45 - safeMargin) + 25;
          top = Math.random() * 10 + 3;
          break;
        case 3: // 底部（留出元素高度的空间）
          left = Math.random() * (45 - safeMargin) + 25;
          top = Math.random() * 8 + (78 - safeMargin);
          break;
      }

      // 检查与已有位置的距离
      validPosition = positions.every(pos => {
        const distance = Math.sqrt(
          Math.pow(pos.left - left, 2) + Math.pow(pos.top - top, 2)
        );
        return distance >= minDistance;
      });

      attempts++;
      if (attempts % 10 === 0 && minDistance > 6) {
        minDistance -= 2;
      }
    }

    if (!validPosition) {
      // 退化为基于网格的分布，避免完全重叠
      const gridSize = Math.ceil(Math.sqrt(count));
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const horizontalSpan = 75 - safeMargin * 2;
      const verticalSpan = 70 - safeMargin * 2;
      top = 10 + (row / Math.max(1, gridSize - 1)) * verticalSpan;
      left = 12 + (col / Math.max(1, gridSize - 1)) * horizontalSpan;
    }

    positions.push({ top, left, delay: Math.random() * 2 });
  }

  return positions;
}

function generateSideDistributedPositions(count: number, maxElementSize: number = 100) {
  const positions: { top: number; left: number; delay: number }[] = [];
  const safeMargin = Math.ceil(maxElementSize / 14);
  const verticalPadding = Math.max(2, safeMargin);
  const verticalMin = verticalPadding;
  const verticalMax = 100 - verticalPadding;
  const innerPadding = Math.max(6, safeMargin);
  const leftBox = {
    top: verticalMin,
    bottom: verticalMax,
    left: 4,
    right: 40 - innerPadding,
  };
  const rightBox = {
    top: verticalMin,
    bottom: verticalMax,
    left: 60 + innerPadding,
    right: 96,
  };
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;
  const minDistance = Math.max(10, 0.12 * (verticalMax - verticalMin));

  const sampleInBox = (
    sideCount: number,
    box: { top: number; bottom: number; left: number; right: number }
  ) => {
    const sidePositions: { top: number; left: number; delay: number }[] = [];
    if (sideCount <= 0) {
      return sidePositions;
    }

    const width = box.right - box.left;
    const height = box.bottom - box.top;
    const fallbackCols = Math.max(1, Math.round(Math.sqrt(sideCount)));
    const fallbackRows = Math.max(1, Math.ceil(sideCount / fallbackCols));

    for (let i = 0; i < sideCount; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        const top = Math.random() * height + box.top;
        const left = Math.random() * width + box.left;
        const fits = sidePositions.every(pos => {
          const distance = Math.hypot(pos.left - left, pos.top - top);
          return distance >= minDistance;
        });
        if (fits) {
          sidePositions.push({ top, left, delay: Math.random() * 2 });
          placed = true;
        }
      }

      if (!placed) {
        const row = Math.floor(i / fallbackCols);
        const col = i % fallbackCols;
        const cellWidth = width / fallbackCols;
        const cellHeight = height / fallbackRows;
        const top =
          box.top + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.4;
        const left =
          box.left + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.4;
        sidePositions.push({
          top: Math.min(box.bottom, Math.max(box.top, top)),
          left: Math.min(box.right, Math.max(box.left, left)),
          delay: Math.random() * 2,
        });
      }
    }

    positions.push(...sidePositions);
  };

  sampleInBox(leftCount, leftBox);
  sampleInBox(rightCount, rightBox);

  return positions;
}

// 随机选择数组中的元素
function shuffleAndPick<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 生成随机大小
function randomSize(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getResponsiveAvatarCount(width: number) {
  if (width < 640) return 0;
  if (width < 1024) return 5;
  if (width < 1440) return 13;
  return 21;
}

function getAvatarMinDistance(count: number) {
  if (count <= 6) return 18;
  if (count <= 12) return 14;
  if (count <= 20) return 12;
  return 10;
}

function createRandomDecorations(avatarCount?: number) {
  // 随机选择 7-9 个动物（最大尺寸约95px）
  const animalCount = Math.floor(Math.random() * 3) + 7;
  const selectedAnimals = shuffleAndPick(ANIMAL_STICKERS, animalCount);
  const animalPositions = generateRandomPositions(animalCount, 100);

  // 随机选择 3-5 个小装饰（最大尺寸约50px）
  const decorCount = Math.floor(Math.random() * 3) + 3;
  const smallDecorPositions = generateRandomPositions(decorCount, 55);

  // 根据屏幕尺寸使用部分角色头像（最大尺寸约108px）
  const maximumAvatars = avatarCount ?? CHARACTER_AVATARS.length;
  const finalAvatarCount = Math.min(maximumAvatars, CHARACTER_AVATARS.length);
  const selectedAvatars = shuffleAndPick(CHARACTER_AVATARS, finalAvatarCount);
  const avatarPositions = generateSideDistributedPositions(finalAvatarCount, 115);

  return {
    animals: selectedAnimals.map((animal, i) => ({
      ...animal,
      size: randomSize(animal.minSize, animal.maxSize),
      position: animalPositions[i],
    })),
    decorations: Array.from({ length: decorCount }, (_, i) => {
      const decor = SMALL_DECORATIONS[Math.floor(Math.random() * SMALL_DECORATIONS.length)];
      return {
        ...decor,
        size: randomSize(decor.minSize, decor.maxSize),
        position: smallDecorPositions[i],
      };
    }),
    avatars: selectedAvatars.map((avatar, i) => ({
      ...avatar,
      size: randomSize(81, 108),
      position: avatarPositions[i],
    })),
  };
}

// 动态导入欢迎语组件
const DailyGreeting = dynamic(() => import('./DailyGreeting'), {
  ssr: false,
});

// 可爱风格的切换按钮组件
const TabButton = memo(({
  isActive,
  onClick,
  icon: Icon,
  label
}: {
  isActive: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 font-bold ${isActive
      ? 'bg-[#ffd6e7] text-black border-3 border-black shadow-[3px_3px_0_#1a1a1a]'
      : 'bg-white text-gray-500 border-3 border-transparent hover:border-black hover:bg-gray-50'
      }`}
  >
    <Icon size={18} strokeWidth={2.5} />
    <span className="text-sm">{label}</span>
  </button>
));

TabButton.displayName = 'TabButton';

export default function MoodDashboard({ moods, periods }: { moods: Mood[], periods: Period[] }) {
  const [view, setView] = useState<'calendar' | 'history'>('calendar');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMood, setEditingMood] = useState<Mood | null>(null);
  const [randomDecorations, setRandomDecorations] = useState<ReturnType<typeof createRandomDecorations> | null>(null);
  const periodStatus = useMemo(() => buildPeriodStatus(periods), [periods]);
  const latestMood = useMemo(
    () =>
      moods.length
        ? moods.reduce(
          (latest, mood) =>
            new Date(mood.created_at) > new Date(latest.created_at) ? mood : latest,
          moods[0]
        )
        : null,
    [moods]
  );

  // 使用浏览器本地时间判断"今天是否已经记录过"，避免受服务端 / 数据库时区影响
  const hasTodayMood = useMemo(() => {
    if (!moods.length) return false;
    const todayKey = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
    return moods.some((m) => {
      const moodKey =
        (m as any).date_key ||
        new Date(m.created_at).toLocaleDateString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\//g, '-');
      return moodKey === todayKey;
    });
  }, [moods]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDecorations = () => {
      const avatarCount = getResponsiveAvatarCount(window.innerWidth);
      setRandomDecorations(createRandomDecorations(avatarCount));
    };

    updateDecorations();

    let resizeTimeout: number | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        updateDecorations();
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
    };
  }, []);

  // 隐式记录登录日志（静默发送，不显示任何提示）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 延迟一小段时间再发送，避免影响页面加载性能
    const timer = setTimeout(() => {
      console.log('[LoginLog] 发送登录日志请求...');
      fetch('/api/log-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (response.ok) {
            console.log('[LoginLog] 登录日志记录成功');
          } else {
            console.warn('[LoginLog] 登录日志记录失败，状态码:', response.status);
          }
        })
        .catch(error => {
          console.error('[LoginLog] 登录日志请求失败:', error);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleEditMood = (mood: Mood) => {
    setEditingMood(mood);
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setTimeout(() => setEditingMood(null), 300);
  };

  const handleOpenAdd = () => {
    setEditingMood(null);
    setIsAddOpen(true);
  };

  return (
    <>
      <DailyGreeting />
      <div className="h-screen w-full bg-white pattern-dots sm:flex sm:items-center sm:justify-center overflow-hidden relative">
        {/* 随机背景装饰贴纸 */}
        {randomDecorations && (
          <div className="absolute inset-0 pointer-events-none hidden sm:block">
            {/* 动物贴纸 */}
            {randomDecorations.animals.map((animal, index) => (
              <div
                key={`animal-${index}`}
                className="absolute animate-float hidden sm:block"
                style={{
                  top: `${animal.position.top}%`,
                  left: `${animal.position.left}%`,
                  animationDelay: `${animal.position.delay}s`,
                }}
              >
                <animal.Component size={animal.size} />
              </div>
            ))}

            {/* 小装饰 */}
            {randomDecorations.decorations.map((decor, index) => (
              <div
                key={`decor-${index}`}
                className="absolute"
                style={{
                  top: `${decor.position.top}%`,
                  left: `${decor.position.left}%`,
                }}
              >
                <decor.Component size={decor.size} />
              </div>
            ))}

            {/* 角色头像 */}
            {randomDecorations.avatars.map((avatar, index) => (
              <div
                key={`avatar-${index}`}
                className="absolute pointer-events-auto animate-float hidden sm:block"
                style={{
                  top: `${avatar.position.top}%`,
                  left: `${avatar.position.left}%`,
                  animationDelay: `${avatar.position.delay}s`,
                }}
              >
                <CharacterAvatar src={avatar.src} alt={avatar.alt} size={avatar.size} />
              </div>
            ))}
          </div>
        )}

        {/* 主要手机框架容器 */}
        <div className="w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[95vh] bg-white flex flex-col overflow-hidden relative sm:rounded-[30px] sm:border-4 sm:border-black sm:shadow-[8px_8px_0_#1a1a1a]">
          {/* Header - 漫画风格 */}
          <header className="relative flex-none pt-8 pb-3 px-6 text-center bg-[#ffd6e7] border-b-4 border-black z-10">
            {/* 右上角退出按钮 */}
            <div className="absolute right-4 top-8">
              <LogoutButton />
            </div>

            {/* 左上角Makima贴画 */}
            <div className="absolute left-4 top-6 w-14 h-14 rounded-full overflow-hidden border-3 border-black sticker-hover">
              <Image
                src="/images/makima3.jpg"
                alt="Makima"
                width={56}
                height={56}
                className="w-full h-full object-cover"
                priority={false}
                loading="lazy"
              />
            </div>

            <h1 className="text-2xl manga-text">
              Piggy&apos;s Diary 🐱
            </h1>
            <p className="text-xs text-black font-bold mt-1 tracking-wide">
              ★ 记录老婆的每一天 ★
            </p>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-3 pb-32 scrollbar-hide bg-white">
            <AnimatePresence mode="wait">
              {view === 'calendar' ? (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="h-full"
                >
                  <MoodCalendar moods={moods} periodStatus={periodStatus} onEditMood={handleEditMood} />
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="pb-20"
                >
                  <MoodHistory moods={moods} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Bottom Controls - 漫画风格 */}
          <div className="flex-none absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-20 pointer-events-none">
            {/* 添加按钮 - 可爱肉球风格 */}
            <motion.button
              whileHover={{ scale: hasTodayMood ? 1 : 1.1, rotate: hasTodayMood ? 0 : 5 }}
              whileTap={{ scale: hasTodayMood ? 1 : 0.9 }}
              onClick={() => !hasTodayMood && handleOpenAdd()}
              className={`cursor-pointer pointer-events-auto relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-black transition-shadow
                ${hasTodayMood ? 'bg-gray-200 border-gray-300 shadow-[2px_2px_0_#999]'
                  : 'bg-[#ffd6e7] shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a]'
                }
              `}
              aria-label={hasTodayMood ? '今日已记录' : '添加心情记录'}
              disabled={hasTodayMood}
            >
              <Plus size={32} strokeWidth={3} className={hasTodayMood ? 'text-gray-400' : 'text-black'} />
            </motion.button>

            {/* Switch Tabs - 漫画风格 */}
            <div className="pointer-events-auto bg-white border-4 border-black rounded-full p-1.5 flex gap-2 shadow-[4px_4px_0_#1a1a1a]">
              <TabButton
                isActive={view === 'calendar'}
                onClick={() => setView('calendar')}
                icon={CalendarIcon}
                label="日历"
              />
              <TabButton
                isActive={view === 'history'}
                onClick={() => setView('history')}
                icon={ListIcon}
                label="列表"
              />
            </div>
          </div>

          {/* Add Mood Modal - 漫画风格 */}
          <AnimatePresence>
            {isAddOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
                onClick={handleCloseAdd}
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-sm bg-white border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl px-4 py-4 sm:shadow-[6px_6px_0_#1a1a1a] h-[82vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto scrollbar-cute"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 拖拽指示条 (仅移动端) */}
                  <div className="w-10 h-1 bg-black rounded-full mx-auto mb-2 sm:hidden" />

                  {/* 头部 - 带装饰猫咪 */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <CatSticker size={32} />
                      <h3 className="text-lg font-bold manga-text-thin">
                        {editingMood ? '修改心情' : '记录心情'}
                      </h3>
                    </div>
                    <button
                      onClick={handleCloseAdd}
                      className="cursor-pointer p-1.5 rounded-full border-2 border-black hover:bg-[#ffd6e7] transition-colors"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>

                  <MoodForm onSuccess={handleCloseAdd} initialData={editingMood} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
