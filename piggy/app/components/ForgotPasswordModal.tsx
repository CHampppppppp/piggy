'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { recoverPassword, type RecoveryState } from '@/lib/auth';
import { securityQuestions } from '@/lib/securityQuestions';
import { useToast } from './ToastProvider';
import { useSafeActionState } from '@/app/hooks/useSafeActionState';

const initialRecoveryState: RecoveryState = {};

export default function ForgotPasswordModal() {
    const [open, setOpen] = useState(false);
    const [state, action] = useSafeActionState(recoverPassword, initialRecoveryState);
    const { showToast } = useToast();

    useEffect(() => {
        if (state?.error) {
            showToast(state.error, 'error');
        } else if (state?.success) {
            showToast('闯关成功！快把密码抱回家 💞', 'success');
        }
    }, [showToast, state?.error, state?.success]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-pink-500 font-semibold hover:text-pink-600 transition cursor-pointer"
            >
                忘记密码？试试密保小游戏
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl space-y-6">
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-bold text-pink-600">爱情密保闯关</h2>
                                <p className="text-sm text-pink-400">
                                    连续答对 3 题就能拿回密码，只能真爱才知道哦 💞
                                </p>
                            </div>
                            <form action={action} className="space-y-6">
                                {securityQuestions.map((question) => (
                                    <fieldset
                                        key={question.id}
                                        className="space-y-3 rounded-2xl border border-pink-100 p-4"
                                    >
                                        <legend className="text-sm font-semibold text-pink-600">
                                            {question.question}
                                        </legend>
                                        <div className="space-y-2">
                                            {question.options.map((option, index) => (
                                                <label
                                                    key={option.id}
                                                    className="flex items-center gap-2 rounded-2xl border border-transparent bg-pink-50/60 px-3 py-2 text-sm text-pink-700 hover:border-pink-300 cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        className="text-pink-500 focus:ring-pink-300"
                                                        name={question.id}
                                                        value={option.id}
                                                        required={index === 0}
                                                    />
                                                    <span>{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                ))}

                                {state?.success && state.password && (
                                    <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-center">
                                        <p className="text-sm text-green-700 font-semibold">恭喜闯关成功！</p>
                                        <p className="text-lg font-bold text-green-600 tracking-wide">
                                            {state.password}
                                        </p>
                                        <p className="text-xs text-green-500">请妥善保管，不要被坏人看到~</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <RecoverSubmitButton />
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="w-full rounded-2xl border border-pink-200 px-4 py-3 text-pink-500 font-semibold hover:bg-pink-50 transition"
                                    >
                                        先不答啦
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

function RecoverSubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 px-4 py-3 text-white font-semibold shadow-lg shadow-pink-200/70 transition hover:brightness-105 disabled:opacity-60"
        >
            {pending ? '真爱验证中...' : '提交答案'}
        </button>
    );
}

