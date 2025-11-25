'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, type AuthState, getAccountLockStatus } from '@/lib/auth';
import { useToast } from './ToastProvider';
import { useSafeActionState } from '@/app/hooks/useSafeActionState';

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, dispatch] = useSafeActionState(authenticate, initialState);
  const { showToast } = useToast();
  const [dbLocked, setDbLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (state?.error) {
      showToast(state.error, 'error');
    }
    if (state?.lockedUntil) {
      setLockedUntil(state.lockedUntil);
    }
  }, [showToast, state]);

  useEffect(() => {
    const checkLock = async () => {
      const status = await getAccountLockStatus();
      if (status.isLocked && status.lockedUntil) {
        setLockedUntil(status.lockedUntil);
      } else {
        setLockedUntil(null);
      }
    };

    // 初始检查
    checkLock();

    // 定期检查（每5秒）
    const interval = setInterval(checkLock, 5000);

    // 监听密保解锁成功事件，立即重新检查锁定状态
    // 这样密码锁定可以在通过密保验证后被解除
    const handleSecurityUnlock = () => {
      checkLock();
    };
    window.addEventListener('security-unlock-success', handleSecurityUnlock);

    return () => {
      clearInterval(interval);
      window.removeEventListener('security-unlock-success', handleSecurityUnlock);
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil) {
      setDbLocked(false);
      setLockMessage('');
      return;
    }

    const updateCountdown = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining > 0) {
        setDbLocked(true);
        const minutes = Math.ceil(remaining / 60000);
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
        <div className="rounded-2xl bg-pink-50 p-4 text-center text-sm text-pink-600 animate-pulse">
          {lockMessage}
        </div>
      )}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-600"
        >
          女朋友专属密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={locked}
          className="w-full rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-base text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="输入我们的小秘密"
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
      className={`w-full rounded-2xl px-4 py-3 font-semibold transition ${disabled
        ? 'cursor-not-allowed bg-gray-200 text-gray-400 shadow-none'
        : 'cursor-pointer bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg shadow-pink-200/70 hover:brightness-105'
        }`}
    >
      {pending ? '打开日记中...' : locked ? '账号保护中' : '进入日记'}
    </button>
  );
}

