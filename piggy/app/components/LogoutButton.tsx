'use client';

import { useFormStatus } from 'react-dom';
import { logout } from '@/lib/auth';

export default function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmit />
    </form>
  );
}

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-full border border-pink-200/70 bg-white/80 px-4 py-1.5 text-xs font-medium text-pink-500 shadow-sm hover:border-pink-300 disabled:opacity-60"
      aria-label="退出登录"
    >
      {pending ? '再见...' : '退出'}
    </button>
  );
}


