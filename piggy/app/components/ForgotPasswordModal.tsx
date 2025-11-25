'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { recoverPassword, type RecoveryState } from '@/lib/auth';
import { securityQuestions } from '@/lib/securityQuestions';
import { useToast } from './ToastProvider';
import { useSafeActionState } from '@/app/hooks/useSafeActionState';
import { CatSticker, StarSticker, HeartSticker } from './KawaiiStickers';
import { X } from 'lucide-react';

const initialRecoveryState: RecoveryState = {};

export default function ForgotPasswordModal() {
    const [open, setOpen] = useState(false);
    const [state, action] = useSafeActionState(recoverPassword, initialRecoveryState);
    const { showToast } = useToast();

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setCurrentStep(0);
            setAnswers({});
        }
    }, [open]);

    useEffect(() => {
        if (state?.error) {
            showToast(state.error, 'error');
        } else if (state?.success) {
            showToast('闯关成功！快把密码抱回家 ♡', 'success');
            // 密保验证成功，触发事件让LoginForm重新检查锁定状态
            // 这样密码锁定可以被解除
            window.dispatchEvent(new CustomEvent('security-unlock-success'));
        }
    }, [showToast, state?.error, state?.success]);

    const handleOptionSelect = (questionId: string, optionId: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    };

    const currentQuestion = securityQuestions[currentStep];
    const isLastStep = currentStep === securityQuestions.length - 1;
    const canProceed = currentQuestion && answers[currentQuestion.id];

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-black font-bold hover:text-pink-500 transition cursor-pointer underline decoration-wavy decoration-pink-300 underline-offset-4"
            >
                忘记密码？试试密保小游戏 ★
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/30"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 border-4 border-black shadow-[8px_8px_0_#1a1a1a] space-y-6 scrollbar-hide relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 关闭按钮 */}
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full border-3 border-black bg-white hover:bg-[#ffd6e7] transition-colors cursor-pointer"
                        >
                            <X size={18} strokeWidth={3} />
                        </button>

                        {/* 装饰贴纸 */}
                        <div className="absolute -top-5 -left-5">
                            <CatSticker size={50} />
                        </div>
                        <div className="absolute -bottom-4 -right-4">
                            <StarSticker size={40} />
                        </div>

                        <div className="space-y-2 text-center pt-4">
                            <h2 className="text-2xl font-bold manga-text">爱情密保闯关</h2>
                            <p className="text-sm text-gray-600 font-medium">
                                连续答对 3 题就能拿回密码，只有真爱才知道哦 ♡
                            </p>
                        </div>

                        {/* 进度指示 */}
                        <div className="flex justify-center gap-2">
                            {securityQuestions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-8 h-2 rounded-full border-2 border-black transition-all ${
                                        index <= currentStep 
                                            ? 'bg-[#ffd6e7]' 
                                            : 'bg-gray-100'
                                    }`}
                                />
                            ))}
                        </div>

                        <form action={action} className="space-y-6">
                            {securityQuestions.map((q) => (
                                <input
                                    key={q.id}
                                    type="hidden"
                                    name={q.id}
                                    value={answers[q.id] || ''}
                                />
                            ))}

                            {!state?.success && currentQuestion && (
                                <fieldset
                                    key={currentQuestion.id}
                                    className="space-y-3 rounded-2xl border-3 border-black p-4 bg-white shadow-[4px_4px_0_#1a1a1a]"
                                >
                                    <legend className="text-sm font-bold text-black px-2 bg-[#ffd6e7] rounded-full border-2 border-black">
                                        {currentQuestion.question}
                                        <span className="ml-2 text-xs text-gray-600">
                                            ({currentStep + 1}/{securityQuestions.length})
                                        </span>
                                    </legend>
                                    <div className="space-y-2 pt-2">
                                        {currentQuestion.options.map((option) => (
                                            <label
                                                key={option.id}
                                                className={`flex items-center gap-3 rounded-xl border-3 px-4 py-3 text-sm cursor-pointer transition-all font-medium ${
                                                    answers[currentQuestion.id] === option.id
                                                        ? 'border-black bg-[#ffd6e7] text-black shadow-[2px_2px_0_#1a1a1a]'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                                                }`}
                                                onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-3 flex items-center justify-center ${
                                                    answers[currentQuestion.id] === option.id
                                                        ? 'border-black bg-black'
                                                        : 'border-gray-300'
                                                }`}>
                                                    {answers[currentQuestion.id] === option.id && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {state?.success && state.password && (
                                <div className="space-y-3 rounded-2xl border-3 border-black bg-[#ffd6e7] px-4 py-5 text-center shadow-[4px_4px_0_#1a1a1a]">
                                    <div className="flex justify-center mb-2">
                                        <HeartSticker size={40} />
                                    </div>
                                    <p className="text-sm text-black font-bold">恭喜闯关成功！♡</p>
                                    <p className="text-2xl font-bold manga-text tracking-wide">
                                        {state.password}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">请妥善保管，不要被坏人看到~</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                {!state?.success ? (
                                    isLastStep ? (
                                        <RecoverSubmitButton disabled={!canProceed} />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep((prev) => prev + 1)}
                                            disabled={!canProceed}
                                            className="w-full rounded-2xl bg-[#ffd6e7] px-4 py-3 text-black font-bold border-3 border-black shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_#1a1a1a] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                                        >
                                            下一题 →
                                        </button>
                                    )
                                ) : null}

                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="w-full rounded-2xl border-3 border-black px-4 py-3 text-black font-bold bg-white hover:bg-gray-50 transition shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a]"
                                >
                                    {state?.success ? '关闭' : '先不答啦'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function RecoverSubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending || disabled}
            className="w-full rounded-2xl bg-[#ffd6e7] px-4 py-3 text-black font-bold border-3 border-black shadow-[4px_4px_0_#1a1a1a] transition hover:shadow-[6px_6px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {pending ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🐱</span>
                    真爱验证中...
                </span>
            ) : (
                '提交答案 ★'
            )}
        </button>
    );
}
