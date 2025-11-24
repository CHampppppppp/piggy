import LoginForm from './LoginForm';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function LoginScreen() {
    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-[32px] bg-white/80 backdrop-blur-xl p-8 shadow-2xl border border-white/60 space-y-6 text-center">
                <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.4em] text-pink-500 font-semibold">Piggy Only</p>
                    <h1 className="text-2xl font-bold text-pink-600">宝宝的小秘密本</h1>
                    <p className="text-sm text-pink-400">只有知道暗号的你才能打开 💘</p>
                </div>
                <LoginForm />
                <div className="text-xs text-pink-400/80 space-y-2">
                    <ForgotPasswordModal />
                </div>
            </div>
        </div>
    );
}


