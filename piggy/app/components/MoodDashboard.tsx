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

// ==================== 经期周期预测相关常量 ====================
const PERIOD_DURATION_DAYS = 7; // 每次经期持续天数
const DEFAULT_CYCLE_DAYS = 28; // 默认周期天数（如果历史记录不足）
const MIN_CYCLE_DAYS = 21; // 最短周期天数（防止异常值）
const MAX_CYCLE_DAYS = 35; // 最长周期天数（防止异常值）
const PREDICTION_HORIZON_DAYS = 180; // 预测未来多少天的经期

type PeriodStatus = Record<string, 'actual' | 'predicted'>;

/**
 * 将日期转换为 YYYY-MM-DD 格式的字符串键
 * 用于在对象中快速查找某一天的状态
 */
const toDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

/**
 * 标准化日期：将时间部分清零，只保留日期
 * 避免时区问题导致日期判断错误
 */
const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * 将一段连续日期标记为经期（实际记录或预测）
 * @param status - 状态对象，用于存储每一天的经期状态
 * @param start - 经期开始日期
 * @param type - 'actual' 表示实际记录的经期，'predicted' 表示预测的经期
 * 
 * 注意：实际记录的优先级高于预测，如果某天已有实际记录，不会被预测覆盖
 */
function addPeriodInterval(status: PeriodStatus, start: Date, type: 'actual' | 'predicted') {
  for (let i = 0; i < PERIOD_DURATION_DAYS; i++) {
    const current = addDays(start, i);
    const key = toDateKey(current);
    if (type === 'actual' || !status[key]) {
      status[key] = type;
    }
  }
}

/**
 * 根据历史经期记录计算平均周期长度
 * @param sortedPeriods - 按时间排序的经期记录数组
 * @returns 计算出的周期天数（限制在 21-35 天之间）
 * 
 * 算法：
 * 1. 如果记录少于2条，返回默认值 28 天
 * 2. 计算相邻两次经期开始日期的间隔
 * 3. 取所有间隔的平均值
 * 4. 将结果限制在合理范围内（21-35 天）
 */
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

/**
 * 构建经期状态映射：包含实际记录和未来预测
 * @param periods - 所有经期记录
 * @returns 一个对象，键为日期（YYYY-MM-DD），值为 'actual' 或 'predicted'
 * 
 * 处理流程：
 * 1. 将所有实际记录的经期日期标记为 'actual'
 * 2. 根据历史数据计算平均周期长度
 * 3. 从最后一次实际记录开始，按周期预测未来 180 天的经期
 * 4. 将预测的日期标记为 'predicted'
 */
function buildPeriodStatus(periods: Period[]): PeriodStatus {
  const status: PeriodStatus = {};
  if (!periods.length) {
    return status;
  }

  // 按时间排序，确保处理顺序正确
  const sorted = [...periods].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // 标记所有实际记录的经期日期
  sorted.forEach((period) => {
    const start = normalizeDate(new Date(period.start_date));
    addPeriodInterval(status, start, 'actual');
  });

  // 计算周期长度并预测未来经期
  const cycleDays = calculateCycleLengthDays(sorted);
  const lastActualStart = normalizeDate(new Date(sorted[sorted.length - 1].start_date));
  const horizonEnd = addDays(startOfDay(new Date()), PREDICTION_HORIZON_DAYS);

  // 从最后一次实际记录开始，按周期预测未来经期
  let nextStart = addDays(lastActualStart, cycleDays);
  while (nextStart <= horizonEnd) {
    addPeriodInterval(status, nextStart, 'predicted');
    nextStart = addDays(nextStart, cycleDays);
  }

  return status;
}

/**
 * 生成不重叠的随机位置（针对 Dashboard 的边缘区域，考虑元素尺寸不超出视口）
 * 
 * 这个函数用于在页面边缘区域（避开中心手机框架）随机分布装饰元素
 * 
 * @param count - 需要生成的位置数量
 * @param maxElementSize - 元素最大尺寸（像素），用于计算安全边距，防止元素超出视口
 * @param minDistanceOverride - 可选的最小间距百分比，如果不提供则使用默认值 14%
 * @returns 位置数组，每个位置包含 top（百分比）、left（百分比）和 delay（动画延迟秒数）
 * 
 * 算法说明：
 * 1. 将屏幕分为4个边缘区域：左、右、上、下，避开中心 25%-75% 的手机框架区域
 * 2. 随机选择一个区域，在该区域内生成位置
 * 3. 检查新位置与已有位置的距离，确保不重叠（使用欧几里得距离）
 * 4. 如果尝试50次仍找不到合适位置，逐步降低最小距离要求
 * 5. 如果最终仍无法找到合适位置，退化为网格分布，确保所有元素都能放置
 */
function generateRandomPositions(
  count: number,
  maxElementSize: number = 100,
  minDistanceOverride?: number
) {
  const positions: { top: number; left: number; delay: number }[] = [];
  const baseMinDistance = minDistanceOverride ?? 14; // 最小间距百分比
  // 根据元素尺寸计算安全边距（假设视口约1000px，转换为百分比）
  // 这样可以确保元素不会超出视口边界
  const safeMargin = Math.ceil(maxElementSize / 10); // 约等于元素尺寸的百分比

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    let top = 0, left = 0;
    let minDistance = baseMinDistance;

    // 尝试找到不重叠的位置，最多尝试50次
    while (!validPosition && attempts < 50) {
      // 将屏幕分为边缘区域，避开中心手机框架区域，同时确保不超出视口
      const zone = Math.floor(Math.random() * 4); // 0:左 1:右 2:上 3:下
      switch (zone) {
        case 0: // 左侧边缘区域（2%-17%）
          left = Math.random() * 15 + 2;
          top = Math.random() * (70 - safeMargin) + 10;
          break;
        case 1: // 右侧边缘区域（75%-87%，留出元素宽度的空间）
          left = Math.random() * 12 + (75 - safeMargin);
          top = Math.random() * (70 - safeMargin) + 10;
          break;
        case 2: // 顶部边缘区域（3%-13%）
          left = Math.random() * (45 - safeMargin) + 25;
          top = Math.random() * 10 + 3;
          break;
        case 3: // 底部边缘区域（78%-86%，留出元素高度的空间）
          left = Math.random() * (45 - safeMargin) + 25;
          top = Math.random() * 8 + (78 - safeMargin);
          break;
      }

      // 检查与已有位置的距离，确保不重叠
      validPosition = positions.every(pos => {
        const distance = Math.sqrt(
          Math.pow(pos.left - left, 2) + Math.pow(pos.top - top, 2)
        );
        return distance >= minDistance;
      });

      attempts++;
      // 每10次尝试后，如果还没找到合适位置，降低最小距离要求
      // 这样可以避免在元素较多时完全无法放置
      if (attempts % 10 === 0 && minDistance > 6) {
        minDistance -= 2;
      }
    }

    // 如果尝试50次仍找不到合适位置，退化为基于网格的分布
    // 这样可以确保所有元素都能放置，避免完全重叠
    if (!validPosition) {
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

/**
 * 在屏幕左右两侧区域生成不重叠的随机位置
 * 
 * 这个函数专门用于角色头像的分布，将它们集中在左右两侧，避开中心区域
 * 
 * @param count - 需要生成的位置数量
 * @param maxElementSize - 元素最大尺寸（像素），用于计算安全边距
 * @returns 位置数组，每个位置包含 top、left 和 delay
 * 
 * 算法说明：
 * 1. 定义左右两个矩形区域（leftBox 和 rightBox），避开中心 40%-60% 区域
 * 2. 将元素数量平均分配到左右两侧（左侧向上取整）
 * 3. 在每个区域内随机生成位置，确保不重叠
 * 4. 如果随机生成失败，退化为网格分布，并在网格中心添加随机偏移
 */
function generateSideDistributedPositions(count: number, maxElementSize: number = 100) {
  const positions: { top: number; left: number; delay: number }[] = [];
  const safeMargin = Math.ceil(maxElementSize / 14);
  const verticalPadding = Math.max(2, safeMargin);
  const verticalMin = verticalPadding;
  const verticalMax = 100 - verticalPadding;
  const innerPadding = Math.max(6, safeMargin);

  // 定义左侧区域：4% - (40% - innerPadding)
  const leftBox = {
    top: verticalMin,
    bottom: verticalMax,
    left: 4,
    right: 40 - innerPadding,
  };
  // 定义右侧区域：(60% + innerPadding) - 96%
  const rightBox = {
    top: verticalMin,
    bottom: verticalMax,
    left: 60 + innerPadding,
    right: 96,
  };

  // 将元素平均分配到左右两侧
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;
  // 根据可用垂直空间动态计算最小距离
  const minDistance = Math.max(10, 0.12 * (verticalMax - verticalMin));

  /**
   * 在指定矩形区域内生成不重叠的位置
   * @param sideCount - 该侧需要放置的元素数量
   * @param box - 矩形区域的边界（top, bottom, left, right）
   */
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
    // 计算网格的行列数，用于后备方案
    const fallbackCols = Math.max(1, Math.round(Math.sqrt(sideCount)));
    const fallbackRows = Math.max(1, Math.ceil(sideCount / fallbackCols));

    for (let i = 0; i < sideCount; i++) {
      let placed = false;
      // 尝试随机生成位置，最多尝试60次
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        const top = Math.random() * height + box.top;
        const left = Math.random() * width + box.left;
        // 检查是否与已有位置重叠
        const fits = sidePositions.every(pos => {
          const distance = Math.hypot(pos.left - left, pos.top - top);
          return distance >= minDistance;
        });
        if (fits) {
          sidePositions.push({ top, left, delay: Math.random() * 2 });
          placed = true;
        }
      }

      // 如果随机生成失败，使用网格分布作为后备方案
      if (!placed) {
        const row = Math.floor(i / fallbackCols);
        const col = i % fallbackCols;
        const cellWidth = width / fallbackCols;
        const cellHeight = height / fallbackRows;
        // 在网格中心添加随机偏移（±20%），使分布更自然
        const top =
          box.top + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.4;
        const left =
          box.left + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.4;
        // 确保位置在边界内
        sidePositions.push({
          top: Math.min(box.bottom, Math.max(box.top, top)),
          left: Math.min(box.right, Math.max(box.left, left)),
          delay: Math.random() * 2,
        });
      }
    }

    positions.push(...sidePositions);
  };

  // 分别在左右两侧生成位置
  sampleInBox(leftCount, leftBox);
  sampleInBox(rightCount, rightBox);

  return positions;
}

/**
 * 随机选择数组中的元素
 * @param array - 源数组
 * @param count - 需要选择的数量
 * @returns 随机选择后的数组切片
 */
function shuffleAndPick<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 生成指定范围内的随机整数大小
 * @param min - 最小值
 * @param max - 最大值
 * @returns 随机整数
 */
function randomSize(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 根据屏幕宽度返回应该显示的角色头像数量
 * 响应式设计：屏幕越大，显示的头像越多
 * @param width - 屏幕宽度（像素）
 * @returns 头像数量
 */
function getResponsiveAvatarCount(width: number) {
  if (width < 640) return 0;      // 手机：不显示
  if (width < 1024) return 5;     // 平板：5个
  if (width < 1440) return 13;    // 小桌面：13个
  return 21;                       // 大桌面：21个
}

/**
 * 根据头像数量返回最小间距
 * 头像越多，间距越小，避免过于拥挤
 * @param count - 头像数量
 * @returns 最小间距百分比
 */
function getAvatarMinDistance(count: number) {
  if (count <= 6) return 18;
  if (count <= 12) return 14;
  if (count <= 20) return 12;
  return 10;
}

/**
 * 创建随机装饰配置
 * 
 * 这个函数会随机生成三种类型的装饰：
 * 1. 动物贴纸：7-9个，分布在页面边缘
 * 2. 小装饰：3-5个，分布在页面边缘
 * 3. 角色头像：根据屏幕尺寸决定数量，分布在左右两侧
 * 
 * @param avatarCount - 可选的头像数量，如果不提供则根据屏幕尺寸自动计算
 * @returns 包含所有装饰配置的对象
 */
function createRandomDecorations(avatarCount?: number) {
  // 随机选择 7-9 个动物贴纸（最大尺寸约95px）
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
  // 构建经期状态映射（包含实际记录和未来预测）
  // 使用 useMemo 避免每次渲染都重新计算
  const periodStatus = useMemo(() => buildPeriodStatus(periods), [periods]);

  // 找到最新的心情记录
  // 使用 useMemo 避免每次渲染都重新查找
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

  /**
   * 判断今天是否已经记录过心情
   * 
   * 使用浏览器本地时间判断，避免受服务端/数据库时区影响
   * 这样可以确保无论用户在哪个时区，都能正确判断"今天"是否已记录
   * 
   * 匹配逻辑：
   * 1. 优先使用 mood.date_key（如果存在，这是前端保存时生成的）
   * 2. 如果没有 date_key，则从 created_at 解析日期
   * 3. 将日期格式化为 YYYY-MM-DD 格式进行比较
   */
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

  /**
   * 响应式装饰生成：根据屏幕尺寸动态生成装饰元素
   * 
   * 处理流程：
   * 1. 组件挂载时立即生成一次装饰
   * 2. 监听窗口大小变化事件
   * 3. 使用防抖（200ms）避免频繁重新生成
   * 4. 清理时移除事件监听器和定时器
   */
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
      // 防抖：200ms 后才重新生成，避免频繁计算
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

  /**
   * 隐式记录登录日志（静默发送，不显示任何提示）
   * 
   * 这个功能用于统计用户登录情况，但不影响用户体验
   * 延迟500ms发送，避免影响页面加载性能
   */
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
                  className="w-full max-w-sm bg-white border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl px-4 py-4 sm:shadow-[6px_6px_0_#1a1a1a] h-[82vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
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
