'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CatSticker, DogSticker, StarSticker, HeartSticker } from './KawaiiStickers';

const GREETINGS = [
  "今天也要开开心心的哦 ♡",
  "记得好好照顾自己呀 ★",
  "每一天都是新的开始 ✧",
  "保持快乐，我会陪着你 🐱",
  "愿你今天收获满满的快乐 ♪",
  "做最好的自己！★",
  "今天也是充满希望的一天 ✧",
  "记得多喝水 💧",
  "你很棒，要相信自己哦 ♡",
  "温柔对待自己 ♪",
  "每个瞬间都值得被珍惜 ✧",
  "今天想要分享什么心情呢？★",
  "阳光正好，心情也要好好的 ☀",
  "慢慢来，一切都来得及 ♡",
];

export default function DailyGreeting() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const today = new Date().toDateString();
    const lastShownDate = sessionStorage.getItem('piggy_greeting_shown');
    return lastShownDate !== today;
  });
  const [todayGreeting] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('piggy_greeting_date');
    const savedGreeting = localStorage.getItem('piggy_greeting_text');

    if (savedDate === today && savedGreeting) {
      return savedGreeting;
    }

    const randomIndex = Math.floor(Math.random() * GREETINGS.length);
    const greeting = GREETINGS[randomIndex];

    localStorage.setItem('piggy_greeting_date', today);
    localStorage.setItem('piggy_greeting_text', greeting);
    return greeting;
  });

  useEffect(() => {
    if (!shouldShow) {
      return;
    }
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldShow]);

  const handleClose = () => {
    setIsVisible(false);
    setShouldShow(false);
    const today = new Date().toDateString();
    sessionStorage.setItem('piggy_greeting_shown', today);
  };

  if (!shouldShow || !todayGreeting) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative bg-white rounded-3xl p-8 max-w-sm w-full border-4 border-black shadow-[8px_8px_0_#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 装饰性贴纸 */}
            <div className="absolute -top-6 -left-6 animate-float hidden sm:block">
              <CatSticker size={50} />
            </div>
            <div className="absolute -top-4 -right-4 animate-float hidden sm:block" style={{ animationDelay: '0.3s' }}>
              <StarSticker size={40} />
            </div>
            <div className="absolute -bottom-5 -right-5 animate-float hidden sm:block" style={{ animationDelay: '0.6s' }}>
              <DogSticker size={45} />
            </div>
            <div className="absolute -bottom-4 -left-4 animate-float" style={{ animationDelay: '0.9s' }}>
              <HeartSticker size={35} />
            </div>

            <div className="flex flex-col items-center text-center">
              {/* Makima 图片 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10, stiffness: 200 }}
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-black mb-4 shadow-[4px_4px_0_#1a1a1a] sticker-hover"
              >
                <Image 
                  src="/images/makima2.webp"
                  alt="Makima"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold manga-text mb-3"
              >
                Champ:
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-black leading-relaxed mb-6 font-bold"
              >
                {todayGreeting}
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleClose}
                className="cursor-pointer px-6 py-3 bg-[#ffd6e7] text-black font-bold rounded-full border-3 border-black shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0_#1a1a1a] active:translate-x-0 active:translate-y-0 transition-all"
              >
                开始记录今天的心情 →
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
