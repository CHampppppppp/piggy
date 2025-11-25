'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, type AuthState, getAccountLockStatus } from '@/lib/auth';
import { useToast } from './ToastProvider';
import { useSafeActionState } from '@/app/hooks/useSafeActionState';
import { CatSticker } from './KawaiiStickers';

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, dispatch] = useSafeActionState(authenticate, initialState);
  const { showToast } = useToast();
  const [dbLocked, setDbLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  useEffect(() => {
    const checkLock = async () => {

      const status = await getAccountLockStatus();
      if (status.isLocked && status.lockedUntil) {
      setDbLocked(false);
      setLockMessage('');
      return;
    }

    const updateCountdown = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining > 0) {
        setDbLocked(true);
        const remainingMinutes = Math.ceil(remaining / 60000);
        setLockMessage(`当前账号被保护啦，${minutes}分钟后再试试~`);
      } else {
        setDbLocked(false);
        setLockMessage('');
        setLockedUntil(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const locked = Boolean(state?.locked) || dbLocked;

  return (
    <form
      action={dispatch}
      className="w-full space-y-4"
    >
      {locked && lockMessage && (
        <div className="rounded-2xl bg-[#ffd6e7] border-3 border-black p-4 text-center text-sm text-black font-bold animate-wiggle">
          <div className="flex items-center justify-center gap-2">
            <CatSticker size={30} />
            <span>{lockMessage}</span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-bold text-black"
        >
          女朋友专属密码 ♡
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={locked}
          className="input-manga w-full rounded-2xl text-base placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="输入我们的小秘密..."
          autoComplete="current-password"
        />
      </div>

      <SubmitButton locked={locked} />
    </form>
  );
}

function SubmitButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || locked;

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3 font-bold text-lg transition-all ${
        disabled
          ? 'cursor-not-allowed bg-gray-200 text-gray-400 border-3 border-gray-300'
          : 'btn-kawaii-pink kawaii-hover'
      }`}
      style={!disabled ? { border: '3px solid #1a1a1a' } : {}}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin">🐱</span>
          打开日记中...
        </span>
      ) : locked ? (
        '账号保护中 🔒'
      ) : (
        '进入日记 →'
      )}
    </button>
  );
}
