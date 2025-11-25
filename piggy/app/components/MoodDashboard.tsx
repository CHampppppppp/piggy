'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, List as ListIcon, type LucideIcon, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import MoodCalendar from './MoodCalendar';
import MoodHistory from './MoodHistory';
import MoodForm from './MoodForm';
import { Mood, Period } from '@/lib/actions';
import LogoutButton from './LogoutButton';
import { 
  CatSticker, DogSticker, HeartSticker, PawSticker, SleepyCatSticker,
  SnakeSticker, CapybaraSticker, PandaSticker, BunnySticker, BirdSticker,
  BearSticker, DuckSticker, FrogSticker, CharacterAvatar, StarSticker
} from './KawaiiStickers';

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
    className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 font-bold ${
      isActive
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
        {/* 背景装饰贴纸 - 丰富的动物和人物 */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          {/* 左上区域 - 睡觉猫咪 */}
          <div className="absolute top-8 left-8 animate-float">
            <SleepyCatSticker size={90} />
          </div>
          
          {/* 右上区域 - 卡皮巴拉 */}
          <div className="absolute top-12 right-12 animate-float" style={{ animationDelay: '0.5s' }}>
            <CapybaraSticker size={85} />
          </div>
          
          {/* 左侧中部 - 熊猫 */}
          <div className="absolute top-1/3 left-6 animate-float" style={{ animationDelay: '1s' }}>
            <PandaSticker size={70} />
          </div>
          
          {/* 右侧中部 - 小蛇 */}
          <div className="absolute top-1/4 right-8 animate-float" style={{ animationDelay: '0.8s' }}>
            <SnakeSticker size={65} />
          </div>
          
          {/* 左下区域 - 小兔子 */}
          <div className="absolute bottom-1/3 left-10 animate-float" style={{ animationDelay: '1.3s' }}>
            <BunnySticker size={60} />
          </div>
          
          {/* 右下区域 - 小狗 */}
          <div className="absolute bottom-24 right-16 animate-float" style={{ animationDelay: '0.3s' }}>
            <DogSticker size={75} />
          </div>
          
          {/* 底部左侧 - 小鸟 */}
          <div className="absolute bottom-16 left-20 animate-float" style={{ animationDelay: '1.6s' }}>
            <BirdSticker size={55} />
          </div>
          
          {/* 中下区域 - 青蛙 */}
          <div className="absolute bottom-8 left-1/3 animate-float" style={{ animationDelay: '0.9s' }}>
            <FrogSticker size={50} />
          </div>
          
          {/* 右侧底部 - 小熊 */}
          <div className="absolute bottom-1/4 right-6 animate-float" style={{ animationDelay: '1.1s' }}>
            <BearSticker size={60} />
          </div>
          
          {/* 散落的装饰 */}
          <div className="absolute top-20 left-1/4">
            <HeartSticker size={35} />
          </div>
          <div className="absolute top-1/2 right-1/4">
            <PawSticker size={40} />
          </div>
          <div className="absolute bottom-1/2 left-16">
            <StarSticker size={30} />
          </div>
          
          {/* 圆形人物头像装饰 */}
          <div className="absolute top-16 left-1/3 pointer-events-auto">
            <CharacterAvatar src="/luffy.jpg" alt="Luffy" size={55} />
          </div>
          <div className="absolute top-1/4 right-1/3 pointer-events-auto">
            <CharacterAvatar src="/L.jpg" alt="L" size={50} />
          </div>
          <div className="absolute bottom-20 left-1/4 pointer-events-auto">
            <CharacterAvatar src="/zoro.jpg" alt="Zoro" size={52} />
          </div>
          <div className="absolute bottom-1/3 right-1/4 pointer-events-auto">
            <CharacterAvatar src="/akaza.jpg" alt="Akaza" size={48} />
          </div>
          <div className="absolute top-1/2 left-8 pointer-events-auto">
            <CharacterAvatar src="/Kamado.jpg" alt="Kamado" size={50} />
          </div>
          <div className="absolute bottom-12 right-1/3 pointer-events-auto">
            <CharacterAvatar src="/misa.jpg" alt="Misa" size={45} />
          </div>
        </div>

        {/* 主要手机框架容器 */}
        <div className="w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[95vh] bg-white flex flex-col overflow-hidden relative sm:rounded-[30px] sm:border-4 sm:border-black sm:shadow-[8px_8px_0_#1a1a1a]">
          {/* Header - 漫画风格 */}
          <header className="relative flex-none pt-8 pb-3 px-6 text-center bg-[#ffd6e7] border-b-4 border-black z-10">
            {/* 右上角退出按钮 */}
            <div className="absolute right-4 top-4">
              <LogoutButton />
            </div>
            
            {/* 左上角Makima贴画 */}
            <div className="absolute left-4 top-3 w-14 h-14 rounded-full overflow-hidden border-3 border-black sticker-hover">
              <Image 
                src="/makima3.jpg" 
                alt="Makima" 
                width={56} 
                height={56}
                className="w-full h-full object-cover"
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
                  <MoodCalendar moods={moods} periods={periods} onEditMood={handleEditMood} />
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
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleOpenAdd}
              className="cursor-pointer pointer-events-auto relative w-16 h-16 flex items-center justify-center bg-[#ffd6e7] rounded-full border-4 border-black shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a] transition-shadow"
              aria-label="添加心情记录"
            >
              <Plus size={32} strokeWidth={3} className="text-black" />
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
                  className="w-full max-w-md bg-white border-t-4 sm:border-4 border-black sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto sm:shadow-[6px_6px_0_#1a1a1a]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 拖拽指示条 (仅移动端) */}
                  <div className="w-12 h-1.5 bg-black rounded-full mx-auto mb-4 sm:hidden" />
                  
                  {/* 头部 */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold manga-text-thin">
                      {editingMood ? '修改心情' : '记录心情'}
                    </h3>
                    <button 
                      onClick={handleCloseAdd} 
                      className="cursor-pointer p-2 rounded-full border-3 border-black hover:bg-[#ffd6e7] transition-colors"
                    >
                      <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                  
                  {/* 装饰猫咪 */}
                  <div className="flex justify-center mb-2">
                    <CatSticker size={50} />
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
