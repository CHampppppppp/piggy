'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import MoodCalendar from './MoodCalendar';
import MoodHistory from './MoodHistory';
import MoodForm from './MoodForm';
import { Mood } from '@/lib/actions';

// 动态导入欢迎语组件，因为它只在首次加载时需要
const DailyGreeting = dynamic(() => import('./DailyGreeting'), {
  ssr: false,
});

// 优化的切换按钮组件
const TabButton = memo(({
  isActive,
  onClick,
  icon: Icon,
  label
}: {
  isActive: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isActive
      ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 font-semibold shadow-sm'
      : 'text-gray-400 hover:text-gray-600'
      }`}
  >
    <Icon size={18} />
    <span className="text-sm">{label}</span>
  </button>
));

TabButton.displayName = 'TabButton';

export default function MoodDashboard({ moods }: { moods: Mood[] }) {
  const [view, setView] = useState<'calendar' | 'history'>('calendar');
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <>
      <DailyGreeting />
      <div className="h-screen w-full bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300 sm:flex sm:items-center sm:justify-center overflow-hidden">
        <div className="w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[95vh] bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col overflow-hidden relative sm:rounded-[30px] sm:shadow-2xl sm:border-[8px] sm:border-white/80 sm:ring-1 sm:ring-pink-200/50">
          {/* Header */}
          <header className="flex-none pt-8 pb-2 px-6 text-center bg-gradient-to-b from-white/80 via-pink-50/50 to-transparent z-10">
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent tracking-tight">Piggy's Mood Diary 🐷</h1>
            <p className="text-xs bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mt-1 font-medium">记录老婆的每一天 ✨</p>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-2 pb-28 scrollbar-hide">
            <AnimatePresence mode="wait">
              {view === 'calendar' ? (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  <MoodCalendar moods={moods} />
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="pb-20"
                >
                  <MoodHistory moods={moods} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Bottom Controls */}
          <div className="flex-none absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-20 pointer-events-none">

            {/* Heart-shaped FAB */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddOpen(true)}
              className="cursor-pointer pointer-events-auto relative w-16 h-16 flex items-center justify-center"
              aria-label="添加心情记录"
            >
              {/* 白色外层爱心 */}
              <Heart
                size={64}
                className="absolute text-white fill-white"
                style={{
                  filter: 'drop-shadow(0 10px 25px rgba(236, 72, 153, 0.5))'
                }}
              />
              {/* 粉色渐变内层爱心 */}
              <Heart
                size={56}
                className="absolute text-pink-400 fill-pink-400"
                style={{
                  filter: 'drop-shadow(0 2px 8px rgba(236, 72, 153, 0.3))'
                }}
              />
              {/* 白色加号 */}
              <span className="relative text-white text-xl font-bold z-10" style={{ marginTop: '-2px' }}>+</span>
            </motion.button>

            {/* Switch Tabs */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-xl shadow-lg rounded-full p-1.5 flex gap-2 border border-pink-200/50">
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

          {/* Add Mood Modal */}
          <AnimatePresence>
            {isAddOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setIsAddOpen(false)}
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden opacity-50" />
                  <div className="flex justify-between items-center mb-4 sm:hidden">
                    <h3 className="text-lg font-bold text-gray-800">记录心情</h3>
                    <button onClick={() => setIsAddOpen(false)} className="cursor-pointer text-gray-400 p-2">
                      关闭
                    </button>
                  </div>
                  <MoodForm onSuccess={() => setIsAddOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

