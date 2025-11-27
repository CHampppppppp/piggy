'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import ForgotPasswordModal from './ForgotPasswordModal';
import { useImagePreloader } from '@/app/hooks/useImagePreloader';
import {
    CatSticker, DogSticker, HeartSticker, StarSticker, PawSticker,
    SnakeSticker, CapybaraSticker, PandaSticker, BunnySticker, BirdSticker,
    BearSticker, DuckSticker, FrogSticker
} from './KawaiiStickers';
import Image from 'next/image';

// 动物贴纸配置
const ANIMAL_STICKERS = [
    { Component: CatSticker, minSize: 50, maxSize: 80 },
    { Component: DogSticker, minSize: 50, maxSize: 75 },
    { Component: CapybaraSticker, minSize: 55, maxSize: 85 },
    { Component: SnakeSticker, minSize: 45, maxSize: 70 },
    { Component: PandaSticker, minSize: 50, maxSize: 75 },
    { Component: BunnySticker, minSize: 45, maxSize: 70 },
    { Component: BirdSticker, minSize: 40, maxSize: 60 },
    { Component: BearSticker, minSize: 45, maxSize: 65 },
    { Component: DuckSticker, minSize: 40, maxSize: 60 },
    { Component: FrogSticker, minSize: 40, maxSize: 55 },
];

// 小装饰配置
const SMALL_DECORATIONS = [
    { Component: StarSticker, minSize: 20, maxSize: 35 },
    { Component: HeartSticker, minSize: 25, maxSize: 40 },
    { Component: PawSticker, minSize: 30, maxSize: 45 },
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
];

// 移动端只预加载两张Makima图片，桌面端加载所有图片
const getPreloadImages = (isMobile: boolean) => {
    return isMobile 
        ? [
            '/images/makima2.jpg', // DailyGreeting中的图片
            '/images/makima3.jpg', // MoodDashboard中的图片
        ]
        : [
            ...CHARACTER_AVATARS.map(avatar => avatar.src),
            '/images/makima2.jpg', // DailyGreeting中的图片
            '/images/makima3.jpg', // MoodDashboard中的图片
        ];
};

// 移除图片预加载工具函数，改用Hook

// 生成不重叠的随机位置（考虑元素尺寸，确保不超出视口）
// maxElementSize: 元素最大尺寸（像素），用于计算安全边距
function generateRandomPositions(count: number, maxElementSize: number = 100, avoidCenter: boolean = true) {
    const positions: { top: number; left: number; delay: number }[] = [];
    const minDistance = 12; // 最小间距百分比
    // 根据元素尺寸计算安全边距（假设视口约1000px，转换为百分比）
    const safeMargin = Math.ceil(maxElementSize / 10); // 约等于元素尺寸的百分比

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPosition = false;
        let top = 0, left = 0;

        while (!validPosition && attempts < 50) {
            // 生成随机位置（避开中心登录区域）
            if (avoidCenter) {
                // 将屏幕分为边缘区域，同时确保不超出视口
                const zone = Math.floor(Math.random() * 4); // 0:左 1:右 2:上 3:下
                switch (zone) {
                    case 0: // 左侧
                        left = Math.random() * 15 + 2;
                        top = Math.random() * (75 - safeMargin) + 5;
                        break;
                    case 1: // 右侧（留出元素宽度的空间）
                        left = Math.random() * 15 + (78 - safeMargin);
                        top = Math.random() * (75 - safeMargin) + 5;
                        break;
                    case 2: // 顶部
                        left = Math.random() * (50 - safeMargin) + 20;
                        top = Math.random() * 12 + 3;
                        break;
                    case 3: // 底部（留出元素高度的空间）
                        left = Math.random() * (50 - safeMargin) + 20;
                        top = Math.random() * 10 + (80 - safeMargin);
                        break;
                }
            } else {
                left = Math.random() * (85 - safeMargin) + 5;
                top = Math.random() * (85 - safeMargin) + 5;
            }

            // 检查与已有位置的距离
            validPosition = positions.every(pos => {
                const distance = Math.sqrt(
                    Math.pow(pos.left - left, 2) + Math.pow(pos.top - top, 2)
                );
                return distance >= minDistance;
            });

            attempts++;
        }

        positions.push({
            top,
            left,
            delay: Math.random() * 2, // 随机动画延迟 0-2s
        });
    }

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

export default function LoginScreen() {
    // 使用 useState 和 useEffect 确保随机装饰只在客户端生成，避免 SSR 和客户端不一致
    const [randomDecorations, setRandomDecorations] = useState<{
        animals: Array<{ Component: any; size: number; position: { top: number; left: number; delay: number } }>;
        decorations: Array<{ Component: any; size: number; position: { top: number; left: number; delay: number } }>;
        avatars: Array<{ src: string; alt: string; size: number; position: { top: number; left: number; delay: number } }>;
    } | null>(null);
    
    // 检测是否为移动端
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        // 客户端检测是否为移动设备
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkIsMobile();
        
        // 监听窗口大小变化
        const handleResize = () => {
            checkIsMobile();
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // 预加载列表由客户端检测后再设置，避免在SSR首次渲染就加载桌面端大列表
    const [preloadList, setPreloadList] = useState<string[]>([]);

    useEffect(() => {
        setPreloadList(getPreloadImages(isMobile));
    }, [isMobile]);

    // 使用图片预加载Hook，根据设备类型加载不同图片
    const { loaded: imagesPreloaded } = useImagePreloader(preloadList);

    useEffect(() => {
        // 只在客户端生成随机装饰
        // 移动端减少装饰元素数量以提高性能
        const animalCount = isMobile ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 3) + 6;
        const selectedAnimals = shuffleAndPick(ANIMAL_STICKERS, animalCount);
        const animalPositions = generateRandomPositions(animalCount, 85);

        // 移动端减少小装饰数量
        const decorCount = isMobile ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 3) + 4;
        const smallDecorPositions = generateRandomPositions(decorCount, 50);

        setRandomDecorations({
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
            // 角色头像不再在登录界面显示，改为预加载
            avatars: [],
        });
    }, [isMobile]);

    // 监听图片预加载状态（调试用，可移除）
    useEffect(() => {
        if (imagesPreloaded) {
            console.log('所有角色头像图片已预加载完成');
        }
    }, [imagesPreloaded]);

    return (
        <div className="min-h-screen w-full bg-white pattern-dots flex items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* 随机装饰性贴纸 */}
            {randomDecorations && (
                <div className="absolute inset-0 pointer-events-none hidden sm:block">
                    {/* 动物贴纸 */}
                    {randomDecorations.animals.map((animal, index) => (
                        <div
                            key={`animal-${index}`}
                            className="absolute animate-float"
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

                    {/* 角色头像 - 登录界面不再显示，改为预加载 */}
                </div>
            )}

            {/* 主卡片 */}
            <div className="w-full max-w-md card-manga rounded-3xl p-8 space-y-6 text-center relative z-10">
                {/* Makima 贴画装饰 */}
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full overflow-hidden border-4 border-black shadow-lg sticker-hover">
                    <Image
                    src="/images/makima2.jpg"
                    alt="Makima"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    priority={false}
                    loading="lazy"
                    />
                </div>

                <div className="space-y-3">
                    {/* 漫画风格标题 */}
                    <p className="text-sm uppercase tracking-[0.4em] text-black font-bold">
                        ★ PIGGY ONLY ★
                    </p>
                    <h1 className="text-3xl manga-text-pink">
                        宝宝の秘密本
                    </h1>
                    <p className="text-sm text-gray-600 font-medium">
                        只有知道暗号的你才能打开 ♡
                    </p>
                </div>

                {/* 可爱分隔线 */}
                <div className="flex items-center justify-center gap-3 py-2">
                    <div className="h-0.5 w-12 bg-black"></div>
                    <PawSticker size={24} />
                    <div className="h-0.5 w-12 bg-black"></div>
                </div>

                <LoginForm />

                <div className="text-xs text-gray-500 space-y-2">
                    <ForgotPasswordModal />
                </div>

                {/* 底部装饰猫咪 */}
                <div className="flex justify-center gap-2 pt-2">
                    <HeartSticker size={20} />
                    <HeartSticker size={24} />
                    <HeartSticker size={20} />
                </div>
            </div>
        </div>
    );
}
