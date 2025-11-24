'use client';

import { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, type AuthState } from '@/lib/auth';
import { useToast } from './ToastProvider';
import { useSafeActionState } from '@/app/hooks/useSafeActionState';

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, dispatch] = useSafeActionState(authenticate, initialState);
  const { showToast } = useToast();

  useEffect(() => {
    if (state?.error) {
      showToast(state.error, 'error');
    }
  }, [showToast, state?.error]);

  const locked = Boolean(state?.locked);

  return (
    <form
      action={dispatch}
      className="w-full space-y-4"
    >
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
          className="w-full rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-base text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
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


