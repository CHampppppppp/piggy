'use client';

import { memo } from 'react';
import { motion, type Variants } from 'framer-motion';

// 通用的贴纸悬浮动画配置
const stickerVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
  },
  hover: {
    scale: 1.2,
    rotate: 5,
    filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
    },
  },
  tap: {
    scale: 1.1,
    rotate: -3,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

// 更活泼的弹跳动画
const bouncyStickerVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
    y: 0,
  },
  hover: {
    scale: 1.25,
    rotate: [0, -5, 5, 0],
    y: -5,
    transition: {
      scale: {
        type: 'spring',
        stiffness: 400,
        damping: 10,
      },
      rotate: {
        duration: 0.4,
        ease: 'easeInOut',
      },
      y: {
        type: 'spring',
        stiffness: 300,
        damping: 15,
      },
    },
  },
  tap: {
    scale: 0.95,
    y: 2,
  },
};

// 可爱小猫贴纸 - 简约线条风格
export const CatSticker = memo(({ className = '', size = 60 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 猫耳朵 */}
    <path d="M25 35 L35 55 L45 35" stroke="#1a1a1a" strokeWidth="3" fill="#ffd6e7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 35 L65 55 L75 35" stroke="#1a1a1a" strokeWidth="3" fill="#ffd6e7" strokeLinecap="round" strokeLinejoin="round" />
    {/* 猫脸 */}
    <ellipse cx="50" cy="60" rx="30" ry="25" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼睛 */}
    <ellipse cx="40" cy="55" rx="5" ry="6" fill="#1a1a1a" />
    <ellipse cx="60" cy="55" rx="5" ry="6" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="42" cy="53" r="2" fill="white" />
    <circle cx="62" cy="53" r="2" fill="white" />
    {/* 鼻子 */}
    <path d="M47 62 L50 65 L53 62" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
    {/* 嘴巴 */}
    <path d="M50 65 Q50 70 45 72" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M50 65 Q50 70 55 72" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 胡须 */}
    <path d="M30 60 L20 58" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M30 65 L20 67" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M70 60 L80 58" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M70 65 L80 67" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="32" cy="65" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="68" cy="65" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
  </motion.svg>
));

CatSticker.displayName = 'CatSticker';

// 可爱小狗贴纸 - 简约线条风格
export const DogSticker = memo(({ className = '', size = 60 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 垂耳朵 */}
    <ellipse cx="25" cy="50" rx="12" ry="20" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
    <ellipse cx="75" cy="50" rx="12" ry="20" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
    {/* 狗脸 */}
    <ellipse cx="50" cy="55" rx="28" ry="25" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼睛 */}
    <ellipse cx="40" cy="50" rx="5" ry="6" fill="#1a1a1a" />
    <ellipse cx="60" cy="50" rx="5" ry="6" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="42" cy="48" r="2" fill="white" />
    <circle cx="62" cy="48" r="2" fill="white" />
    {/* 鼻子 */}
    <ellipse cx="50" cy="62" rx="6" ry="5" fill="#1a1a1a" />
    <ellipse cx="50" cy="60" rx="2" ry="1" fill="white" opacity="0.5" />
    {/* 嘴巴 */}
    <path d="M50 67 L50 72" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M42 75 Q50 80 58 75" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="30" cy="60" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="70" cy="60" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
    {/* 舌头 */}
    <ellipse cx="50" cy="78" rx="5" ry="4" fill="#ffb6d1" stroke="#1a1a1a" strokeWidth="2" />
  </motion.svg>
));

DogSticker.displayName = 'DogSticker';

// 爱心贴纸
export const HeartSticker = memo(({ className = '', size = 40 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={stickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    <path
      d="M50 85 C20 60 10 40 25 25 C40 10 50 25 50 35 C50 25 60 10 75 25 C90 40 80 60 50 85Z"
      fill="#ffd6e7"
      stroke="#1a1a1a"
      strokeWidth="3"
    />
    {/* 高光 */}
    <ellipse cx="35" cy="35" rx="8" ry="5" fill="white" opacity="0.6" transform="rotate(-30 35 35)" />
  </motion.svg>
));

HeartSticker.displayName = 'HeartSticker';

// 星星贴纸 - 带闪烁动画
export const StarSticker = memo(({ className = '', size = 40 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={stickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    animate={{
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    <path
      d="M50 10 L58 40 L90 40 L65 58 L75 90 L50 70 L25 90 L35 58 L10 40 L42 40 Z"
      fill="#ffd6e7"
      stroke="#1a1a1a"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </motion.svg>
));

StarSticker.displayName = 'StarSticker';

// 肉球贴纸
export const PawSticker = memo(({ className = '', size = 50 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={stickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 主肉垫 */}
    <ellipse cx="50" cy="60" rx="22" ry="18" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
    {/* 小肉垫 */}
    <ellipse cx="30" cy="35" rx="10" ry="12" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
    <ellipse cx="50" cy="28" rx="10" ry="12" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
    <ellipse cx="70" cy="35" rx="10" ry="12" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="3" />
  </motion.svg>
));

PawSticker.displayName = 'PawSticker';

// 睡觉小猫贴纸 - 带呼吸动画
export const SleepyCatSticker = memo(({ className = '', size = 80 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 80"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    animate={{
      scaleY: [1, 1.02, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {/* 身体 */}
    <ellipse cx="50" cy="55" rx="40" ry="20" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 头 */}
    <ellipse cx="25" cy="40" rx="20" ry="18" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 耳朵 */}
    <path d="M12 25 L18 38 L28 25" stroke="#1a1a1a" strokeWidth="3" fill="#ffd6e7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 25 L32 38 L38 25" stroke="#1a1a1a" strokeWidth="3" fill="#ffd6e7" strokeLinecap="round" strokeLinejoin="round" />
    {/* 闭眼 */}
    <path d="M18 40 Q23 45 28 40" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="15" cy="48" rx="4" ry="2" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="35" cy="48" rx="4" ry="2" fill="#ffb6d1" opacity="0.6" />
    {/* 尾巴 */}
    <path d="M85 45 Q95 30 80 25" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* ZZZ */}
    <text x="40" y="20" fill="#1a1a1a" fontSize="12" fontWeight="bold">z</text>
    <text x="48" y="15" fill="#1a1a1a" fontSize="10" fontWeight="bold">z</text>
    <text x="54" y="10" fill="#1a1a1a" fontSize="8" fontWeight="bold">z</text>
  </motion.svg>
));

SleepyCatSticker.displayName = 'SleepyCatSticker';




// ============ 新增更多可爱动物贴纸 ============

// 可爱小蛇贴纸 - 简约线条风格
export const SnakeSticker = memo(({ className = '', size = 60 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 蛇身体 - 蜷曲的S形 */}
    <path
      d="M75 70 Q90 55 75 40 Q60 25 45 35 Q30 45 35 60 Q40 75 55 70"
      stroke="#1a1a1a"
      strokeWidth="12"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M75 70 Q90 55 75 40 Q60 25 45 35 Q30 45 35 60 Q40 75 55 70"
      stroke="#b8f5b8"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
    />
    {/* 蛇头 */}
    <ellipse cx="75" cy="70" rx="12" ry="10" fill="#b8f5b8" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼睛 */}
    <circle cx="72" cy="68" r="3" fill="#1a1a1a" />
    <circle cx="80" cy="68" r="3" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="73" cy="67" r="1" fill="white" />
    <circle cx="81" cy="67" r="1" fill="white" />
    {/* 舌头 */}
    <path d="M85 72 L92 70 M85 72 L92 75" stroke="#ff8fab" strokeWidth="2" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="70" cy="74" rx="3" ry="2" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="82" cy="74" rx="3" ry="2" fill="#ffb6d1" opacity="0.6" />
  </motion.svg>
));

SnakeSticker.displayName = 'SnakeSticker';

// 卡皮巴拉贴纸 - 超级呆萌
export const CapybaraSticker = memo(({ className = '', size = 70 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 身体 */}
    <ellipse cx="50" cy="65" rx="35" ry="25" fill="#d4a574" stroke="#1a1a1a" strokeWidth="3" />
    {/* 头 */}
    <ellipse cx="50" cy="40" rx="28" ry="22" fill="#d4a574" stroke="#1a1a1a" strokeWidth="3" />
    {/* 耳朵 */}
    <ellipse cx="28" cy="28" rx="6" ry="8" fill="#d4a574" stroke="#1a1a1a" strokeWidth="2" />
    <ellipse cx="72" cy="28" rx="6" ry="8" fill="#d4a574" stroke="#1a1a1a" strokeWidth="2" />
    {/* 眼睛 - 超级小的点点眼 */}
    <circle cx="40" cy="38" r="3" fill="#1a1a1a" />
    <circle cx="60" cy="38" r="3" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="41" cy="37" r="1" fill="white" />
    <circle cx="61" cy="37" r="1" fill="white" />
    {/* 鼻子 - 大大的方形鼻子 */}
    <rect x="42" y="45" width="16" height="12" rx="4" fill="#8b6914" stroke="#1a1a1a" strokeWidth="2" />
    {/* 鼻孔 */}
    <circle cx="46" cy="50" r="2" fill="#1a1a1a" />
    <circle cx="54" cy="50" r="2" fill="#1a1a1a" />
    {/* 腮红 */}
    <ellipse cx="30" cy="45" rx="5" ry="3" fill="#ffb6d1" opacity="0.5" />
    <ellipse cx="70" cy="45" rx="5" ry="3" fill="#ffb6d1" opacity="0.5" />
    {/* 小脚 */}
    <ellipse cx="30" cy="85" rx="8" ry="5" fill="#d4a574" stroke="#1a1a1a" strokeWidth="2" />
    <ellipse cx="70" cy="85" rx="8" ry="5" fill="#d4a574" stroke="#1a1a1a" strokeWidth="2" />
  </motion.svg>
));

CapybaraSticker.displayName = 'CapybaraSticker';

// 熊猫贴纸 - 圆滚滚的
export const PandaSticker = memo(({ className = '', size = 65 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 耳朵 */}
    <circle cx="25" cy="25" r="12" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="2" />
    <circle cx="75" cy="25" r="12" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="2" />
    {/* 脸 */}
    <circle cx="50" cy="55" r="35" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼圈 - 黑色 */}
    <ellipse cx="35" cy="50" rx="12" ry="14" fill="#1a1a1a" />
    <ellipse cx="65" cy="50" rx="12" ry="14" fill="#1a1a1a" />
    {/* 眼睛 */}
    <ellipse cx="35" cy="50" rx="5" ry="6" fill="white" />
    <ellipse cx="65" cy="50" rx="5" ry="6" fill="white" />
    {/* 眼珠 */}
    <circle cx="36" cy="51" r="3" fill="#1a1a1a" />
    <circle cx="66" cy="51" r="3" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="37" cy="49" r="1.5" fill="white" />
    <circle cx="67" cy="49" r="1.5" fill="white" />
    {/* 鼻子 */}
    <ellipse cx="50" cy="65" rx="6" ry="4" fill="#1a1a1a" />
    {/* 嘴巴 */}
    <path d="M45 72 Q50 78 55 72" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="25" cy="65" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
    <ellipse cx="75" cy="65" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
  </motion.svg>
));

PandaSticker.displayName = 'PandaSticker';

// 兔子贴纸 - 长耳朵
export const BunnySticker = memo(({ className = '', size = 65 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 长耳朵 */}
    <ellipse cx="35" cy="25" rx="8" ry="22" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    <ellipse cx="35" cy="25" rx="4" ry="15" fill="#ffd6e7" />
    <ellipse cx="65" cy="25" rx="8" ry="22" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    <ellipse cx="65" cy="25" rx="4" ry="15" fill="#ffd6e7" />
    {/* 脸 */}
    <ellipse cx="50" cy="65" rx="28" ry="25" fill="white" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼睛 */}
    <ellipse cx="40" cy="60" rx="5" ry="6" fill="#1a1a1a" />
    <ellipse cx="60" cy="60" rx="5" ry="6" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="42" cy="58" r="2" fill="white" />
    <circle cx="62" cy="58" r="2" fill="white" />
    {/* 鼻子 - 小三角 */}
    <path d="M47 70 L50 74 L53 70 Z" fill="#ffd6e7" stroke="#1a1a1a" strokeWidth="2" />
    {/* 嘴巴 - Y形 */}
    <path d="M50 74 L50 78" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M45 82 Q50 78 55 82" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 胡须 */}
    <path d="M30 72 L20 70" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M30 76 L20 78" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M70 72 L80 70" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M70 76 L80 78" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="30" cy="70" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="70" cy="70" rx="5" ry="3" fill="#ffb6d1" opacity="0.6" />
  </motion.svg>
));

BunnySticker.displayName = 'BunnySticker';

// 小鸟贴纸 - 圆滚滚的
export const BirdSticker = memo(({ className = '', size = 55 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 身体 */}
    <ellipse cx="50" cy="55" rx="30" ry="28" fill="#87ceeb" stroke="#1a1a1a" strokeWidth="3" />
    {/* 翅膀 */}
    <ellipse cx="25" cy="55" rx="12" ry="18" fill="#5fb3d4" stroke="#1a1a1a" strokeWidth="2" />
    <ellipse cx="75" cy="55" rx="12" ry="18" fill="#5fb3d4" stroke="#1a1a1a" strokeWidth="2" />
    {/* 眼睛 */}
    <circle cx="40" cy="48" r="6" fill="white" stroke="#1a1a1a" strokeWidth="2" />
    <circle cx="60" cy="48" r="6" fill="white" stroke="#1a1a1a" strokeWidth="2" />
    <circle cx="42" cy="48" r="3" fill="#1a1a1a" />
    <circle cx="62" cy="48" r="3" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="43" cy="47" r="1" fill="white" />
    <circle cx="63" cy="47" r="1" fill="white" />
    {/* 嘴巴 */}
    <path d="M45 60 L50 68 L55 60 Z" fill="#ffa500" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
    {/* 腮红 */}
    <ellipse cx="32" cy="58" rx="4" ry="3" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="68" cy="58" rx="4" ry="3" fill="#ffb6d1" opacity="0.6" />
    {/* 头顶毛 */}
    <path d="M45 30 Q50 20 55 30" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M50 32 Q52 22 54 32" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
  </motion.svg>
));

BirdSticker.displayName = 'BirdSticker';

// 小熊贴纸 - 圆脸
export const BearSticker = memo(({ className = '', size = 65 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 耳朵 */}
    <circle cx="22" cy="28" r="12" fill="#c4a484" stroke="#1a1a1a" strokeWidth="3" />
    <circle cx="22" cy="28" r="6" fill="#ffd6e7" />
    <circle cx="78" cy="28" r="12" fill="#c4a484" stroke="#1a1a1a" strokeWidth="3" />
    <circle cx="78" cy="28" r="6" fill="#ffd6e7" />
    {/* 脸 */}
    <circle cx="50" cy="55" r="35" fill="#c4a484" stroke="#1a1a1a" strokeWidth="3" />
    {/* 嘴部区域 */}
    <ellipse cx="50" cy="65" rx="15" ry="12" fill="#f5deb3" stroke="#1a1a1a" strokeWidth="2" />
    {/* 眼睛 */}
    <ellipse cx="35" cy="50" rx="5" ry="6" fill="#1a1a1a" />
    <ellipse cx="65" cy="50" rx="5" ry="6" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="37" cy="48" r="2" fill="white" />
    <circle cx="67" cy="48" r="2" fill="white" />
    {/* 鼻子 */}
    <ellipse cx="50" cy="62" rx="5" ry="4" fill="#1a1a1a" />
    {/* 嘴巴 */}
    <path d="M50 66 L50 70" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M43 73 Q50 78 57 73" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="25" cy="60" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
    <ellipse cx="75" cy="60" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
  </motion.svg>
));

BearSticker.displayName = 'BearSticker';

// 小鸭子贴纸
export const DuckSticker = memo(({ className = '', size = 60 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 身体 */}
    <ellipse cx="50" cy="65" rx="32" ry="25" fill="#fff9c4" stroke="#1a1a1a" strokeWidth="3" />
    {/* 头 */}
    <circle cx="50" cy="35" r="22" fill="#fff9c4" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼睛 */}
    <circle cx="42" cy="32" r="4" fill="#1a1a1a" />
    <circle cx="58" cy="32" r="4" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="43" cy="31" r="1.5" fill="white" />
    <circle cx="59" cy="31" r="1.5" fill="white" />
    {/* 嘴巴 - 扁扁的 */}
    <ellipse cx="50" cy="45" rx="12" ry="6" fill="#ffa500" stroke="#1a1a1a" strokeWidth="2" />
    {/* 腮红 */}
    <ellipse cx="32" cy="38" rx="4" ry="3" fill="#ffb6d1" opacity="0.6" />
    <ellipse cx="68" cy="38" rx="4" ry="3" fill="#ffb6d1" opacity="0.6" />
    {/* 头顶毛 */}
    <path d="M48 15 Q50 8 52 15" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* 翅膀 */}
    <ellipse cx="25" cy="65" rx="8" ry="12" fill="#fff176" stroke="#1a1a1a" strokeWidth="2" />
    <ellipse cx="75" cy="65" rx="8" ry="12" fill="#fff176" stroke="#1a1a1a" strokeWidth="2" />
  </motion.svg>
));

DuckSticker.displayName = 'DuckSticker';

// 小青蛙贴纸
export const FrogSticker = memo(({ className = '', size = 60 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={`cursor-pointer ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={bouncyStickerVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
  >
    {/* 眼睛凸起 */}
    <circle cx="32" cy="30" r="15" fill="#90ee90" stroke="#1a1a1a" strokeWidth="3" />
    <circle cx="68" cy="30" r="15" fill="#90ee90" stroke="#1a1a1a" strokeWidth="3" />
    {/* 眼珠 */}
    <circle cx="32" cy="30" r="8" fill="white" stroke="#1a1a1a" strokeWidth="2" />
    <circle cx="68" cy="30" r="8" fill="white" stroke="#1a1a1a" strokeWidth="2" />
    <circle cx="34" cy="30" r="4" fill="#1a1a1a" />
    <circle cx="70" cy="30" r="4" fill="#1a1a1a" />
    {/* 眼睛高光 */}
    <circle cx="35" cy="28" r="1.5" fill="white" />
    <circle cx="71" cy="28" r="1.5" fill="white" />
    {/* 脸/身体 */}
    <ellipse cx="50" cy="60" rx="38" ry="28" fill="#90ee90" stroke="#1a1a1a" strokeWidth="3" />
    {/* 嘴巴 - 大大的微笑 */}
    <path d="M25 65 Q50 85 75 65" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* 腮红 */}
    <ellipse cx="22" cy="55" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
    <ellipse cx="78" cy="55" rx="6" ry="4" fill="#ffb6d1" opacity="0.5" />
  </motion.svg>
));

FrogSticker.displayName = 'FrogSticker';

// ============ 圆形人物头像组件 ============

// 圆形人物图片组件 - 带悬浮效果
export const CharacterAvatar = memo(({
  src,
  alt = 'character',
  size = 60,
  className = ''
}: {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}) => (
  <motion.div
    className={`rounded-full overflow-hidden border-3 border-[#1a1a1a] cursor-pointer ${className}`}
    style={{
      width: size,
      height: size,
      boxShadow: '3px 3px 0 #1a1a1a'
    }}
    whileHover={{
      y: -8,
      scale: 1.1,
      boxShadow: '5px 8px 0 #1a1a1a',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15
      }
    }}
    whileTap={{
      scale: 0.95,
      y: 0,
      boxShadow: '2px 2px 0 #1a1a1a'
    }}
  >
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      draggable={false}
    />
  </motion.div>
));


CharacterAvatar.displayName = 'CharacterAvatar';

// 手绘胖箭头贴纸 - 带弧度的卡通动漫风格
export const ArrowSticker = memo(({ className = '', size = 40 }: { className?: string; size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 50 55"
    className={`pointer-events-none ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      y: [0, -6, 0], // 上下浮动动画
    }}
    transition={{
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {/* 卡通风格弧形胖箭头 - 向下指，带手绘感弧度 */}
    <path
      d="M25 50 
         Q12 38 8 28 
         L16 26 
         Q18 16 20 6 
         Q25 4 30 6 
         Q32 16 34 26 
         L42 28 
         Q38 38 25 50 Z"
      fill="white"
      stroke="black"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </motion.svg>
));

ArrowSticker.displayName = 'ArrowSticker';
