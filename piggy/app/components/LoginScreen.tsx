import LoginForm from './LoginForm';
import ForgotPasswordModal from './ForgotPasswordModal';
import { 
    CatSticker, DogSticker, HeartSticker, StarSticker, PawSticker,
    SnakeSticker, CapybaraSticker, PandaSticker, BunnySticker, BirdSticker,
    BearSticker, DuckSticker, FrogSticker, CharacterAvatar
} from './KawaiiStickers';
import Image from 'next/image';

export default function LoginScreen() {
    return (
        <div className="min-h-screen w-full bg-white pattern-dots flex items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* 装饰性贴纸 - 丰富的动物和人物 */}
            <div className="absolute inset-0 pointer-events-none">
                {/* 左上角 - 可爱猫咪 */}
                <div className="absolute top-8 left-8 animate-float">
                    <CatSticker size={75} />
                </div>
                
                {/* 右上角 - 卡皮巴拉 */}
                <div className="absolute top-12 right-12 animate-float" style={{ animationDelay: '0.5s' }}>
                    <CapybaraSticker size={80} />
                </div>
                
                {/* 左侧中上 - 小蛇 */}
                <div className="absolute top-1/4 left-6 animate-float" style={{ animationDelay: '0.8s' }}>
                    <SnakeSticker size={60} />
                </div>
                
                {/* 右侧中上 - 熊猫 */}
                <div className="absolute top-1/3 right-8 animate-float" style={{ animationDelay: '1.2s' }}>
                    <PandaSticker size={65} />
                </div>
                
                {/* 左侧中下 - 小狗 */}
                <div className="absolute bottom-1/3 left-10 animate-float" style={{ animationDelay: '1s' }}>
                    <DogSticker size={70} />
                </div>
                
                {/* 右侧中下 - 小兔子 */}
                <div className="absolute bottom-1/4 right-6 animate-float" style={{ animationDelay: '0.3s' }}>
                    <BunnySticker size={60} />
                </div>
                
                {/* 左下角 - 小鸟 */}
                <div className="absolute bottom-16 left-16 animate-float" style={{ animationDelay: '1.4s' }}>
                    <BirdSticker size={50} />
                </div>
                
                {/* 右下角 - 小熊 */}
                <div className="absolute bottom-20 right-16 animate-float" style={{ animationDelay: '0.7s' }}>
                    <BearSticker size={55} />
                </div>
                
                {/* 底部中间 - 小鸭子 */}
                <div className="absolute bottom-8 left-1/3 animate-float" style={{ animationDelay: '1.6s' }}>
                    <DuckSticker size={50} />
                </div>
                
                {/* 顶部中间 - 青蛙 */}
                <div className="absolute top-6 left-1/3 animate-float" style={{ animationDelay: '0.9s' }}>
                    <FrogSticker size={45} />
                </div>
                
                {/* 散落的小装饰 */}
                <div className="absolute top-1/4 left-1/4">
                    <StarSticker size={28} />
                </div>
                <div className="absolute top-1/2 right-1/4">
                    <HeartSticker size={35} />
                </div>
                <div className="absolute bottom-1/3 left-1/4">
                    <PawSticker size={40} />
                </div>
                <div className="absolute top-2/3 right-1/3">
                    <StarSticker size={25} />
                </div>
                
                {/* 圆形人物头像装饰 - 带悬浮效果 */}
                <div className="absolute top-20 left-1/4 pointer-events-auto">
                    <CharacterAvatar src="/luffy.jpg" alt="Luffy" size={50} />
                </div>
                <div className="absolute top-1/3 right-1/4 pointer-events-auto">
                    <CharacterAvatar src="/zoro.jpg" alt="Zoro" size={45} />
                </div>
                <div className="absolute bottom-1/4 left-1/5 pointer-events-auto">
                    <CharacterAvatar src="/L.jpg" alt="L" size={48} />
                </div>
                <div className="absolute bottom-16 right-1/4 pointer-events-auto">
                    <CharacterAvatar src="/akaza.jpg" alt="Akaza" size={52} />
                </div>
                <div className="absolute top-1/2 left-4 pointer-events-auto">
                    <CharacterAvatar src="/Kamado.jpg" alt="Kamado" size={46} />
                </div>
                <div className="absolute bottom-1/2 right-4 pointer-events-auto">
                    <CharacterAvatar src="/happiness.jpg" alt="Happiness" size={44} />
                </div>
            </div>

            {/* 主卡片 */}
            <div className="w-full max-w-md card-manga rounded-3xl p-8 space-y-6 text-center relative z-10">
                {/* Makima 贴画装饰 */}
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full overflow-hidden border-4 border-black shadow-lg sticker-hover">
                    <Image 
                        src="/makima2.jpg" 
                        alt="Makima" 
                        width={80} 
                        height={80}
                        className="w-full h-full object-cover"
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
