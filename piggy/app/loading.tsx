'use client';

import Image from 'next/image';
import { PawSticker, HeartSticker } from './components/KawaiiStickers';

export default function Loading() {
  return (
    <div className="h-screen w-full bg-white pattern-dots flex items-center justify-center px-4">
      <div className="relative w-full max-w-sm card-manga rounded-[32px] bg-white p-8 flex flex-col items-center text-center gap-5">
        <div className="absolute -top-6 -left-6 animate-float">
          <PawSticker size={48} />
        </div>
        <div className="absolute -bottom-6 -right-6 animate-float">
          <HeartSticker size={42} />
        </div>

        <div className="flex items-center gap-3 text-sm font-bold text-black uppercase tracking-[0.3em]">
          <span className="h-px w-8 bg-black" />
          Piggy Loading
          <span className="h-px w-8 bg-black" />
        </div>

        <div className="relative w-32 h-32 rounded-full border-4 border-black overflow-hidden animate-bounce shadow-[4px_4px_0_#1a1a1a]">
          <Image
            src="/images/kunomi.jpg"
            alt="Kuromi"
            fill
            className="object-cover"
            priority
            sizes="128px"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold manga-text-thin text-black">加载中...</p>
          <p className="text-xs text-gray-500 font-semibold">宝宝の秘密本马上来啦 ♡</p>
        </div>

        <div className="w-full bg-gray-200 border-2 border-black rounded-full h-3 overflow-hidden">
          <div className="h-full bg-[#ffd6e7] animate-[loading-bar_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 20%;
            transform: translateX(-20%);
          }
          50% {
            width: 80%;
            transform: translateX(10%);
          }
          100% {
            width: 20%;
            transform: translateX(80%);
          }
        }
      `}</style>
    </div>
  );
}

