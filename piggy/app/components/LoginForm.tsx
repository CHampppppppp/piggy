'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate, type AuthState } from '@/lib/auth';

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, dispatch] = useFormState(authenticate, initialState);

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
          className="w-full rounded-2xl border border-pink-200 bg-white/80 px-4 py-3 text-base text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          placeholder="输入我们的小秘密"
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-pink-600 text-center">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 px-4 py-3 text-white font-semibold shadow-lg shadow-pink-200/70 transition hover:brightness-105 disabled:opacity-60 cursor-pointer"
    >
      {pending ? '打开日记中...' : '进入日记'}
    </button>
  );
}


